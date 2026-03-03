"""Favorite Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RecipeFavoriteResponse(BaseModel):
    """Response body for a recipe favorite."""

    model_config = {"from_attributes": True}

    id: UUID
    recipe_id: UUID
    recipe_title: str
    created_at: datetime
