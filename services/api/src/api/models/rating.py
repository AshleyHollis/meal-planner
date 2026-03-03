"""Rating Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateMealSlotRating(BaseModel):
    """Request body for submitting a meal slot rating."""

    rating: int = Field(ge=1, le=5, description="Rating from 1 to 5 stars")
    feedback: str | None = Field(None, max_length=500, description="Optional feedback text")


class MealSlotRatingResponse(BaseModel):
    """Response body for a meal slot rating."""

    model_config = {"from_attributes": True}

    id: UUID
    meal_slot_id: UUID
    rated_by: UUID
    rating: int
    feedback: str | None
    created_at: datetime
