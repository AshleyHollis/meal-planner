"""Ingredient substitution service – replaces an ingredient in a meal slot recipe."""

from __future__ import annotations

import json
from uuid import UUID

from fastapi import HTTPException, status
from shared.db.models.household import HouseholdMember
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.preference import MemberPreference
from shared.db.models.recipe import Recipe, RecipeIngredient, RecipeStep
from shared.logging.config import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.meal_plan import RecipeResponse
from ..models.substitution import GroceryChangeItem, SubstitutionRequest, SubstitutionResponse
from .meal_plan_service import _call_llm

logger = get_logger(__name__)


def _build_substitution_prompt(
    recipe: Recipe,
    original_ingredient: str,
    replacement_ingredient: str,
    allergen_ingredients: set[str] | None = None,
) -> str:
    """Build LLM prompt for ingredient substitution inline."""
    ingredients_text = "\n".join(
        f"- {ri.ingredient.name if ri.ingredient else 'Unknown'}: {ri.quantity} {ri.unit}"
        for ri in recipe.ingredients
    )
    steps_text = "\n".join(
        f"{s.step_order}. {s.instruction}" for s in sorted(recipe.steps, key=lambda x: x.step_order)
    )
    allergen_note = ""
    if allergen_ingredients:
        allergen_list = ", ".join(sorted(allergen_ingredients))
        allergen_note = (
            f"\nALLERGEN WARNING: The following are allergens for household members: "
            f"{allergen_list}. Do NOT introduce these ingredients."
        )

    return f"""You are a cooking assistant. Modify the following recipe by substituting one ingredient.

RECIPE: {recipe.title}

CURRENT INGREDIENTS:
{ingredients_text}

CURRENT STEPS:
{steps_text}

SUBSTITUTION INSTRUCTION: Replace "{original_ingredient}" with "{replacement_ingredient}".
Adjust quantities, steps, and cooking instructions as needed for the swap.{allergen_note}

Respond ONLY with valid JSON matching this schema:
{{
  "title": "string",
  "description": "string",
  "prep_time_min": int,
  "cook_time_min": int,
  "servings": int,
  "ingredients": [
    {{"ingredient_name": "string", "quantity": float, "unit": "string", "is_optional": false}}
  ],
  "steps": [
    {{"step_order": int, "instruction": "string", "duration_min": int or null}}
  ]
}}

Generate the modified recipe JSON now."""


def _parse_llm_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON from LLM response."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)


