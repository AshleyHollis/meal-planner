"""Meal plan generation orchestrator with retry logic.

Loads context from DB, builds prompt, calls LLM, validates,
retries up to 3x, and persists results to the database.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from shared.db.connection import get_db
from shared.db.models import (
    Equipment,
    GroceryItem,
    GroceryList,
    Ingredient,
    InventoryItem,
    MealPlan,
    MealSlot,
    Recipe,
    RecipeIngredient,
    RecipeStep,
)
from shared.logging.config import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .llm_client import call_llm
from .prompts import add_error_feedback, build_prompt
from .schemas import GeneratedMealPlan
from .validator import validate_constraints

logger = get_logger(__name__)

MAX_RETRIES = 3


async def generate_meal_plan(message_content: dict[str, Any]) -> None:
    """Generate a meal plan from a queue message.

    Loads household context from DB, builds an LLM prompt, calls the LLM,
    validates constraints, retries up to 3x on failure, and persists all
    generated data (recipes, ingredients, steps, meal slots, grocery list)
    to the database.

    On success: sets plan status to "active".
    On failure after retries: sets plan status to "failed" with error_message.

    Args:
        message_content: Parsed queue message with meal_plan_id and household_id.
    """
    meal_plan_id = message_content["meal_plan_id"]
    household_id = message_content["household_id"]

    logger.info(
        "generate_meal_plan_start",
        meal_plan_id=meal_plan_id,
        household_id=household_id,
    )

    db = get_db()

    try:
        # 1. Load context from DB
        inventory, equipment, expiring = await _load_context(db, household_id)

        # 1.5. Verify meal plan still exists (may have been deleted/cleaned)
        async with db.session() as session:
            result = await session.execute(select(MealPlan).where(MealPlan.id == meal_plan_id))
            meal_plan_row = result.scalar_one_or_none()
            if meal_plan_row is None:
                logger.warning(
                    "generate_meal_plan_skipped", meal_plan_id=meal_plan_id, reason="not_found"
                )
                return

        # 2. Build prompt
        prompt = build_prompt(inventory, equipment, expiring)

        # Build lookup data for validator
        inventory_names = [
            item.ingredient.name.lower() for item in inventory if getattr(item, "ingredient", None)
        ]
        equipment_modes: dict[str, list[str]] = {}
        for eq in equipment:
            modes = getattr(eq, "modes", [])
            equipment_modes[eq.name] = [m.name for m in modes]

        # 3. Call LLM with retry loop
        plan = await _generate_with_retries(prompt, inventory_names, equipment_modes)

        # 4. Persist to DB
        await _persist_plan(db, meal_plan_id, household_id, plan, inventory)

        logger.info("generate_meal_plan_success", meal_plan_id=meal_plan_id)

    except Exception as exc:
        error_msg = str(exc)[:1000]
        logger.error(
            "generate_meal_plan_failed",
            meal_plan_id=meal_plan_id,
            error=error_msg,
        )
        await _mark_failed(db, meal_plan_id, error_msg)


async def _load_context(
    db: Any, household_id: str
) -> tuple[list[InventoryItem], list[Equipment], list[InventoryItem]]:
    """Load inventory, equipment, and expiring items from DB."""
    async with db.session() as session:
        # Load inventory with ingredient relationship
        inv_result = await session.execute(
            select(InventoryItem).where(InventoryItem.household_id == household_id)
        )
        inventory = list(inv_result.scalars().all())

        # Load equipment with modes relationship
        eq_result = await session.execute(
            select(Equipment)
            .where(Equipment.household_id == household_id)
            .where(Equipment.is_active == True)  # noqa: E712
        )
        equipment = list(eq_result.scalars().all())

        # Expiring items: those with expiry_date, sorted soonest first
        expiring = sorted(
            [item for item in inventory if item.expiry_date is not None],
            key=lambda x: x.expiry_date,
        )

    return inventory, equipment, expiring


async def _generate_with_retries(
    prompt: str,
    inventory_names: list[str],
    equipment_modes: dict[str, list[str]],
) -> GeneratedMealPlan:
    """Call LLM and validate, retrying up to MAX_RETRIES times.

    Returns:
        Validated GeneratedMealPlan.

    Raises:
        ValueError: If all retries exhausted without valid output.
    """
    current_prompt = prompt
    last_errors: list[str] = []

    for attempt in range(1, MAX_RETRIES + 1):
        logger.info("llm_attempt", attempt=attempt, max_retries=MAX_RETRIES)

        try:
            raw_response = call_llm(current_prompt)

            # Strip markdown fences if present
            cleaned = _extract_json(raw_response)

            # Parse with Pydantic
            plan = GeneratedMealPlan.model_validate_json(cleaned)

            # Validate constraints
            errors = validate_constraints(plan, inventory_names, equipment_modes)
            if not errors:
                logger.info("llm_validation_passed", attempt=attempt)
                return plan

            # Validation failed - add feedback for retry
            logger.warning(
                "llm_validation_failed",
                attempt=attempt,
                error_count=len(errors),
            )
            last_errors = errors
            current_prompt = add_error_feedback(prompt, errors)

        except Exception as exc:
            logger.warning(
                "llm_call_error",
                attempt=attempt,
                error=str(exc),
            )
            last_errors = [str(exc)]
            current_prompt = add_error_feedback(prompt, str(exc))

    msg = f"Failed after {MAX_RETRIES} attempts. Last errors: {'; '.join(last_errors)}"
    raise ValueError(msg)


def _extract_json(text: str) -> str:
    """Extract JSON from LLM response, stripping markdown fences."""
    stripped = text.strip()
    if stripped.startswith("```"):
        # Remove opening fence (with optional language tag)
        first_newline = stripped.index("\n")
        stripped = stripped[first_newline + 1 :]
        # Remove closing fence
        if stripped.endswith("```"):
            stripped = stripped[:-3].strip()
    return stripped


async def _persist_plan(
    db: Any,
    meal_plan_id: str,
    household_id: str,
    plan: GeneratedMealPlan,
    inventory: list[InventoryItem],
) -> None:
    """Persist generated plan to DB: recipes, ingredients, steps, slots, grocery list."""
    async with db.session() as session:
        # Build ingredient name -> id lookup
        ingredient_map = await _get_or_create_ingredients(session, plan)

        # Create recipes, recipe ingredients, recipe steps, and meal slots
        grocery_needs: dict[str, dict[str, float]] = defaultdict(
            lambda: {"quantity": 0.0, "unit": ""}
        )

        for day_index, gen_recipe in enumerate(plan.recipes):
            recipe = Recipe(
                household_id=household_id,
                title=gen_recipe.title,
                description=gen_recipe.description,
                servings=gen_recipe.servings,
                prep_time_min=gen_recipe.prep_time_min,
                cook_time_min=gen_recipe.cook_time_min,
                is_ai_generated=True,
            )
            session.add(recipe)
            await session.flush()  # Get recipe.id

            # Recipe ingredients
            for gen_ing in gen_recipe.ingredients:
                ing_name = gen_ing.ingredient_name.lower()
                ing_id = ingredient_map.get(ing_name)
                if ing_id is None:
                    continue

                ri = RecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_id=ing_id,
                    quantity=gen_ing.quantity,
                    unit=gen_ing.unit,
                    is_optional=gen_ing.is_optional,
                )
                session.add(ri)

                # Accumulate grocery needs
                grocery_needs[ing_name]["quantity"] += gen_ing.quantity
                grocery_needs[ing_name]["unit"] = gen_ing.unit

            # Recipe steps
            for gen_step in gen_recipe.steps:
                step = RecipeStep(
                    recipe_id=recipe.id,
                    step_order=gen_step.step_order,
                    instruction=gen_step.instruction,
                    temperature=gen_step.temperature,
                    duration_min=gen_step.duration_min,
                )
                session.add(step)

            # Meal slot (day 0-6 = Mon-Sun, dinner)
            slot = MealSlot(
                meal_plan_id=meal_plan_id,
                recipe_id=recipe.id,
                day=day_index,
                meal_type="dinner",
                status="planned",
            )
            session.add(slot)

        # Build inventory lookup for grocery subtraction
        inv_map: dict[str, float] = {}
        for item in inventory:
            ing = getattr(item, "ingredient", None)
            if ing:
                name = ing.name.lower()
                inv_map[name] = inv_map.get(name, 0.0) + item.quantity

        # Create grocery list with items (needed - on_hand)
        grocery_list = GroceryList(meal_plan_id=meal_plan_id)
        session.add(grocery_list)
        await session.flush()

        for ing_name, need in grocery_needs.items():
            on_hand = inv_map.get(ing_name, 0.0)
            needed = need["quantity"] - on_hand
            if needed <= 0:
                continue

            ing_id = ingredient_map.get(ing_name)
            if ing_id is None:
                continue

            gi = GroceryItem(
                grocery_list_id=grocery_list.id,
                ingredient_id=ing_id,
                quantity_needed=needed,
                unit=need["unit"],
            )
            session.add(gi)

        # Update meal plan status to active
        result = await session.execute(select(MealPlan).where(MealPlan.id == meal_plan_id))
        meal_plan = result.scalar_one()
        meal_plan.status = "active"
        meal_plan.error_message = None


async def _get_or_create_ingredients(
    session: AsyncSession, plan: GeneratedMealPlan
) -> dict[str, Any]:
    """Build a mapping of lowercase ingredient name -> ingredient id.

    Looks up existing ingredients by name. Creates new ones if not found.
    """
    # Collect all unique ingredient names
    all_names: set[str] = set()
    for recipe in plan.recipes:
        for ing in recipe.ingredients:
            all_names.add(ing.ingredient_name.lower())

    # Look up existing ingredients
    result = await session.execute(
        select(Ingredient).where(Ingredient.name.in_([n for n in all_names]))
    )
    existing = {ing.name.lower(): ing.id for ing in result.scalars().all()}

    # Create missing ingredients with defaults
    for name in all_names:
        if name not in existing:
            new_ing = Ingredient(
                name=name,
                category="other",
                default_unit="g",
                default_storage="pantry",
            )
            session.add(new_ing)
            await session.flush()
            existing[name] = new_ing.id

    return existing


async def _mark_failed(db: Any, meal_plan_id: str, error_message: str) -> None:
    """Mark meal plan as failed with error message."""
    try:
        async with db.session() as session:
            result = await session.execute(select(MealPlan).where(MealPlan.id == meal_plan_id))
            meal_plan = result.scalar_one()
            meal_plan.status = "failed"
            meal_plan.error_message = error_message
    except Exception as exc:
        logger.error(
            "mark_failed_error",
            meal_plan_id=meal_plan_id,
            error=str(exc),
        )
