"""Meal plan generation orchestrator with retry logic.

Loads context from DB, builds prompt, calls LLM, validates,
retries up to 3x, and persists results to the database.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from shared.db.connection import get_db
from shared.db.models import (
    Equipment,
    GroceryItem,
    GroceryList,
    HouseholdMember,
    Ingredient,
    InventoryItem,
    Leftover,
    MealPlan,
    MealSlot,
    MealSlotRating,
    MemberPreference,
    Product,
    Recipe,
    RecipeFavorite,
    RecipeIngredient,
    RecipeStep,
    RecurringMealTemplate,
)
from shared.logging.config import get_logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .llm_client import call_llm
from .prompts import build_prompt
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
    cuisine_preferences = message_content.get("cuisine_preferences")
    meal_types = message_content.get("meal_types", ["dinner"])

    logger.info(
        "generate_meal_plan_start",
        meal_plan_id=meal_plan_id,
        household_id=household_id,
    )

    db = get_db()

    try:
        # 1. Load context from DB
        context = await _load_context(db, household_id, cuisine_preferences)

        # 1.5. Verify meal plan still exists (may have been deleted/cleaned)
        async with db.session() as session:
            result = await session.execute(select(MealPlan).where(MealPlan.id == meal_plan_id))
            meal_plan_row = result.scalar_one_or_none()
            if meal_plan_row is None:
                logger.warning(
                    "generate_meal_plan_skipped", meal_plan_id=meal_plan_id, reason="not_found"
                )
                return

        # 2. Build prompt with all context
        prompt = build_prompt(
            context["inventory"],
            context["equipment"],
            context["expiring"],
            meal_types=meal_types,
            member_preferences=context.get("member_preferences"),
            recent_meals=context.get("recent_meals"),
            favorites=context.get("favorites"),
            rating_insights=context.get("rating_insights"),
            cuisine_preferences=context.get("cuisine_preferences"),
            recurring_constraints=context.get("recurring_templates"),
            leftovers=context.get("leftovers"),
            freezer_items=context.get("freezer_items"),
        )

        # Build lookup data for validator
        inventory_names = [
            item.ingredient.name.lower()
            for item in context["inventory"]
            if getattr(item, "ingredient", None)
        ]
        equipment_modes: dict[str, list[str]] = {}
        for eq in context["equipment"]:
            modes = getattr(eq, "modes", [])
            equipment_modes[eq.name] = [m.name for m in modes]

        # 3. Call LLM with retry loop
        effective_types = meal_types or ["dinner"]

        if len(effective_types) > 1:
            # Multi-meal: generate per-type for reliability (LLM only reliably produces 7 at once)
            all_recipes = []
            for i, mt in enumerate(effective_types):
                # Rate-limit pacing: wait between calls to avoid token-bucket exhaustion
                if i > 0:
                    logger.info("rate_limit_pacing", wait_seconds=65, next_meal_type=mt)
                    await asyncio.sleep(65)
                single_prompt = build_prompt(
                    context["inventory"],
                    context["equipment"],
                    context["expiring"],
                    meal_types=[mt],
                    member_preferences=context.get("member_preferences"),
                    recent_meals=context.get("recent_meals"),
                    favorites=context.get("favorites"),
                    rating_insights=context.get("rating_insights"),
                    cuisine_preferences=context.get("cuisine_preferences"),
                    recurring_constraints=context.get("recurring_templates"),
                    leftovers=context.get("leftovers"),
                    freezer_items=context.get("freezer_items"),
                )
                type_plan = await _generate_with_retries(
                    single_prompt,
                    inventory_names,
                    equipment_modes,
                    allergen_ingredients=context.get("allergen_ingredients"),
                    cuisine_preferences=context.get("cuisine_preferences"),
                    meal_types=[mt],
                )
                for r in type_plan.recipes:
                    r.meal_type = mt
                all_recipes.extend(type_plan.recipes)
                logger.info(
                    "multi_meal_type_generated", meal_type=mt, recipes=len(type_plan.recipes)
                )
            plan = GeneratedMealPlan(recipes=all_recipes)
        else:
            plan = await _generate_with_retries(
                prompt,
                inventory_names,
                equipment_modes,
                allergen_ingredients=context.get("allergen_ingredients"),
                cuisine_preferences=context.get("cuisine_preferences"),
                meal_types=meal_types,
            )

        # 4. Persist to DB
        await _persist_plan(
            db,
            meal_plan_id,
            household_id,
            plan,
            context["inventory"],
            meal_types=meal_types,
            recurring_templates=context.get("recurring_templates"),
        )

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
    db: Any, household_id: str, cuisine_preferences: list[str] | None = None
) -> dict[str, Any]:
    """Load inventory, equipment, expiring items, personalization, and recurring templates from DB.

    Args:
        db: Database connection instance.
        household_id: UUID of the household.
        cuisine_preferences: Optional list of cuisine types from queue message.

    Returns:
        Dict containing:
            - inventory: List of InventoryItem
            - equipment: List of Equipment
            - expiring: List of expiring InventoryItem
            - member_preferences: Dict mapping member_name -> list of preference dicts
            - recent_meals: List of dicts with title and cuisine_type
            - favorites: List of favorite recipe titles
            - rating_insights: Dict with high_rated and low_rated recipe titles
            - allergen_ingredients: Set of allergen ingredient names (lowercase)
            - cuisine_preferences: List of cuisine types (passthrough from message)
            - recurring_templates: List of active RecurringMealTemplate objects
    """
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

        # Fetch member preferences grouped by member
        member_preferences = await _fetch_member_preferences(session, household_id)

        # Fetch recent meals (last 3 weeks)
        recent_meals = await _fetch_recent_meals(session, household_id)

        # Fetch favorites
        favorites = await _fetch_favorites(session, household_id)

        # Fetch rating insights
        rating_insights = await _fetch_rating_insights(session, household_id)

        # Extract allergen ingredients from member preferences
        allergen_ingredients = set()
        for prefs in member_preferences.values():
            for pref in prefs:
                if pref["preference_type"] == "allergy":
                    allergen_ingredients.add(pref["value"].lower())

        # Fetch active recurring meal templates
        recurring_templates = await _fetch_recurring_templates(session, household_id)

        # Fetch leftovers (not yet used)
        leftovers_result = await session.execute(
            select(Leftover)
            .where(Leftover.household_id == household_id)
            .where(Leftover.used_at.is_(None))
        )
        leftovers = list(leftovers_result.scalars().all())

        # Freezer items: inventory items stored in the freezer
        freezer_items = [item for item in inventory if item.location == "freezer"]

    return {
        "inventory": inventory,
        "equipment": equipment,
        "expiring": expiring,
        "member_preferences": member_preferences if member_preferences else None,
        "recent_meals": recent_meals if recent_meals else None,
        "favorites": favorites if favorites else None,
        "rating_insights": rating_insights if rating_insights else None,
        "allergen_ingredients": allergen_ingredients if allergen_ingredients else None,
        "cuisine_preferences": cuisine_preferences,
        "recurring_templates": recurring_templates if recurring_templates else None,
        "leftovers": leftovers if leftovers else None,
        "freezer_items": freezer_items if freezer_items else None,
    }


async def _fetch_member_preferences(
    session: AsyncSession, household_id: str
) -> dict[str, list[dict]]:
    """Fetch member preferences grouped by member name.

    Args:
        session: Database session.
        household_id: UUID of the household.

    Returns:
        Dict mapping member display_name -> list of preference dicts with
        preference_type and value keys.
    """
    result = await session.execute(
        select(MemberPreference, HouseholdMember.display_name)
        .join(HouseholdMember, MemberPreference.household_member_id == HouseholdMember.id)
        .where(HouseholdMember.household_id == household_id)
    )

    preferences_by_member: dict[str, list[dict]] = defaultdict(list)
    for pref, display_name in result.all():
        preferences_by_member[display_name].append(
            {
                "preference_type": pref.preference_type,
                "value": pref.value,
            }
        )

    return dict(preferences_by_member)


async def _fetch_recent_meals(session: AsyncSession, household_id: str) -> list[dict]:
    """Fetch recent cooked meals from the last 3 weeks.

    Args:
        session: Database session.
        household_id: UUID of the household.

    Returns:
        List of dicts with 'title' and 'cuisine_type' keys.
    """
    three_weeks_ago = datetime.utcnow() - timedelta(weeks=3)

    result = await session.execute(
        select(Recipe.title, Recipe.cuisine_type)
        .join(MealSlot, MealSlot.recipe_id == Recipe.id)
        .join(MealPlan, MealSlot.meal_plan_id == MealPlan.id)
        .where(MealPlan.household_id == household_id)
        .where(MealSlot.status == "cooked")
        .where(MealSlot.cooked_at >= three_weeks_ago)
        .distinct()
    )

    return [{"title": title, "cuisine_type": cuisine_type} for title, cuisine_type in result.all()]


async def _fetch_favorites(session: AsyncSession, household_id: str) -> list[str]:
    """Fetch favorite recipe titles for the household.

    Args:
        session: Database session.
        household_id: UUID of the household.

    Returns:
        List of favorite recipe titles.
    """
    result = await session.execute(
        select(Recipe.title)
        .join(RecipeFavorite, RecipeFavorite.recipe_id == Recipe.id)
        .where(RecipeFavorite.household_id == household_id)
    )

    return [title for (title,) in result.all()]


async def _fetch_rating_insights(session: AsyncSession, household_id: str) -> dict[str, list[str]]:
    """Fetch rating insights: high-rated (≥4) and low-rated (≤2) recipes.

    Args:
        session: Database session.
        household_id: UUID of the household.

    Returns:
        Dict with 'high_rated' and 'low_rated' lists of recipe titles.
    """
    result = await session.execute(
        select(Recipe.title, func.avg(MealSlotRating.rating).label("avg_rating"))
        .join(MealSlot, MealSlot.recipe_id == Recipe.id)
        .join(MealPlan, MealSlot.meal_plan_id == MealPlan.id)
        .join(MealSlotRating, MealSlotRating.meal_slot_id == MealSlot.id)
        .where(MealPlan.household_id == household_id)
        .group_by(Recipe.id, Recipe.title)
    )

    high_rated = []
    low_rated = []

    for title, avg_rating in result.all():
        if avg_rating >= 4:
            high_rated.append(title)
        elif avg_rating <= 2:
            low_rated.append(title)

    insights = {}
    if high_rated:
        insights["high_rated"] = high_rated
    if low_rated:
        insights["low_rated"] = low_rated

    return insights if insights else {}


async def _fetch_recurring_templates(
    session: AsyncSession, household_id: str
) -> list[RecurringMealTemplate]:
    """Fetch active recurring meal templates for the household.

    Args:
        session: Database session.
        household_id: UUID of the household.

    Returns:
        List of active RecurringMealTemplate objects ordered by day and meal_type.
    """
    result = await session.execute(
        select(RecurringMealTemplate)
        .where(RecurringMealTemplate.household_id == household_id)
        .where(RecurringMealTemplate.is_active == True)  # noqa: E712
        .order_by(RecurringMealTemplate.day, RecurringMealTemplate.meal_type)
    )
    return list(result.scalars().all())


async def _generate_with_retries(
    prompt: str,
    inventory_names: list[str],
    equipment_modes: dict[str, list[str]],
    *,
    allergen_ingredients: set[str] | None = None,
    cuisine_preferences: list[str] | None = None,
    meal_types: list[str] | None = None,
) -> GeneratedMealPlan:
    """Call LLM and validate, retrying up to MAX_RETRIES times.

    Returns:
        Validated GeneratedMealPlan.

    Raises:
        ValueError: If all retries exhausted without valid output.
    """
    from .prompts import add_error_feedback

    current_prompt = prompt
    last_errors: list[str] = []

    for attempt in range(1, MAX_RETRIES + 1):
        logger.info("llm_attempt", attempt=attempt, max_retries=MAX_RETRIES)

        # Wait before retry (not before first attempt) to let rate limits reset.
        # Must wait at least 60s for the full token-bucket window to reset.
        if attempt > 1:
            wait_secs = 60 * attempt
            logger.info("retry_backoff", wait_seconds=wait_secs, attempt=attempt)
            await asyncio.sleep(wait_secs)

        try:
            raw_response = call_llm(current_prompt)

            # Strip markdown fences if present
            cleaned = _extract_json(raw_response)

            # Parse with Pydantic
            plan = GeneratedMealPlan.model_validate_json(cleaned)

            # Validate constraints
            errors = validate_constraints(
                plan,
                inventory_names,
                equipment_modes,
                allergen_ingredients=allergen_ingredients,
                cuisine_preferences=cuisine_preferences,
                meal_types=meal_types,
            )
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
    meal_types: list[str] | None = None,
    recurring_templates: list[RecurringMealTemplate] | None = None,
) -> None:
    """Persist generated plan to DB: recipes, ingredients, steps, slots, grocery list."""
    async with db.session() as session:
        # Build ingredient name -> id lookup
        ingredient_map = await _get_or_create_ingredients(session, plan)

        # Create recipes, recipe ingredients, recipe steps, and meal slots
        grocery_needs: dict[str, dict[str, float]] = defaultdict(
            lambda: {"quantity": 0.0, "unit": ""}
        )

        # Pre-fill slots from recurring templates (before AI-generated slots)
        recurring_day_types: set[tuple[int, str]] = set()
        if recurring_templates:
            for tpl in recurring_templates:
                if tpl.recipe_id is not None:
                    slot = MealSlot(
                        meal_plan_id=meal_plan_id,
                        recipe_id=tpl.recipe_id,
                        day=tpl.day,
                        meal_type=tpl.meal_type,
                        status="planned",
                    )
                    session.add(slot)
                    recurring_day_types.add((tpl.day, tpl.meal_type))

        # Build (day, recipe, meal_type) assignments for AI-generated slots
        effective_types = meal_types or ["dinner"]
        assignments: list[tuple[int, Any, str]] = []

        if len(effective_types) == 1:
            # Original behavior: sequential day assignment
            meal_type_name = effective_types[0]
            for day_index, gen_recipe in enumerate(plan.recipes):
                assignments.append((day_index, gen_recipe, meal_type_name))
        else:
            # Multi-meal: group recipes by their meal_type field
            recipes_by_type: dict[str, list] = defaultdict(list)
            for gen_recipe in plan.recipes:
                mt = gen_recipe.meal_type or effective_types[0]
                recipes_by_type[mt].append(gen_recipe)

            for mt, type_recipes in recipes_by_type.items():
                for day_index, gen_recipe in enumerate(type_recipes[:7]):
                    assignments.append((day_index, gen_recipe, mt))

        for day_index, gen_recipe, meal_type_name in assignments:
            # Skip slots already covered by a recurring template
            if (day_index, meal_type_name) in recurring_day_types:
                continue

            recipe = Recipe(
                household_id=household_id,
                title=gen_recipe.title,
                description=gen_recipe.description,
                servings=gen_recipe.servings,
                prep_time_min=gen_recipe.prep_time_min,
                cook_time_min=gen_recipe.cook_time_min,
                cuisine_type=gen_recipe.cuisine_type,
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

            # Meal slot
            slot = MealSlot(
                meal_plan_id=meal_plan_id,
                recipe_id=recipe.id,
                day=day_index,
                meal_type=meal_type_name,
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

        # Build product shop lookup: ingredient_id → shop
        products_result = await session.execute(
            select(Product).where(Product.household_id == household_id)
        )
        product_shop_map: dict[Any, str | None] = {
            p.ingredient_id: p.shop for p in products_result.scalars().all()
        }

        grocery_items: list[GroceryItem] = []
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
                preferred_store=product_shop_map.get(ing_id),
            )
            session.add(gi)
            grocery_items.append(gi)

        # Update meal plan status to active
        result = await session.execute(select(MealPlan).where(MealPlan.id == meal_plan_id))
        meal_plan = result.scalar_one_or_none()
        if meal_plan is None:
            logger.warning("persist_plan_skipped", meal_plan_id=meal_plan_id, reason="not_found")
            return
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
            meal_plan = result.scalar_one_or_none()
            if meal_plan is None:
                logger.warning("mark_failed_skipped", meal_plan_id=meal_plan_id, reason="not_found")
                return
            meal_plan.status = "failed"
            meal_plan.error_message = error_message
    except Exception as exc:
        logger.error(
            "mark_failed_error",
            meal_plan_id=meal_plan_id,
            error=str(exc),
        )
