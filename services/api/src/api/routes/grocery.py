"""Grocery list endpoints – view, check items, complete shopping."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_grocery_service
from ..models.grocery import (
    CompleteShoppingRequest,
    GroceryItemResponse,
    GroceryListResponse,
    UpdateGroceryItem,
)
from ..models.inventory import InventoryItemResponse
from ..services.grocery_service import GroceryService

router = APIRouter(tags=["grocery"])


@router.get(
    "/api/v1/meal-plans/{meal_plan_id}/grocery-list",
    response_model=GroceryListResponse,
)
async def get_grocery_list(
    meal_plan_id: UUID,
    service: GroceryService = Depends(get_grocery_service),  # noqa: B008
) -> GroceryListResponse:
    """Return the grocery list for a meal plan."""
    grocery_list = await service.get_grocery_list(meal_plan_id)
    if grocery_list is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery list not found",
        )
    return GroceryListResponse.model_validate(grocery_list)


@router.patch(
    "/api/v1/grocery-items/{item_id}",
    response_model=GroceryItemResponse,
)
async def check_grocery_item(
    item_id: UUID,
    body: UpdateGroceryItem,
    service: GroceryService = Depends(get_grocery_service),  # noqa: B008
) -> GroceryItemResponse:
    """Check or uncheck a grocery item."""
    if body.is_checked:
        item = await service.check_item(item_id)
    else:
        item = await service.uncheck_item(item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery item not found",
        )
    return GroceryItemResponse.model_validate(item)


@router.post(
    "/api/v1/grocery-lists/{grocery_list_id}/complete",
    response_model=list[InventoryItemResponse],
    status_code=status.HTTP_201_CREATED,
)
async def complete_shopping(
    grocery_list_id: UUID,
    body: CompleteShoppingRequest,
    service: GroceryService = Depends(get_grocery_service),  # noqa: B008
) -> list[InventoryItemResponse]:
    """Mark shopping as complete and add purchased items to inventory."""
    items = await service.complete_shopping(
        grocery_list_id,
        [item.model_dump() for item in body.purchased_items],
    )
    return [InventoryItemResponse.model_validate(i) for i in items]
