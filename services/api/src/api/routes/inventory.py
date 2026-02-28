"""Inventory CRUD endpoints – scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from shared.db.connection import get_session
from sqlalchemy.ext.asyncio import AsyncSession

from ..middleware.auth import get_current_household_id
from ..models.inventory import (
    CreateInventoryItem,
    InventoryItemResponse,
    UpdateInventoryItem,
)
from ..services.inventory_service import InventoryService

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryItemResponse])
async def list_inventory(
    location: str | None = Query(None, description="Filter by storage location"),
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> list[InventoryItemResponse]:
    """List inventory items for the current household."""
    items = await InventoryService.list_items(session, household_id, location=location)
    return [InventoryItemResponse.model_validate(i) for i in items]


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def add_inventory_item(
    body: CreateInventoryItem,
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> InventoryItemResponse:
    """Add a new item to household inventory."""
    item = await InventoryService.add_item(session, household_id, body)
    return InventoryItemResponse.model_validate(item)


@router.patch("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: UUID,
    body: UpdateInventoryItem,
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> InventoryItemResponse:
    """Update quantity or expiry of an inventory item."""
    item = await InventoryService.update_item(session, household_id, item_id, body)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return InventoryItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_inventory_item(
    item_id: UUID,
    household_id: UUID = Depends(get_current_household_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Remove an item from household inventory."""
    deleted = await InventoryService.remove_item(session, household_id, item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
