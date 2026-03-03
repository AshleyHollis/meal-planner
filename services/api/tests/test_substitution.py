"""Tests for the ingredient substitution API endpoint."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import patch
from uuid import uuid4

import pytest
from shared.db.models.ingredient import Ingredient
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe, RecipeIngredient, RecipeStep
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_LLM_SUBSTITUTION_RESPONSE = """{
  "title": "Grilled Chicken Pasta",
  "description": "A quick pasta with grilled chicken",
  "prep_time_min": 10,
  "cook_time_min": 20,
  "servings": 2,
  "ingredients": [
    {"ingredient_name": "Pasta", "quantity": 200, "unit": "g", "is_optional": false},
    {"ingredient_name": "Beef", "quantity": 300, "unit": "g", "is_optional": false}
  ],
  "steps": [
    {"step_order": 1, "instruction": "Cook pasta in boiling water", "duration_min": 10},
    {"step_order": 2, "instruction": "Grill beef until done", "duration_min": 15}
  ]
}"""


async def _seed_recipe_with_slot(
    session: AsyncSession,
    household_id,
) -> tuple[MealPlan, MealSlot, Recipe, Ingredient, Ingredient]:
    """Seed a meal plan, slot, and recipe with two ingredients."""
    now = datetime.now(UTC)

    # Ingredients
    chicken = Ingredient(
        id=uuid4(),
        name="Chicken",
        category="meat",
        default_unit="g",
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now,
    )
    pasta = Ingredient(
        id=uuid4(),
        name="Pasta",
        category="pantry",
        default_unit="g",
        default_storage="pantry",
        typical_shelf_life_days=365,
        created_at=now,
        updated_at=now,
    )
    session.add_all([chicken, pasta])
    await session.flush()

    # Recipe
    recipe = Recipe(
        id=uuid4(),
        household_id=household_id,
        title="Chicken Pasta",
        description="Simple chicken pasta",
        servings=2,
        prep_time_min=10,
        cook_time_min=20,
        is_ai_generated=False,
        created_at=now,
        updated_at=now,
    )
    session.add(recipe)
    await session.flush()

    ri1 = RecipeIngredient(
        id=uuid4(),
        recipe_id=recipe.id,
        ingredient_id=chicken.id,
        quantity=300,
        unit="g",
        is_optional=False,
    )
    ri2 = RecipeIngredient(
        id=uuid4(),
        recipe_id=recipe.id,
        ingredient_id=pasta.id,
        quantity=200,
        unit="g",
        is_optional=False,
    )
    step = RecipeStep(
        id=uuid4(),
        recipe_id=recipe.id,
        step_order=1,
        instruction="Cook and serve",
        duration_min=20,
    )
    session.add_all([ri1, ri2, step])
    await session.flush()

    # Meal plan + slot
    plan = MealPlan(
        id=uuid4(),
        household_id=household_id,
        week_start_date=datetime(2026, 3, 10, tzinfo=UTC),
        status="active",
        created_at=now,
        updated_at=now,
    )
    session.add(plan)
    await session.flush()

    slot = MealSlot(
        id=uuid4(),
        meal_plan_id=plan.id,
        recipe_id=recipe.id,
        day=0,
        meal_type="dinner",
        status="planned",
        created_at=now,
        updated_at=now,
    )
    session.add(slot)
    await session.flush()

    return plan, slot, recipe, chicken, pasta


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_substitute_ingredient_success(client, household, session):
    """POST substitute returns 200 with new recipe when substitution succeeds."""
    plan, slot, recipe, chicken, pasta = await _seed_recipe_with_slot(session, household.id)

    with patch(
        "api.services.substitution_service._call_llm",
        return_value=_LLM_SUBSTITUTION_RESPONSE,
    ):
        response = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/substitute",
            json={
                "original_ingredient_name": "Chicken",
                "replacement_ingredient_name": "Beef",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "new_recipe" in data
    assert data["new_recipe"]["title"] == "Grilled Chicken Pasta"
    assert isinstance(data["allergen_warnings"], list)
    assert isinstance(data["grocery_changes"], list)


@pytest.mark.asyncio
async def test_substitute_ingredient_not_found_in_recipe(client, household, session):
    """POST substitute returns 400 when ingredient not in recipe."""
    plan, slot, recipe, chicken, pasta = await _seed_recipe_with_slot(session, household.id)

    with patch(
        "api.services.substitution_service._call_llm",
        return_value=_LLM_SUBSTITUTION_RESPONSE,
    ):
        response = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/substitute",
            json={
                "original_ingredient_name": "Broccoli",
                "replacement_ingredient_name": "Spinach",
            },
        )

    assert response.status_code == 400
    assert "Broccoli" in response.json()["detail"]


@pytest.mark.asyncio
async def test_substitute_slot_not_found(client, household, session):
    """POST substitute returns 404 when slot does not exist."""
    plan, slot, recipe, chicken, pasta = await _seed_recipe_with_slot(session, household.id)

    fake_slot_id = uuid4()
    with patch(
        "api.services.substitution_service._call_llm",
        return_value=_LLM_SUBSTITUTION_RESPONSE,
    ):
        response = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{fake_slot_id}/substitute",
            json={
                "original_ingredient_name": "Chicken",
                "replacement_ingredient_name": "Beef",
            },
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_substitute_grocery_changes_include_removed_ingredient(client, household, session):
    """Grocery changes should flag the original ingredient as removed."""
    plan, slot, recipe, chicken, pasta = await _seed_recipe_with_slot(session, household.id)

    with patch(
        "api.services.substitution_service._call_llm",
        return_value=_LLM_SUBSTITUTION_RESPONSE,
    ):
        response = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/substitute",
            json={
                "original_ingredient_name": "Chicken",
                "replacement_ingredient_name": "Beef",
            },
        )

    assert response.status_code == 200
    grocery_changes = response.json()["grocery_changes"]
    actions = {c["ingredient_name"]: c["action"] for c in grocery_changes}
    # Chicken was replaced so should be removed
    assert actions.get("Chicken") == "removed"
    # Beef is new so should be added
    assert actions.get("Beef") == "added"
