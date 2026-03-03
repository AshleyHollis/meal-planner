"""Pydantic models for quick meal suggestions API."""

from __future__ import annotations

from pydantic import BaseModel


class SuggestionIngredient(BaseModel):
    """An ingredient used in a quick suggestion."""

    name: str
    quantity: float
    unit: str
    on_hand: bool


class QuickSuggestion(BaseModel):
    """A single quick meal suggestion."""

    title: str
    description: str
    prep_time_min: int
    cook_time_min: int
    servings: int = 2
    ingredients: list[SuggestionIngredient]


class QuickSuggestionsResponse(BaseModel):
    """Response containing quick meal suggestions."""

    suggestions: list[QuickSuggestion]
    message: str | None = None
