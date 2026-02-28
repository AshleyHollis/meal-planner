"""Integration tests for inventory API routes (httpx test client)."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from shared.db.models.ingredient import Ingredient
from shared.db.models.inventory import InventoryItem
from sqlalchemy.ext.asyncio import AsyncSession

from api.main import create_app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _seed_ingredient(session: AsyncSession, name: str = "Chicken Breast") -> Ingredient:
    now = datetime.now(UTC)
    ing = Ingredient(
        id=uuid4(),
        name=name,
        category="meat",
        default_unit="g",
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now,
    )
    session.add(ing)
    await session.flush()
    return ing


async def _seed_item(
    session: AsyncSession,
    household_id,
    ingredient_id,
    *,
    quantity: float = 500,
    unit: str = "g",
    location: str = "fridge",
    expiry_date=None,
) -> InventoryItem:
    now = datetime.now(UTC)
    item = InventoryItem(
        id=uuid4(),
        household_id=household_id,
        ingredient_id=ingredient_id,
        quantity=quantity,
        unit=unit,
        location=location,
        expiry_date=expiry_date,
        created_at=now,
        updated_at=now,
    )
    session.add(item)
    await session.flush()
    return item


def _create_payload(ingredient_id, **overrides):
    payload = {
        "ingredient_id": str(ingredient_id),
        "quantity": 500,
        "unit": "g",
        "location": "fridge",
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# POST /api/v1/inventory
# ---------------------------------------------------------------------------


class TestCreateInventoryItem:
    async def test_create_returns_201(self, client: AsyncClient, sample_ingredient):
        payload = _create_payload(sample_ingredient.id)
        resp = await client.post("/api/v1/inventory", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["quantity"] == 500
        assert data["unit"] == "g"
        assert data["location"] == "fridge"
        assert data["ingredient"]["name"] == "Chicken Breast"
        assert "id" in data
        assert "expiry_status" in data

    async def test_create_with_expiry(self, client: AsyncClient, sample_ingredient):
        expiry = (datetime.now(UTC) + timedelta(days=5)).isoformat()
        payload = _create_payload(sample_ingredient.id, expiry_date=expiry)
        resp = await client.post("/api/v1/inventory", json=payload)
        assert resp.status_code == 201
        assert resp.json()["expiry_date"] is not None

    async def test_create_422_missing_ingredient_id(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/inventory",
            json={"quantity": 10, "unit": "g", "location": "fridge"},
        )
        assert resp.status_code == 422

    async def test_create_422_invalid_quantity(self, client: AsyncClient, sample_ingredient):
        payload = _create_payload(sample_ingredient.id, quantity=-1)
        resp = await client.post("/api/v1/inventory", json=payload)
        assert resp.status_code == 422

    async def test_create_422_invalid_unit(self, client: AsyncClient, sample_ingredient):
        payload = _create_payload(sample_ingredient.id, unit="pounds")
        resp = await client.post("/api/v1/inventory", json=payload)
        assert resp.status_code == 422

    async def test_create_422_invalid_location(self, client: AsyncClient, sample_ingredient):
        payload = _create_payload(sample_ingredient.id, location="garage")
        resp = await client.post("/api/v1/inventory", json=payload)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/inventory
# ---------------------------------------------------------------------------


class TestListInventory:
    async def test_list_empty(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_items(
        self, client: AsyncClient, session: AsyncSession, household, sample_ingredient
    ):
        await _seed_item(session, household.id, sample_ingredient.id)
        resp = await client.get("/api/v1/inventory")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["ingredient"]["name"] == "Chicken Breast"

    async def test_list_filter_by_location(
        self, client: AsyncClient, session: AsyncSession, household, sample_ingredient
    ):
        ing2 = await _seed_ingredient(session, "Rice")
        await _seed_item(session, household.id, sample_ingredient.id, location="fridge")
        await _seed_item(session, household.id, ing2.id, location="pantry")

        resp = await client.get("/api/v1/inventory", params={"location": "fridge"})
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["location"] == "fridge"


# ---------------------------------------------------------------------------
# PATCH /api/v1/inventory/{item_id}
# ---------------------------------------------------------------------------


class TestUpdateInventoryItem:
    async def test_update_quantity(
        self, client: AsyncClient, session: AsyncSession, household, sample_ingredient
    ):
        item = await _seed_item(session, household.id, sample_ingredient.id)
        resp = await client.patch(f"/api/v1/inventory/{item.id}", json={"quantity": 300})
        assert resp.status_code == 200
        assert resp.json()["quantity"] == 300

    async def test_update_expiry(
        self, client: AsyncClient, session: AsyncSession, household, sample_ingredient
    ):
        item = await _seed_item(session, household.id, sample_ingredient.id)
        new_expiry = (datetime.now(UTC) + timedelta(days=7)).isoformat()
        resp = await client.patch(f"/api/v1/inventory/{item.id}", json={"expiry_date": new_expiry})
        assert resp.status_code == 200
        assert resp.json()["expiry_date"] is not None

    async def test_update_404_nonexistent(self, client: AsyncClient):
        fake_id = str(uuid4())
        resp = await client.patch(f"/api/v1/inventory/{fake_id}", json={"quantity": 100})
        assert resp.status_code == 404

    async def test_update_422_invalid_quantity(
        self, client: AsyncClient, session: AsyncSession, household, sample_ingredient
    ):
        item = await _seed_item(session, household.id, sample_ingredient.id)
        resp = await client.patch(f"/api/v1/inventory/{item.id}", json={"quantity": -5})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# DELETE /api/v1/inventory/{item_id}
# ---------------------------------------------------------------------------


class TestDeleteInventoryItem:
    async def test_delete_returns_204(
        self, client: AsyncClient, session: AsyncSession, household, sample_ingredient
    ):
        item = await _seed_item(session, household.id, sample_ingredient.id)
        resp = await client.delete(f"/api/v1/inventory/{item.id}")
        assert resp.status_code == 204

    async def test_delete_404_nonexistent(self, client: AsyncClient):
        fake_id = str(uuid4())
        resp = await client.delete(f"/api/v1/inventory/{fake_id}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 401 Unauthorized (no auth overrides)
# ---------------------------------------------------------------------------


class TestUnauthorized:
    @staticmethod
    def _unauthenticated_client():
        """Create an app with no auth overrides (but DB overridden to avoid config error)."""
        from collections.abc import AsyncGenerator

        from shared.db.connection import get_session

        app = create_app()

        async def _noop_session() -> AsyncGenerator[AsyncSession, None]:
            yield None  # type: ignore[arg-type]  # never reached; auth short-circuits

        # Override only the session dep so FastAPI doesn't try to connect to a real DB.
        # Auth deps are NOT overridden — HTTPBearer will reject with 403.
        app.dependency_overrides[get_session] = _noop_session
        return app

    async def test_get_without_auth_returns_401(self):
        """Requests without Bearer token get 401 (Not authenticated)."""
        app = self._unauthenticated_client()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/inventory")
        assert resp.status_code == 401

    async def test_post_without_auth_returns_401(self):
        """Requests without Bearer token get 401 (Not authenticated)."""
        app = self._unauthenticated_client()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/v1/inventory",
                json={"quantity": 1, "unit": "g", "location": "fridge"},
            )
        assert resp.status_code == 401
