"""Shared fixtures for worker unit tests."""

from __future__ import annotations

import pytest

from meal_plan_generator.schemas import (
    GeneratedMealPlan,
    GeneratedRecipe,
    RecipeIngredientSchema,
    RecipeStepSchema,
)


def _make_recipe(
    title: str = "Test Recipe",
    servings: int = 2,
    ingredients: list[RecipeIngredientSchema] | None = None,
    steps: list[RecipeStepSchema] | None = None,
) -> GeneratedRecipe:
    """Helper to build a single GeneratedRecipe with sensible defaults."""
    return GeneratedRecipe(
        title=title,
        description="A test recipe",
        prep_time_min=10,
        cook_time_min=20,
        servings=servings,
        ingredients=ingredients
        or [
            RecipeIngredientSchema(ingredient_name="chicken breast", quantity=500, unit="g"),
            RecipeIngredientSchema(ingredient_name="rice", quantity=300, unit="g"),
        ],
        steps=steps
        or [
            RecipeStepSchema(step_order=1, instruction="Cook chicken"),
            RecipeStepSchema(step_order=2, instruction="Cook rice"),
        ],
    )


def _make_plan(recipes: list[GeneratedRecipe] | None = None) -> GeneratedMealPlan:
    """Helper to build a GeneratedMealPlan with 7 default recipes."""
    if recipes is None:
        recipes = [_make_recipe(title=f"Recipe {i + 1}") for i in range(7)]
    return GeneratedMealPlan(recipes=recipes)


@pytest.fixture()
def default_inventory() -> list[str]:
    """Lowercase ingredient names available in the test inventory."""
    return ["chicken breast", "rice"]


@pytest.fixture()
def default_equipment() -> dict[str, list[str]]:
    """Equipment name -> list of mode names."""
    return {
        "Ninja Combi": ["Air Crisp", "Sear/Saute", "Slow Cook"],
        "Stove": ["Hob"],
    }


@pytest.fixture()
def valid_plan() -> GeneratedMealPlan:
    """A fully valid 7-recipe plan with 2 servings each."""
    return _make_plan()
