"""Ingredient substitution routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from shared.logging.config import get_logger

from ..dependencies import get_substitution_service
from ..models.substitution import SubstitutionRequest, SubstitutionResponse
from ..services.substitution_service import SubstitutionService

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/meal-plans", tags=["substitution"])


@router.post(
    "/{plan_id}/slots/{slot_id}/substitute",
    response_model=SubstitutionResponse,
    status_code=status.HTTP_200_OK,
)
async def substitute_ingredient(
    plan_id: UUID,
    slot_id: UUID,
    body: SubstitutionRequest,
    service: SubstitutionService = Depends(get_substitution_service),  # noqa: B008
) -> SubstitutionResponse:
    """Substitute an ingredient in a meal slot recipe."""
    try:
        return await service.substitute_ingredient(plan_id, slot_id, body)
    except HTTPException:
        raise
    except Exception:
        logger.exception("substitute_ingredient_failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not perform ingredient substitution. The AI service may be unavailable.",
        ) from None
