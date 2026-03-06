"""Inventory CRUD endpoints – scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..dependencies import get_inventory_service
from ..models.inventory import (
    CreateInventoryItem,
    DefrostReminder,
    InventoryItemDetailResponse,
    InventoryItemResponse,
    UpdateInventoryItem,
)
from ..models.product import ProductSummary
from ..services.inventory_service import InventoryService

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryItemResponse])
async def list_inventory(
    location: str | None = Query(None, description="Filter by storage location"),
    service: InventoryService = Depends(get_inventory_service),  # noqa: B008
) -> list[InventoryItemResponse]:
    """List inventory items for the current household."""
    items = await service.list_items(location=location)
    return [InventoryItemResponse.model_validate(i) for i in items]


@router.get("/defrost-reminders", response_model=list[DefrostReminder])
async def get_defrost_reminders(
    days_ahead: int = Query(7, ge=1, le=30, description="Days ahead to check"),
    service: InventoryService = Depends(get_inventory_service),  # noqa: B008
) -> list[DefrostReminder]:
    """Get defrost reminders for upcoming meal plan slots using freezer items."""
    reminders = await service.get_defrost_reminders(days_ahead)
    return [DefrostReminder.model_validate(r) for r in reminders]


@router.get("/{item_id}", response_model=InventoryItemDetailResponse)
async def get_inventory_item(
    item_id: UUID,
    service: InventoryService = Depends(get_inventory_service),  # noqa: B008
) -> InventoryItemDetailResponse:
    """Get a single inventory item with ingredient details and associated product mapping."""
    result = await service.get_item(item_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    item, product = result
    base = InventoryItemResponse.model_validate(item)
    product_data = ProductSummary.model_validate(product) if product is not None else None
    return InventoryItemDetailResponse(
        **base.model_dump(exclude={"expiry_status"}), product=product_data
    )


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def add_inventory_item(
    body: CreateInventoryItem,
    service: InventoryService = Depends(get_inventory_service),  # noqa: B008
) -> InventoryItemResponse:
    """Add a new item to household inventory."""
    item = await service.add_item(body)
    return InventoryItemResponse.model_validate(item)


@router.patch("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: UUID,
    body: UpdateInventoryItem,
    service: InventoryService = Depends(get_inventory_service),  # noqa: B008
) -> InventoryItemResponse:
    """Update quantity or expiry of an inventory item."""
    item = await service.update_item(item_id, body)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return InventoryItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_inventory_item(
    item_id: UUID,
    service: InventoryService = Depends(get_inventory_service),  # noqa: B008
) -> None:
    """Remove an item from household inventory."""
    deleted = await service.remove_item(item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
