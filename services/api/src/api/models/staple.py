"""Staple ingredient Pydantic models."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class CreateStaple(BaseModel):
    """Request body for creating a staple ingredient."""

    ingredient_id: UUID
    min_threshold: float = Field(gt=0)
    unit: str


class StapleResponse(BaseModel):
    """Response body for a staple ingredient."""

    model_config = {"from_attributes": True}
    id: UUID
    household_id: UUID
    ingredient_id: UUID
    min_threshold: float
    unit: str


class StapleSuggestion(BaseModel):
    """Response body for staple shopping suggestions."""

    ingredient_id: UUID
    ingredient_name: str
    current_qty: float
    min_threshold: float
    quantity_needed: float
    unit: str
