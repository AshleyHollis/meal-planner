"""Meal history routes – GET /api/v1/meal-history."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ..dependencies import get_meal_history_service
from ..models.meal_history import MealHistoryItem
from ..services.meal_history_service import MealHistoryService

router = APIRouter(prefix="/api/v1", tags=["meal-history"])


@router.get("/meal-history", response_model=list[MealHistoryItem])
async def get_meal_history(
    service: Annotated[MealHistoryService, Depends(get_meal_history_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> list[MealHistoryItem]:
    """Retrieve paginated meal history for the household.

    Returns cooked meals sorted by cooked_at DESC.
    """
    history = await service.get_history(page=page, page_size=page_size)
    return [MealHistoryItem(**item) for item in history]
