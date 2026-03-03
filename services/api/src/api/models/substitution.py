"""Pydantic models for ingredient substitution API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from .meal_plan import RecipeResponse


class SubstitutionRequest(BaseModel):
    """Request body for ingredient substitution."""

    original_ingredient_name: str
    replacement_ingredient_name: str


class GroceryChangeItem(BaseModel):
    """A single grocery list change resulting from an ingredient substitution."""

    ingredient_name: str
    action: Literal["added", "removed", "updated"]
    quantity: float
    unit: str


class SubstitutionResponse(BaseModel):
    """Response after performing an ingredient substitution."""

    model_config = {"from_attributes": True}

    new_recipe: RecipeResponse
    allergen_warnings: list[str] = []
    grocery_changes: list[GroceryChangeItem] = []
