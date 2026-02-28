"""Meal plan CRUD endpoints – scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from shared.db.connection import get_session
from sqlalchemy.ext.asyncio import AsyncSession

from ..middleware.auth import get_current_household_id
from ..models.meal_plan import (
    CreateMealPlan,
    MealPlanDetailResponse,
    MealPlanResponse,
    UpdatePlanStatus,
)
from ..services.meal_plan_service import MealPlanService

router = APIRouter(prefix="/api/v1/meal-plans", tags=["meal-plans"])


@router.post("", response_model=MealPlanResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_meal_plan(
    body: CreateMealPlan,
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> MealPlanResponse:
    """Create a new meal plan and enqueue generation."""
    plan = await MealPlanService.create_plan(session, household_id, body)
    return MealPlanResponse.model_validate(plan)


@router.get("/active", response_model=MealPlanDetailResponse)
async def get_active_meal_plan(
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> MealPlanDetailResponse:
    """Get the currently active meal plan for the household."""
    plan = await MealPlanService.get_active_plan(session, household_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active meal plan found")
    return MealPlanDetailResponse.model_validate(plan)


@router.get("/{plan_id}", response_model=MealPlanDetailResponse)
async def get_meal_plan(
    plan_id: UUID,
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> MealPlanDetailResponse:
    """Get a meal plan by ID with slots."""
    plan = await MealPlanService.get_plan(session, household_id, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    return MealPlanDetailResponse.model_validate(plan)


@router.patch("/{plan_id}/status", response_model=MealPlanResponse)
async def update_plan_status(
    plan_id: UUID,
    body: UpdatePlanStatus,
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> MealPlanResponse:
    """Update meal plan status (draft -> active -> completed)."""
    plan = await MealPlanService.update_plan_status(session, household_id, plan_id, body)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    return MealPlanResponse.model_validate(plan)
