"""Equipment CRUD endpoints -- scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from shared.db.connection import get_session
from sqlalchemy.ext.asyncio import AsyncSession

from ..middleware.auth import get_current_household_id
from ..models.equipment import CreateEquipment, EquipmentResponse
from ..services.equipment_service import EquipmentService

router = APIRouter(prefix="/api/v1/equipment", tags=["equipment"])


@router.get("", response_model=list[EquipmentResponse])
async def list_equipment(
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> list[EquipmentResponse]:
    """List all equipment for the current household."""
    items = await EquipmentService.list_equipment(session, household_id)
    return [EquipmentResponse.model_validate(i) for i in items]


@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def register_equipment(
    body: CreateEquipment,
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> EquipmentResponse:
    """Register new equipment for the household."""
    equipment = await EquipmentService.register_equipment(session, household_id, body)
    return EquipmentResponse.model_validate(equipment)
