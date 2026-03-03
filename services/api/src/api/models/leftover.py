"""Leftover Pydantic request/response models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


class CreateLeftover(BaseModel):
    """Request body for recording leftover portions."""

    portions: int = Field(ge=1)
    storage_location: Literal["fridge", "pantry", "freezer"]
    expiry_date: date


class UpdateLeftover(BaseModel):
    """Request body for marking a leftover as used."""

    used_at: datetime | None = None


class LeftoverResponse(BaseModel):
    """Response body for a leftover."""

    model_config = {"from_attributes": True}
    id: UUID
    meal_slot_id: UUID
    recipe_id: UUID
    household_id: UUID
    portions: int
    storage_location: str
    expiry_date: date
    used_at: datetime | None
    created_at: datetime

    @computed_field
    @property
    def is_expired(self) -> bool:
        """Whether the leftover has expired."""
        return self.expiry_date < date.today()
