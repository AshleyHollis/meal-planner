"""Unit tests for InventoryService."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from shared.db.models.household import Household, HouseholdMember
from shared.db.models.ingredient import Ingredient
from shared.db.models.inventory import InventoryItem
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.inventory import CreateInventoryItem, InventoryItemResponse, UpdateInventoryItem
from api.services.inventory_service import InventoryService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_ingredient(session: AsyncSession, name: str = "Chicken Breast") -> Ingredient:
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


# ---------------------------------------------------------------------------
# List items: grouped by location, expiring first
# ---------------------------------------------------------------------------


class TestListItems:
    async def test_list_returns_items_for_household(
        self, session: AsyncSession, household, sample_ingredient
    ):
        svc = InventoryService(session, household.id)
        await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )
        items = await svc.list_items()
        assert len(items) == 1
        assert items[0].ingredient_id == sample_ingredient.id

    async def test_list_orders_by_expiry_ascending(
        self, session: AsyncSession, household, sample_ingredient
    ):
        svc = InventoryService(session, household.id)
        now = datetime.now(UTC)

        # Add item expiring in 5 days
        await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=200,
                unit="g",
                location="fridge",
                expiry_date=now + timedelta(days=5),
            )
        )
        # Add item expiring tomorrow (should sort first)
        ing2 = await _make_ingredient(session, "Milk")
        await svc.add_item(
            CreateInventoryItem(
                ingredient_id=ing2.id,
                quantity=1000,
                unit="ml",
                location="fridge",
                expiry_date=now + timedelta(days=1),
            )
        )

        items = await svc.list_items()
        assert len(items) == 2
        assert items[0].ingredient.name == "Milk"
        assert items[1].ingredient.name == "Chicken Breast"

    async def test_list_nulls_last(self, session: AsyncSession, household, sample_ingredient):
        svc = InventoryService(session, household.id)
        now = datetime.now(UTC)

        # Item with no expiry
        await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="pantry",
            )
        )
        # Item with expiry
        ing2 = await _make_ingredient(session, "Yogurt")
        await svc.add_item(
            CreateInventoryItem(
                ingredient_id=ing2.id,
                quantity=200,
                unit="ml",
                location="fridge",
                expiry_date=now + timedelta(days=2),
            )
        )

        items = await svc.list_items()
        assert len(items) == 2
        assert items[0].expiry_date is not None  # expiry first
        assert items[1].expiry_date is None  # null last

    async def test_list_filters_by_location(
        self, session: AsyncSession, household, sample_ingredient
    ):
        svc = InventoryService(session, household.id)
        ing2 = await _make_ingredient(session, "Rice")

        await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )
        await svc.add_item(
            CreateInventoryItem(
                ingredient_id=ing2.id,
                quantity=1000,
                unit="g",
                location="pantry",
            )
        )

        fridge_items = await svc.list_items(location="fridge")
        assert len(fridge_items) == 1
        assert fridge_items[0].location == "fridge"

        pantry_items = await svc.list_items(location="pantry")
        assert len(pantry_items) == 1
        assert pantry_items[0].location == "pantry"


# ---------------------------------------------------------------------------
# Add item
# ---------------------------------------------------------------------------


class TestAddItem:
    async def test_add_item_returns_persisted_item(
        self, session: AsyncSession, household, sample_ingredient
    ):
        svc = InventoryService(session, household.id)
        item = await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )
        assert item.id is not None
        assert item.household_id == household.id
        assert item.quantity == 500
        assert item.unit == "g"
        assert item.location == "fridge"

    async def test_add_item_loads_ingredient_relationship(
        self, session: AsyncSession, household, sample_ingredient
    ):
        svc = InventoryService(session, household.id)
        item = await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )
        assert item.ingredient is not None
        assert item.ingredient.name == "Chicken Breast"


# ---------------------------------------------------------------------------
# Update quantity
# ---------------------------------------------------------------------------


class TestUpdateItem:
    async def test_update_quantity(self, session: AsyncSession, household, sample_ingredient):
        svc = InventoryService(session, household.id)
        item = await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )
        updated = await svc.update_item(item.id, UpdateInventoryItem(quantity=300))
        assert updated is not None
        assert updated.quantity == 300

    async def test_update_nonexistent_returns_none(
        self, session: AsyncSession, household
    ):
        svc = InventoryService(session, household.id)
        result = await svc.update_item(uuid4(), UpdateInventoryItem(quantity=100))
        assert result is None


# ---------------------------------------------------------------------------
# Remove item
# ---------------------------------------------------------------------------


class TestRemoveItem:
    async def test_remove_existing_item(self, session: AsyncSession, household, sample_ingredient):
        svc = InventoryService(session, household.id)
        item = await svc.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )
        deleted = await svc.remove_item(item.id)
        assert deleted is True

        items = await svc.list_items()
        assert len(items) == 0

    async def test_remove_nonexistent_returns_false(self, session: AsyncSession, household):
        svc = InventoryService(session, household.id)
        result = await svc.remove_item(uuid4())
        assert result is False


# ---------------------------------------------------------------------------
# Expiry status computation (on Pydantic response model)
# ---------------------------------------------------------------------------


class TestExpiryStatus:
    def test_no_expiry_is_safe(self):
        resp = InventoryItemResponse(
            id=uuid4(),
            ingredient={"id": uuid4(), "name": "Rice", "category": "grain",
                        "default_unit": "g", "default_storage": "pantry",
                        "typical_shelf_life_days": 365},
            quantity=1000,
            unit="g",
            location="pantry",
            expiry_date=None,
            created_at=datetime.now(UTC),
        )
        assert resp.expiry_status == "safe"

    def test_future_expiry_is_safe(self):
        resp = InventoryItemResponse(
            id=uuid4(),
            ingredient={"id": uuid4(), "name": "Pasta", "category": "grain",
                        "default_unit": "g", "default_storage": "pantry",
                        "typical_shelf_life_days": 365},
            quantity=500,
            unit="g",
            location="pantry",
            expiry_date=datetime.now(UTC) + timedelta(days=10),
            created_at=datetime.now(UTC),
        )
        assert resp.expiry_status == "safe"

    def test_expiring_within_three_days(self):
        resp = InventoryItemResponse(
            id=uuid4(),
            ingredient={"id": uuid4(), "name": "Milk", "category": "dairy",
                        "default_unit": "ml", "default_storage": "fridge",
                        "typical_shelf_life_days": 7},
            quantity=1000,
            unit="ml",
            location="fridge",
            expiry_date=datetime.now(UTC) + timedelta(days=2),
            created_at=datetime.now(UTC),
        )
        assert resp.expiry_status == "expiring"

    def test_past_expiry_is_expired(self):
        resp = InventoryItemResponse(
            id=uuid4(),
            ingredient={"id": uuid4(), "name": "Yogurt", "category": "dairy",
                        "default_unit": "ml", "default_storage": "fridge",
                        "typical_shelf_life_days": 14},
            quantity=200,
            unit="ml",
            location="fridge",
            expiry_date=datetime.now(UTC) - timedelta(days=1),
            created_at=datetime.now(UTC),
        )
        assert resp.expiry_status == "expired"


# ---------------------------------------------------------------------------
# Household isolation
# ---------------------------------------------------------------------------


class TestHouseholdIsolation:
    async def test_user_a_cannot_see_user_b_items(
        self, session: AsyncSession, household, sample_ingredient
    ):
        # Household A adds an item
        svc_a = InventoryService(session, household.id)
        await svc_a.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )

        # Household B (different ID) sees nothing
        other_household_id = uuid4()
        svc_b = InventoryService(session, other_household_id)
        items = await svc_b.list_items()
        assert len(items) == 0

    async def test_update_scoped_to_household(
        self, session: AsyncSession, household, sample_ingredient
    ):
        svc_a = InventoryService(session, household.id)
        item = await svc_a.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )

        # Household B cannot update household A's item
        svc_b = InventoryService(session, uuid4())
        result = await svc_b.update_item(item.id, UpdateInventoryItem(quantity=100))
        assert result is None

        # Verify original unchanged
        items = await svc_a.list_items()
        assert items[0].quantity == 500

    async def test_remove_scoped_to_household(
        self, session: AsyncSession, household, sample_ingredient
    ):
        svc_a = InventoryService(session, household.id)
        item = await svc_a.add_item(
            CreateInventoryItem(
                ingredient_id=sample_ingredient.id,
                quantity=500,
                unit="g",
                location="fridge",
            )
        )

        # Household B cannot delete household A's item
        svc_b = InventoryService(session, uuid4())
        result = await svc_b.remove_item(item.id)
        assert result is False

        # Verify still exists
        items = await svc_a.list_items()
        assert len(items) == 1