class SubstitutionService:
    """Household-scoped ingredient substitution operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def substitute_ingredient(
        self,
        plan_id: UUID,
        slot_id: UUID,
        request: SubstitutionRequest,
    ) -> SubstitutionResponse:
        """Substitute an ingredient in a meal slot recipe.

        Creates a new Recipe row derived from the original, updates the slot,
        and returns the updated recipe with allergen warnings and grocery changes.
        """
        # 1. Load slot + recipe
        stmt = (
            select(MealSlot)
            .join(MealPlan)
            .options(
                selectinload(MealSlot.recipe)
                .selectinload(Recipe.ingredients)
                .selectinload(RecipeIngredient.ingredient),
                selectinload(MealSlot.recipe).selectinload(Recipe.steps),
            )
            .where(
                MealSlot.id == slot_id,
                MealSlot.meal_plan_id == plan_id,
                MealPlan.household_id == self.household_id,
            )
        )
        result = await self.session.execute(stmt)
        slot = result.scalar_one_or_none()

        if slot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meal slot not found",
            )

        recipe = slot.recipe
        if recipe is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slot has no recipe to substitute",
            )

        # Validate the original ingredient exists in the recipe
        ingredient_names = {
            ri.ingredient.name.lower() for ri in recipe.ingredients if ri.ingredient is not None
        }
        if request.original_ingredient_name.lower() not in ingredient_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ingredient '{request.original_ingredient_name}' not found in recipe",
            )

        # 2. Load allergens for household members
        allergen_ingredients = await self._get_allergens()

        # Check if replacement ingredient is an allergen
        allergen_warnings: list[str] = []
        if request.replacement_ingredient_name.lower() in {a.lower() for a in allergen_ingredients}:
            allergen_warnings.append(
                f"WARNING: '{request.replacement_ingredient_name}' is a household allergen"
            )

        # 3 & 4. Build prompt and call LLM
        prompt = _build_substitution_prompt(
            recipe,
            request.original_ingredient_name,
            request.replacement_ingredient_name,
            allergen_ingredients if allergen_ingredients else None,
        )

        raw = _call_llm(prompt)

        # 5. Parse LLM response
        try:
            data = _parse_llm_json(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("substitution_parse_failed", raw_length=len(raw))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM returned invalid response",
            ) from exc

        # 5. Create new Recipe with source_recipe_id
        from shared.db.models.ingredient import Ingredient

        new_recipe = Recipe(
            household_id=self.household_id,
            title=data.get("title", recipe.title),
            description=data.get("description", recipe.description),
            servings=data.get("servings", recipe.servings),
            prep_time_min=data.get("prep_time_min", recipe.prep_time_min),
            cook_time_min=data.get("cook_time_min", recipe.cook_time_min),
            is_ai_generated=True,
            source_recipe_id=recipe.id,
            cuisine_type=recipe.cuisine_type,
        )
        self.session.add(new_recipe)
        await self.session.flush()

        # Create new ingredients
        for ing_data in data.get("ingredients", []):
            ing_name = ing_data.get("ingredient_name", "")
            ing_stmt = select(Ingredient).where(Ingredient.name == ing_name)
            ing_result = await self.session.execute(ing_stmt)
            ingredient = ing_result.scalar_one_or_none()

            if ingredient is None:
                ingredient = Ingredient(
                    name=ing_name,
                    category="other",
                    default_unit=ing_data.get("unit", "units"),
                    default_storage="pantry",
                    typical_shelf_life_days=7,
                )
                self.session.add(ingredient)
                await self.session.flush()

            new_ri = RecipeIngredient(
                recipe_id=new_recipe.id,
                ingredient_id=ingredient.id,
                quantity=ing_data.get("quantity", 1.0),
                unit=ing_data.get("unit", "units"),
                is_optional=ing_data.get("is_optional", False),
            )
            self.session.add(new_ri)

        # Create new steps
        for step_data in data.get("steps", []):
            new_step = RecipeStep(
                recipe_id=new_recipe.id,
                step_order=step_data.get("step_order", 1),
                instruction=step_data.get("instruction", ""),
                duration_min=step_data.get("duration_min"),
            )
            self.session.add(new_step)

        await self.session.flush()

        # 6. Update slot to point to new recipe
        slot.recipe_id = new_recipe.id
        await self.session.flush()

        # Reload new recipe with relationships
        await self.session.refresh(
            new_recipe,
            attribute_names=["ingredients", "steps"],
        )

        # 7. Calculate grocery changes
        grocery_changes = _calculate_grocery_changes(recipe, data)

        # 8. Build and return response
        recipe_response = RecipeResponse.model_validate(new_recipe)
        return SubstitutionResponse(
            new_recipe=recipe_response,
            allergen_warnings=allergen_warnings,
            grocery_changes=grocery_changes,
        )

    async def _get_allergens(self) -> set[str]:
        """Load allergen values for all household members."""
        stmt = (
            select(MemberPreference)
            .join(HouseholdMember)
            .where(
                HouseholdMember.household_id == self.household_id,
                MemberPreference.preference_type == "allergy",
            )
        )
        result = await self.session.execute(stmt)
        prefs = result.scalars().all()
        return {p.value.lower() for p in prefs}


def _calculate_grocery_changes(
    original_recipe: Recipe,
    new_recipe_data: dict,
) -> list[GroceryChangeItem]:
    """Calculate grocery list changes from ingredient substitution."""
    original_map = {
        ri.ingredient.name.lower(): ri
        for ri in original_recipe.ingredients
        if ri.ingredient is not None
    }
    new_map = {
        ing.get("ingredient_name", "").lower(): ing
        for ing in new_recipe_data.get("ingredients", [])
    }

    changes: list[GroceryChangeItem] = []

    # Removed ingredients
    for name, ri in original_map.items():
        if name not in new_map:
            changes.append(
                GroceryChangeItem(
                    ingredient_name=ri.ingredient.name if ri.ingredient else name,
                    action="removed",
                    quantity=ri.quantity,
                    unit=ri.unit,
                )
            )

    # Added or updated ingredients
    for name, ing_data in new_map.items():
        display_name = ing_data.get("ingredient_name", name)
        if name not in original_map:
            changes.append(
                GroceryChangeItem(
                    ingredient_name=display_name,
                    action="added",
                    quantity=ing_data.get("quantity", 1.0),
                    unit=ing_data.get("unit", "units"),
                )
            )
        else:
            orig = original_map[name]
            if (
                abs(ing_data.get("quantity", 0) - orig.quantity) > 0.001
                or ing_data.get("unit", "") != orig.unit
            ):
                changes.append(
                    GroceryChangeItem(
                        ingredient_name=display_name,
                        action="updated",
                        quantity=ing_data.get("quantity", orig.quantity),
                        unit=ing_data.get("unit", orig.unit),
                    )
                )

    return changes
