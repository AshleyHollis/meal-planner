"""API routes for staple ingredient management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_staple_service
from ..models.staple import CreateStaple, StapleResponse, StapleSuggestion
from ..services.staple_service import StapleService

router = APIRouter(prefix="/api/v1/staples", tags=["staples"])


@router.post("", response_model=StapleResponse, status_code=status.HTTP_201_CREATED)
async def add_staple(
    data: CreateStaple,
    service: StapleService = Depends(get_staple_service),
) -> StapleResponse:
    """Add a staple ingredient to track."""
    staple = await service.add_staple(data)
    return StapleResponse.model_validate(staple)


@router.get("", response_model=list[StapleResponse])
async def list_staples(
    service: StapleService = Depends(get_staple_service),
) -> list[StapleResponse]:
    """List all staples for the current household."""
    staples = await service.list_staples()
    return [StapleResponse.model_validate(s) for s in staples]


@router.delete("/{staple_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_staple(
    staple_id: UUID,
    service: StapleService = Depends(get_staple_service),
) -> None:
    """Remove a staple ingredient."""
    success = await service.remove_staple(staple_id)
    if not success:
        raise HTTPException(status_code=404, detail="Staple not found")


@router.get("/suggestions", response_model=list[StapleSuggestion])
async def get_staple_suggestions(
    service: StapleService = Depends(get_staple_service),
) -> list[StapleSuggestion]:
    """Get shopping suggestions for staples below threshold."""
    suggestions = await service.get_suggestions()
    return [StapleSuggestion.model_validate(s) for s in suggestions]
