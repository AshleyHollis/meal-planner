"""Inventory Pydantic request/response models."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


class CreateInventoryItem(BaseModel):
    """Request body for adding an inventory item."""

    ingredient_id: UUID
    quantity: float = Field(gt=0)
    unit: Literal["g", "ml", "units"]
    location: Literal["fridge", "pantry", "freezer"]
    expiry_date: datetime | None = None
    defrost_hours: int | None = None


class UpdateInventoryItem(BaseModel):
    """Request body for updating an inventory item."""

    quantity: float | None = Field(default=None, gt=0)
    expiry_date: datetime | None = None
    defrost_hours: int | None = None


class IngredientResponse(BaseModel):
    """Nested ingredient data in responses."""

    model_config = {"from_attributes": True}

    id: UUID
    name: str
    category: str
    default_unit: str
    default_storage: str
    typical_shelf_life_days: int | None


class InventoryItemResponse(BaseModel):
    """Response body for an inventory item."""

    model_config = {"from_attributes": True}

    id: UUID
    ingredient: IngredientResponse
    quantity: float
    unit: str
    location: str
    expiry_date: datetime | None
    defrost_hours: int | None = None
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def expiry_status(self) -> Literal["safe", "expiring", "expired"]:
        """Compute expiry status based on expiry_date vs current date."""
        if self.expiry_date is None:
            return "safe"
        now = datetime.now(UTC)
        expiry = (
            self.expiry_date
            if self.expiry_date.tzinfo is not None
            else self.expiry_date.replace(tzinfo=UTC)
        )
        if expiry < now:
            return "expired"
        days_remaining = (expiry - now).days
        if days_remaining <= 3:
            return "expiring"
        return "safe"


class DeductionResult(BaseModel):
    """Result of deducting recipe ingredients from inventory."""

    ingredient_id: str
    ingredient_name: str
    requested: float
    deducted: float
    remaining: float
    unit: str
    unit_mismatch: bool


class DefrostReminder(BaseModel):
    """Response body for a defrost reminder."""

    ingredient_name: str
    defrost_hours: int
    meal_day: int
    meal_type: str
    recipe_title: str

