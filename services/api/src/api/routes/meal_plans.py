"""Meal plan CRUD endpoints – scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_meal_plan_service
from ..models.meal_plan import (
    AdaptRequest,
    CreateMealPlan,
    MealPlanDetailResponse,
    MealPlanResponse,
    MealSlotResponse,
    UpdateMealSlot,
    UpdatePlanStatus,
    UpdateSlotStatus,
)
from ..services.meal_plan_service import MealPlanService

router = APIRouter(prefix="/api/v1/meal-plans", tags=["meal-plans"])
recipes_router = APIRouter(prefix="/api/v1/recipes", tags=["recipes"])


@router.post("", response_model=MealPlanResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_meal_plan(
    body: CreateMealPlan,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealPlanResponse:
    """Create a new meal plan and enqueue generation."""
    plan = await service.create_plan(body)
    return MealPlanResponse.model_validate(plan)


@router.get("", response_model=list[MealPlanResponse])
async def list_meal_plans(
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> list[MealPlanResponse]:
    """List all meal plans for the household."""
    plans = await service.list_plans()
    return [MealPlanResponse.model_validate(p) for p in plans]


@router.get("/active", response_model=MealPlanDetailResponse)
async def get_active_meal_plan(
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealPlanDetailResponse:
    """Get the currently active meal plan for the household."""
    plan = await service.get_active_plan()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No active meal plan found"
        )
    return MealPlanDetailResponse.model_validate(plan)


@router.get("/{plan_id}", response_model=MealPlanDetailResponse)
async def get_meal_plan(
    plan_id: UUID,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealPlanDetailResponse:
    """Get a meal plan by ID with slots."""
    plan = await service.get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    return MealPlanDetailResponse.model_validate(plan)


@router.patch("/{plan_id}/status", response_model=MealPlanResponse)
async def update_plan_status(
    plan_id: UUID,
    body: UpdatePlanStatus,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealPlanResponse:
    """Update meal plan status (draft -> active -> completed)."""
    plan = await service.update_plan_status(plan_id, body)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    return MealPlanResponse.model_validate(plan)


@router.patch("/{plan_id}/slots/{slot_id}", response_model=MealSlotResponse)
async def update_meal_slot(
    plan_id: UUID,
    slot_id: UUID,
    body: UpdateMealSlot,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealSlotResponse:
    """Swap or modify a meal slot's recipe."""
    slot = await service.update_slot(plan_id, slot_id, body)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal slot not found")
    return MealSlotResponse.model_validate(slot)


@router.post("/{plan_id}/slots/{slot_id}/adapt")
async def adapt_meal_slot(
    plan_id: UUID,
    slot_id: UUID,
    body: AdaptRequest,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> dict:
    """Adapt a meal slot recipe to a different effort/cook-time level."""
    # TODO: implement adaptation logic in service layer
    return {
        "plan_id": str(plan_id),
        "slot_id": str(slot_id),
        "effort_level": body.effort_level,
        "status": "accepted",
    }


@router.patch("/{plan_id}/slots/{slot_id}/status", response_model=MealSlotResponse)
async def update_slot_status(
    plan_id: UUID,
    slot_id: UUID,
    body: UpdateSlotStatus,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealSlotResponse:
    """Mark a meal slot as cooked or skipped."""
    slot = await service.update_slot_status(plan_id, slot_id, body)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal slot not found")
    return MealSlotResponse.model_validate(slot)


@recipes_router.post("/{recipe_id}/save-variation")
async def save_recipe_variation(
    recipe_id: UUID,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> dict:
    """Save a recipe variation for future use."""
    # TODO: implement save-variation logic in service layer
    return {
        "recipe_id": str(recipe_id),
        "status": "saved",
    }
