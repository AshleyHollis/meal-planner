"""Product Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateProduct(BaseModel):
    """Request body for creating a product mapping."""

    ingredient_id: UUID
    brand: str = Field(max_length=200)
    product_name: str = Field(max_length=300)
    size_desc: str | None = Field(None, max_length=100)
    price: float | None = Field(None, ge=0)
    shop: str | None = Field(None, max_length=200)
    notes: str | None = Field(None, max_length=500)


class UpdateProduct(BaseModel):
    """Request body for updating a product mapping (all fields optional)."""

    brand: str | None = Field(None, max_length=200)
    product_name: str | None = Field(None, max_length=300)
    size_desc: str | None = None
    price: float | None = None
    shop: str | None = None
    notes: str | None = None


class ProductSummary(BaseModel):
    """Lightweight product data embedded in grocery item responses."""

    model_config = {"from_attributes": True}

    id: UUID
    brand: str
    product_name: str
    size_desc: str | None
    price: float | None
    shop: str | None


class ProductResponse(BaseModel):
    """Full product response including household and ingredient context."""

    model_config = {"from_attributes": True}

    id: UUID
    household_id: UUID
    ingredient_id: UUID
    brand: str
    product_name: str
    size_desc: str | None
    price: float | None
    shop: str | None
    notes: str | None
    ingredient_name: str
    ingredient_category: str
    created_at: datetime
    updated_at: datetime
