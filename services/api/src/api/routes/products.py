"""Product CRUD endpoints – scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from shared.db.models.product import Product

from ..dependencies import get_product_service
from ..models.product import CreateProduct, ProductResponse, UpdateProduct
from ..services.product_service import ProductService

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def _to_response(product: Product) -> ProductResponse:
    """Serialize a Product ORM instance to ProductResponse."""
    return ProductResponse(
        id=product.id,
        household_id=product.household_id,
        ingredient_id=product.ingredient_id,
        brand=product.brand,
        product_name=product.product_name,
        size_desc=product.size_desc,
        price=float(product.price) if product.price is not None else None,
        shop=product.shop,
        notes=product.notes,
        ingredient_name=product.ingredient.name if product.ingredient else "",
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.get("/search", response_model=list[ProductResponse])
async def search_products(
    q: str = Query(..., description="Search term for brand, product name, or shop"),
    service: ProductService = Depends(get_product_service),  # noqa: B008
) -> list[ProductResponse]:
    """Search products by brand, product name, or shop."""
    products = await service.search_products(q)
    return [_to_response(p) for p in products]


@router.get("", response_model=list[ProductResponse])
async def list_products(
    service: ProductService = Depends(get_product_service),  # noqa: B008
) -> list[ProductResponse]:
    """List all product mappings for the current household."""
    products = await service.list_products()
    return [_to_response(p) for p in products]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: CreateProduct,
    service: ProductService = Depends(get_product_service),  # noqa: B008
) -> ProductResponse:
    """Create a product mapping for an ingredient."""
    try:
        product = await service.create_product(body)
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=msg,
        ) from exc
    return _to_response(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    service: ProductService = Depends(get_product_service),  # noqa: B008
) -> ProductResponse:
    """Get a product mapping by ID."""
    product = await service.get_product(product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return _to_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    body: UpdateProduct,
    service: ProductService = Depends(get_product_service),  # noqa: B008
) -> ProductResponse:
    """Update a product mapping."""
    product = await service.update_product(product_id, body)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return _to_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    service: ProductService = Depends(get_product_service),  # noqa: B008
) -> None:
    """Delete a product mapping."""
    deleted = await service.delete_product(product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
