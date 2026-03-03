"""API routes for leftover management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_leftover_service
from ..models.leftover import CreateLeftover, LeftoverResponse
from ..services.leftover_service import LeftoverService

router = APIRouter(prefix="/api/v1", tags=["leftovers"])


@router.post(
    "/meal-plans/{plan_id}/slots/{slot_id}/leftovers",
    response_model=LeftoverResponse,
    status_code=201,
)
async def create_leftover(
    plan_id: UUID,
    slot_id: UUID,
    data: CreateLeftover,
    service: LeftoverService = Depends(get_leftover_service),
) -> LeftoverResponse:
    """Record leftover portions from a cooked meal."""
    leftover = await service.create_leftover(slot_id, data)
    return LeftoverResponse.model_validate(leftover)


@router.get("/leftovers", response_model=list[LeftoverResponse])
async def list_leftovers(
    include_used: bool = False,
    service: LeftoverService = Depends(get_leftover_service),
) -> list[LeftoverResponse]:
    """List leftovers for the current household."""
    leftovers = await service.list_leftovers(include_used=include_used)
    return [LeftoverResponse.model_validate(lo) for lo in leftovers]


@router.patch("/leftovers/{leftover_id}", response_model=LeftoverResponse)
async def mark_leftover_used(
    leftover_id: UUID,
    service: LeftoverService = Depends(get_leftover_service),
) -> LeftoverResponse:
    """Mark a leftover as used."""
    leftover = await service.mark_used(leftover_id)
    if leftover is None:
        raise HTTPException(status_code=404, detail="Leftover not found")
    return LeftoverResponse.model_validate(leftover)
