"""Ingredient Pydantic response models."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class IngredientResponse(BaseModel):
    """Response body for an ingredient search result."""

    model_config = {"from_attributes": True}

    id: UUID
    name: str
    category: str
    default_unit: str
    default_storage: str
    typical_shelf_life_days: int | None
