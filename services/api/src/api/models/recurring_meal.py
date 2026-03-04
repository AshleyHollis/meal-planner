"""Pydantic models for recurring meal template CRUD."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class CreateRecurringMealTemplate(BaseModel):
    """Request body for creating a recurring meal template."""

    day: int = Field(ge=0, le=6)
    meal_type: str
    recipe_id: UUID | None = None
    recipe_title: str | None = None

    @field_validator("meal_type")
    @classmethod
    def valid_meal_type(cls, v: str) -> str:
        """Validate meal_type is one of the allowed values."""
        allowed = {"breakfast", "lunch", "dinner"}
        if v not in allowed:
            msg = f"Invalid meal type: {v}"
            raise ValueError(msg)
        return v

    @model_validator(mode="after")
    def at_least_one_recipe_field(self) -> CreateRecurringMealTemplate:
        """Ensure at least one of recipe_id or recipe_title is provided."""
        if self.recipe_id is None and not self.recipe_title:
            msg = "At least one of recipe_id or recipe_title must be provided"
            raise ValueError(msg)
        return self


class UpdateRecurringMealTemplate(BaseModel):
    """Request body for partial-update of a recurring meal template."""

    day: int | None = Field(default=None, ge=0, le=6)
    meal_type: str | None = None
    recipe_id: UUID | None = None
    recipe_title: str | None = None
    is_active: bool | None = None


class RecurringMealTemplateResponse(BaseModel):
    """Response schema for a recurring meal template."""

    model_config = {"from_attributes": True}

    id: UUID
    household_id: UUID
    day: int
    meal_type: str
    recipe_id: UUID | None
    recipe_title: str | None
    is_active: bool
    created_at: datetime
