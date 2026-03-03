"""Grocery list Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from .product import ProductSummary

# --- Request models ---


class UpdateGroceryItem(BaseModel):
    """Request body for toggling a grocery item's checked state."""

    is_checked: bool


class PurchasedItem(BaseModel):
    """A single purchased item within a complete-shopping request."""

    ingredient_id: UUID
    quantity: float = Field(gt=0)
    unit: str


class CompleteShoppingRequest(BaseModel):
    """Request body for completing a shopping trip."""

    purchased_items: list[PurchasedItem]


# --- Response models ---


class GroceryItemResponse(BaseModel):
    """Response body for a single grocery item."""

    model_config = {"from_attributes": True}

    id: UUID
    ingredient_id: UUID
    quantity_needed: float
    unit: str
    is_checked: bool
    preferred_store: str | None
    ingredient_name: str = ""
    ingredient_category: str = ""
    product: ProductSummary | None = None


class GroceryListResponse(BaseModel):
    """Response body for a grocery list with its items."""

    model_config = {"from_attributes": True}

    id: UUID
    meal_plan_id: UUID
    created_at: datetime
    items: list[GroceryItemResponse] = Field(default_factory=list)
