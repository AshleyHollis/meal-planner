"""Equipment CRUD endpoints -- scoped by household."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from ..dependencies import get_equipment_service
from ..models.equipment import CreateEquipment, EquipmentResponse
from ..services.equipment_service import EquipmentService

router = APIRouter(prefix="/api/v1/equipment", tags=["equipment"])


@router.get("", response_model=list[EquipmentResponse])
async def list_equipment(
    service: EquipmentService = Depends(get_equipment_service),  # noqa: B008
) -> list[EquipmentResponse]:
    """List all equipment for the current household."""
    items = await service.list_equipment()
    return [EquipmentResponse.model_validate(i) for i in items]


@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def register_equipment(
    body: CreateEquipment,
    service: EquipmentService = Depends(get_equipment_service),  # noqa: B008
) -> EquipmentResponse:
    """Register new equipment for the household."""
    equipment = await service.register_equipment(body)
    return EquipmentResponse.model_validate(equipment)
