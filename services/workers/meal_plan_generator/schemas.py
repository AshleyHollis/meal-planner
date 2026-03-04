"""Pydantic schemas for LLM structured output validation."""

from __future__ import annotations

from pydantic import BaseModel


class RecipeIngredientSchema(BaseModel):
    """Schema for a single ingredient in a generated recipe."""

    ingredient_name: str  # Matched to Ingredient entity
    quantity: float
    unit: str  # g, ml, units
    is_optional: bool = False


class RecipeStepSchema(BaseModel):
    """Schema for a single step in a generated recipe."""

    step_order: int
    instruction: str
    equipment_name: str | None = None  # "Ninja Combi", "Stove"
    equipment_mode: str | None = None  # "Air Crisp", "Sear/Saute"
    temperature: float | None = None
    duration_min: int | None = None


class GeneratedRecipe(BaseModel):
    """Pydantic model for LLM structured output of a single recipe."""

    title: str
    description: str
    prep_time_min: int
    cook_time_min: int
    servings: int = 2
    cuisine_type: str | None = None
    meal_type: str | None = None
    ingredients: list[RecipeIngredientSchema]
    steps: list[RecipeStepSchema]


class GeneratedMealPlan(BaseModel):
    """Pydantic model for LLM structured output of a complete meal plan."""

    recipes: list[GeneratedRecipe]  # Exactly 7


class QuickSuggestionPlan(BaseModel):
    """Pydantic model for LLM structured output of quick meal suggestions."""

    suggestions: list[GeneratedRecipe]
