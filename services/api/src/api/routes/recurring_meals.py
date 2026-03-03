"""API routes for recurring meal template management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from shared.logging.config import get_logger

from ..dependencies import get_recurring_meal_service
from ..models.recurring_meal import (
    CreateRecurringMealTemplate,
    RecurringMealTemplateResponse,
    UpdateRecurringMealTemplate,
)
from ..services.recurring_meal_service import RecurringMealService

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/recurring-meals", tags=["recurring-meals"])


@router.get("", response_model=list[RecurringMealTemplateResponse])
async def list_recurring_meals(
    service: RecurringMealService = Depends(get_recurring_meal_service),
) -> list[RecurringMealTemplateResponse]:
    """List all recurring meal templates for the household."""
    try:
        templates = await service.list_templates()
        return [RecurringMealTemplateResponse.model_validate(t) for t in templates]
    except HTTPException:
        raise
    except Exception:
        logger.exception("list_recurring_meals_failed")
        return []


@router.post("", response_model=RecurringMealTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_meal(
    data: CreateRecurringMealTemplate,
    service: RecurringMealService = Depends(get_recurring_meal_service),
) -> RecurringMealTemplateResponse:
    """Create a new recurring meal template."""
    try:
        template = await service.create_template(data)
        return RecurringMealTemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception:
        logger.exception("create_recurring_meal_failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not create recurring meal template.",
        ) from None


@router.patch("/{template_id}", response_model=RecurringMealTemplateResponse)
async def update_recurring_meal(
    template_id: UUID,
    data: UpdateRecurringMealTemplate,
    service: RecurringMealService = Depends(get_recurring_meal_service),
) -> RecurringMealTemplateResponse:
    """Partially update a recurring meal template."""
    try:
        template = await service.update_template(template_id, data)
        return RecurringMealTemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception:
        logger.exception("update_recurring_meal_failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not update recurring meal template.",
        ) from None


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_meal(
    template_id: UUID,
    service: RecurringMealService = Depends(get_recurring_meal_service),
) -> None:
    """Delete a recurring meal template."""
    try:
        await service.delete_template(template_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("delete_recurring_meal_failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not delete recurring meal template.",
        ) from None
