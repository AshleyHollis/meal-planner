"""Meal history Pydantic response models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MealHistoryItem(BaseModel):
    """Response model for a single meal history item."""

    model_config = {"from_attributes": True}

    slot_id: UUID
    recipe_id: UUID
    recipe_title: str
    cooked_at: datetime
    day: int
    meal_type: str
    rating: int | None
    cuisine_type: str | None
