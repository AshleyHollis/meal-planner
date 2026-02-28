"""Meal plan Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# --- Request models ---


class CreateMealPlan(BaseModel):
    """Request body for generating a new meal plan."""

    week_start_date: datetime


class AdaptRequest(BaseModel):
    """Request body for adapting a recipe's effort level."""

    effort_level: Literal["quick", "standard", "elaborate"]


class UpdateMealSlot(BaseModel):
    """Request body for swapping a meal slot's recipe."""

    recipe_id: UUID | None = None


class UpdateSlotStatus(BaseModel):
    """Request body for updating a meal slot's cooking status."""

    status: Literal["planned", "cooked", "skipped"]


class UpdatePlanStatus(BaseModel):
    """Request body for updating the overall plan status."""

    status: Literal["draft", "active", "completed"]


# --- Response models ---


class RecipeStepResponse(BaseModel):
    """Nested recipe step data in responses."""

    model_config = {"from_attributes": True}

    id: UUID
    step_order: int
    instruction: str
    equipment_mode_id: UUID | None
    temperature: float | None
    duration_min: int | None


class RecipeIngredientResponse(BaseModel):
    """Nested recipe ingredient data in responses."""

    model_config = {"from_attributes": True}

    id: UUID
    ingredient_id: UUID
    quantity: float
    unit: str
    is_optional: bool


class RecipeResponse(BaseModel):
    """Nested recipe data in responses."""

    model_config = {"from_attributes": True}

    id: UUID
    title: str
    description: str | None
    servings: int
    prep_time_min: int | None
    cook_time_min: int | None
    is_ai_generated: bool
    source_recipe_id: UUID | None
    ingredients: list[RecipeIngredientResponse] = Field(default_factory=list)
    steps: list[RecipeStepResponse] = Field(default_factory=list)


class MealSlotResponse(BaseModel):
    """Nested meal slot data in responses."""

    model_config = {"from_attributes": True}

    id: UUID
    day: int
    meal_type: str
    status: str
    cooked_at: datetime | None
    recipe: RecipeResponse | None


class MealPlanResponse(BaseModel):
    """Summary response for a meal plan (list view)."""

    model_config = {"from_attributes": True}

    id: UUID
    week_start_date: datetime
    status: str
    error_message: str | None
    created_at: datetime


class MealPlanDetailResponse(BaseModel):
    """Detailed response for a meal plan with slots."""

    model_config = {"from_attributes": True}

    id: UUID
    week_start_date: datetime
    status: str
    error_message: str | None
    created_at: datetime
    slots: list[MealSlotResponse] = Field(default_factory=list)
