"""Meal plan CRUD endpoints – scoped by household."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..dependencies import get_meal_plan_service
from ..models.meal_plan import (
    AdaptRequest,
    CreateMealPlan,
    DeductionItem,
    MealPlanDetailResponse,
    MealPlanResponse,
    MealPlanStatsResponse,
    MealSlotResponse,
    SaveVariationRequest,
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
    status: str | None = Query(
        None, description="Filter by plan status (draft, active, completed, failed)"
    ),
    sort: Literal["created_at", "week_start_date"] = Query(
        "created_at", description="Field to sort by"
    ),
    order: Literal["asc", "desc"] = Query("desc", description="Sort direction"),
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> list[MealPlanResponse]:
    """List all meal plans for the household with optional filtering and sorting."""
    plans = await service.list_plans(status=status, sort=sort, order=order)
    return [MealPlanResponse.model_validate(p) for p in plans]


@router.get("/stats", response_model=MealPlanStatsResponse)
async def get_meal_plan_stats(
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealPlanStatsResponse:
    """Return aggregate stats for the household's meal plans."""
    stats = await service.get_stats()
    return MealPlanStatsResponse(**stats)


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


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_plan(
    plan_id: UUID,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> None:
    """Delete a meal plan. Only failed or completed plans can be deleted."""
    await service.delete_plan(plan_id)


@router.post("/{plan_id}/retry", response_model=MealPlanResponse, status_code=status.HTTP_202_ACCEPTED)
async def retry_meal_plan(
    plan_id: UUID,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealPlanResponse:
    """Retry a failed meal plan by resetting to draft and re-queuing generation."""
    plan = await service.retry_plan(plan_id)
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
    """Adapt a meal slot recipe to a different effort/cook-time level via LLM."""
    result = await service.adapt_slot(plan_id, slot_id, body.effort_level)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal slot not found")
    return result


@router.patch("/{plan_id}/slots/{slot_id}/status", response_model=MealSlotResponse)
async def update_slot_status(
    plan_id: UUID,
    slot_id: UUID,
    body: UpdateSlotStatus,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> MealSlotResponse:
    """Mark a meal slot as cooked or skipped."""
    slot, deductions = await service.update_slot_status(plan_id, slot_id, body)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal slot not found")
    response = MealSlotResponse.model_validate(slot)
    if deductions is not None:
        response.deductions = [DeductionItem(**d) for d in deductions]
    return response


@recipes_router.post("/{recipe_id}/save-variation", status_code=status.HTTP_201_CREATED)
async def save_recipe_variation(
    recipe_id: UUID,
    body: SaveVariationRequest,
    service: MealPlanService = Depends(get_meal_plan_service),  # noqa: B008
) -> dict:
    """Save a recipe variation for future use."""
    result = await service.save_variation(recipe_id, body)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return result
