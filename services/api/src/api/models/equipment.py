"""Equipment Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class EquipmentModeResponse(BaseModel):
    """Nested equipment mode data in responses."""

    model_config = {"from_attributes": True}

    id: UUID
    name: str
    category: str
    min_temp: float | None
    max_temp: float | None


class CreateEquipment(BaseModel):
    """Request body for registering equipment."""

    name: str = Field(min_length=1, max_length=200)
    modes: list[CreateEquipmentMode] = Field(default_factory=list)


class CreateEquipmentMode(BaseModel):
    """Nested mode in equipment creation request."""

    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    min_temp: float | None = None
    max_temp: float | None = None


# Rebuild CreateEquipment to resolve forward ref to CreateEquipmentMode
CreateEquipment.model_rebuild()


class EquipmentResponse(BaseModel):
    """Response body for an equipment item."""

    model_config = {"from_attributes": True}

    id: UUID
    name: str
    is_active: bool
    modes: list[EquipmentModeResponse]
    created_at: datetime
