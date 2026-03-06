"""Grocery list endpoints – view, check items, complete shopping."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_grocery_service
from ..models.grocery import (
    AddStaplesRequest,
    CompleteShoppingRequest,
    GroceryItemResponse,
    GroceryListResponse,
    UpdateGroceryItem,
)
from ..models.inventory import InventoryItemResponse
from ..models.product import ProductSummary
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
    """Return the grocery list for a meal plan, enriched with ingredient and product data."""
    grocery_list, products_lookup = await service.get_enriched_grocery_list(meal_plan_id)
    if grocery_list is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery list not found",
        )

    enriched_items: list[GroceryItemResponse] = []
    total_price: float = 0.0
    store_totals: dict[str, float] = {}
    has_any_price = False

    for item in grocery_list.items:
        ingredient_name = item.ingredient.name if item.ingredient else ""
        ingredient_category = item.ingredient.category if item.ingredient else ""
        product = products_lookup.get(item.ingredient_id)
        product_summary = ProductSummary.model_validate(product) if product else None
        enriched_items.append(
            GroceryItemResponse(
                id=item.id,
                ingredient_id=item.ingredient_id,
                quantity_needed=item.quantity_needed,
                unit=item.unit,
                is_checked=item.is_checked,
                preferred_store=item.preferred_store,
                ingredient_name=ingredient_name,
                ingredient_category=ingredient_category,
                product=product_summary,
            )
        )
        if product and product.price is not None:
            has_any_price = True
            total_price += float(product.price)
            store = product.shop or "Other"
            store_totals[store] = store_totals.get(store, 0.0) + float(product.price)

    return GroceryListResponse(
        id=grocery_list.id,
        meal_plan_id=grocery_list.meal_plan_id,
        created_at=grocery_list.created_at,
        items=enriched_items,
        total_price=round(total_price, 2) if has_any_price else None,
        store_totals={k: round(v, 2) for k, v in store_totals.items()},
    )


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


@router.post(
    "/api/v1/grocery-lists/{grocery_list_id}/add-staples",
    response_model=GroceryListResponse,
    status_code=status.HTTP_200_OK,
)
async def add_staples_to_grocery_list(
    grocery_list_id: UUID,
    body: AddStaplesRequest,
    service: GroceryService = Depends(get_grocery_service),  # noqa: B008
) -> GroceryListResponse:
    """Bulk-add household staples to a grocery list (FR-009)."""
    grocery_list = await service.add_staples_to_list(grocery_list_id, body.staple_ids)
    if grocery_list is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery list not found",
        )
    items = [
        GroceryItemResponse(
            id=item.id,
            ingredient_id=item.ingredient_id,
            quantity_needed=item.quantity_needed,
            unit=item.unit,
            is_checked=item.is_checked,
            preferred_store=item.preferred_store,
            ingredient_name=item.ingredient.name if item.ingredient else "",
            ingredient_category=item.ingredient.category if item.ingredient else "",
        )
        for item in grocery_list.items
    ]
    return GroceryListResponse(
        id=grocery_list.id,
        meal_plan_id=grocery_list.meal_plan_id,
        created_at=grocery_list.created_at,
        items=items,
    )
