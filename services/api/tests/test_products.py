"""Integration tests for product API routes."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from httpx import AsyncClient
from shared.db.models import Ingredient, Product
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _seed_ingredient(
    session: AsyncSession,
    name: str = "Chicken Breast",
    category: str = "meat",
) -> Ingredient:
    now = datetime.now(UTC)
    ing = Ingredient(
        id=uuid4(),
        name=name,
        category=category,
        default_unit="g",
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now,
    )
    session.add(ing)
    await session.flush()
    return ing


async def _seed_product(
    session: AsyncSession,
    household_id: UUID,
    ingredient_id: UUID,
    *,
    brand: str = "Ingham's",
    product_name: str = "Chicken Breast 1kg",
    shop: str | None = "Woolworths",
    price: float | None = 12.99,
) -> Product:
    now = datetime.now(UTC)
    product = Product(
        id=uuid4(),
        household_id=household_id,
        ingredient_id=ingredient_id,
        brand=brand,
        product_name=product_name,
        shop=shop,
        price=price,
        created_at=now,
        updated_at=now,
    )
    session.add(product)
    await session.flush()
    return product


# ---------------------------------------------------------------------------
# GET /api/v1/products
# ---------------------------------------------------------------------------


class TestListProducts:
    async def test_list_empty(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/products")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_products(
        self,
        client: AsyncClient,
        session: AsyncSession,
        household,
    ) -> None:
        ing = await _seed_ingredient(session)
        await _seed_product(session, household.id, ing.id)
        resp = await client.get("/api/v1/products")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["brand"] == "Ingham's"
        assert items[0]["ingredient_name"] == "Chicken Breast"


# ---------------------------------------------------------------------------
# POST /api/v1/products
# ---------------------------------------------------------------------------


class TestCreateProduct:
    async def test_create_returns_201(
        self,
        client: AsyncClient,
        session: AsyncSession,
        household,
    ) -> None:
        ing = await _seed_ingredient(session)
        payload = {
            "ingredient_id": str(ing.id),
            "brand": "Ingham's",
            "product_name": "Chicken Breast 1kg",
            "shop": "Woolworths",
            "price": 12.99,
        }
        resp = await client.post("/api/v1/products", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["brand"] == "Ingham's"
        assert data["ingredient_name"] == "Chicken Breast"
        assert data["shop"] == "Woolworths"
        assert "id" in data

    async def test_create_404_ingredient_not_found(self, client: AsyncClient) -> None:
        payload = {
            "ingredient_id": str(uuid4()),
            "brand": "Brand",
            "product_name": "Product",
        }
        resp = await client.post("/api/v1/products", json=payload)
        assert resp.status_code == 404

    async def test_create_409_duplicate(
        self,
        client: AsyncClient,
        session: AsyncSession,
        household,
    ) -> None:
        ing = await _seed_ingredient(session, name="Rice")
        await _seed_product(session, household.id, ing.id, brand="SunRice")
        payload = {
            "ingredient_id": str(ing.id),
            "brand": "Other Brand",
            "product_name": "Rice 1kg",
        }
        resp = await client.post("/api/v1/products", json=payload)
        assert resp.status_code == 409

    async def test_create_422_missing_brand(
        self,
        client: AsyncClient,
        session: AsyncSession,
        household,
    ) -> None:
        ing = await _seed_ingredient(session, name="Eggs")
        resp = await client.post(
            "/api/v1/products",
            json={"ingredient_id": str(ing.id), "product_name": "Eggs"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# PUT /api/v1/products/{product_id}
# ---------------------------------------------------------------------------


class TestUpdateProduct:
    async def test_update_price(
        self,
        client: AsyncClient,
        session: AsyncSession,
        household,
    ) -> None:
        ing = await _seed_ingredient(session)
        product = await _seed_product(session, household.id, ing.id)
        resp = await client.put(f"/api/v1/products/{product.id}", json={"price": 9.99})
        assert resp.status_code == 200
        assert resp.json()["price"] == 9.99

    async def test_update_404_nonexistent(self, client: AsyncClient) -> None:
        resp = await client.put(f"/api/v1/products/{uuid4()}", json={"price": 5.0})
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/products/{product_id}
# ---------------------------------------------------------------------------


class TestDeleteProduct:
    async def test_delete_returns_204(
        self,
        client: AsyncClient,
        session: AsyncSession,
        household,
    ) -> None:
        ing = await _seed_ingredient(session)
        product = await _seed_product(session, household.id, ing.id)
        resp = await client.delete(f"/api/v1/products/{product.id}")
        assert resp.status_code == 204

    async def test_delete_404_nonexistent(self, client: AsyncClient) -> None:
        resp = await client.delete(f"/api/v1/products/{uuid4()}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/products/search
# ---------------------------------------------------------------------------


class TestSearchProducts:
    async def test_search_by_brand(
        self,
        client: AsyncClient,
        session: AsyncSession,
        household,
    ) -> None:
        ing = await _seed_ingredient(session)
        await _seed_product(session, household.id, ing.id, brand="Ingham's")
        resp = await client.get("/api/v1/products/search", params={"q": "Ingham"})
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert results[0]["brand"] == "Ingham's"

    async def test_search_no_results(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/products/search", params={"q": "zzznomatch"})
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_search_422_missing_q(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/products/search")
        assert resp.status_code == 422
