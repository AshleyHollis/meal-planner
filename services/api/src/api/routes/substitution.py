"""Ingredient substitution routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status

from ..dependencies import get_substitution_service
from ..models.substitution import SubstitutionRequest, SubstitutionResponse
from ..services.substitution_service import SubstitutionService

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
    return await service.substitute_ingredient(plan_id, slot_id, body)
