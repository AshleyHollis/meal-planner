"""Tests for US-3: Staple ingredients."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from api.models.staple import CreateStaple
from api.services.staple_service import StapleService
from shared.db.models.ingredient import Ingredient
from shared.db.models.inventory import InventoryItem
from sqlalchemy.ext.asyncio import AsyncSession


async def _make_ingredient(
    session, name="Flour", category="pantry", default_unit="g"
) -> Ingredient:
    now = datetime.now(UTC)
    ing = Ingredient(
        id=uuid4(),
        name=name,
        category=category,
        default_unit=default_unit,
        default_storage="pantry",
        typical_shelf_life_days=90,
        created_at=now,
        updated_at=now,
    )
    session.add(ing)
    await session.flush()
    return ing


async def _make_inventory_item(
    session, ingredient_id, household_id, quantity, unit="g"
) -> InventoryItem:
    now = datetime.now(UTC)
    expiry = now + timedelta(days=30)
    item = InventoryItem(
        id=uuid4(),
        household_id=household_id,
        ingredient_id=ingredient_id,
        quantity=quantity,
        unit=unit,
        location="pantry",
        expiry_date=expiry.date(),
        created_at=now,
        updated_at=now,
    )
    session.add(item)
    await session.flush()
    return item


async def test_add_staple(session: AsyncSession, household):
    """Adding a staple should return correct fields."""
    ing = await _make_ingredient(session, "Flour")
    await session.commit()

    service = StapleService(session, household.id)
    data = CreateStaple(ingredient_id=ing.id, min_threshold=1000.0, unit="g")

    result = await service.add_staple(data)

    assert result.household_id == household.id
    assert result.ingredient_id == ing.id
    assert result.min_threshold == 1000.0
    assert result.unit == "g"


async def test_list_staples(session: AsyncSession, household):
    """Listing staples should return all added staples."""
    ing1 = await _make_ingredient(session, "Flour")
    ing2 = await _make_ingredient(session, "Sugar")
    await session.commit()

    service = StapleService(session, household.id)

    data1 = CreateStaple(ingredient_id=ing1.id, min_threshold=1000.0, unit="g")
    await service.add_staple(data1)

    data2 = CreateStaple(ingredient_id=ing2.id, min_threshold=500.0, unit="g")
    await service.add_staple(data2)
    await session.commit()

    results = await service.list_staples()

    assert len(results) == 2
    staple_ingredients = {s.ingredient_id for s in results}
    assert ing1.id in staple_ingredients
    assert ing2.id in staple_ingredients


async def test_remove_staple(session: AsyncSession, household):
    """Removing a staple should return True and remove from list."""
    ing = await _make_ingredient(session, "Flour")
    await session.commit()

    service = StapleService(session, household.id)
    data = CreateStaple(ingredient_id=ing.id, min_threshold=1000.0, unit="g")
    staple = await service.add_staple(data)
    await session.commit()

    result = await service.remove_staple(staple.id)
    await session.commit()

    assert result is True

    # Verify it's no longer in list
    staples = await service.list_staples()
    assert len(staples) == 0


async def test_suggestions_with_shortfall(session: AsyncSession, household):
    """Staple with inventory below threshold should show in suggestions."""
    ing = await _make_ingredient(session, "Flour")
    await _make_inventory_item(session, ing.id, household.id, 300.0, "g")
    await session.commit()

    service = StapleService(session, household.id)
    data = CreateStaple(ingredient_id=ing.id, min_threshold=1000.0, unit="g")
    await service.add_staple(data)
    await session.commit()

    suggestions = await service.get_suggestions()

    assert len(suggestions) == 1
    assert suggestions[0]["ingredient_id"] == ing.id
    assert suggestions[0]["min_threshold"] == 1000.0
    assert suggestions[0]["current_qty"] == 300.0
    assert suggestions[0]["quantity_needed"] == 700.0


async def test_suggestions_no_shortfall(session: AsyncSession, household):
    """Staple with inventory above threshold should not show in suggestions."""
    ing = await _make_ingredient(session, "Flour")
    await _make_inventory_item(session, ing.id, household.id, 1500.0, "g")
    await session.commit()

    service = StapleService(session, household.id)
    data = CreateStaple(ingredient_id=ing.id, min_threshold=1000.0, unit="g")
    await service.add_staple(data)
    await session.commit()

    suggestions = await service.get_suggestions()

    assert len(suggestions) == 0


async def test_suggestions_no_inventory(session: AsyncSession, household):
    """Staple with no inventory should suggest full threshold amount."""
    ing = await _make_ingredient(session, "Flour")
    await session.commit()

    service = StapleService(session, household.id)
    data = CreateStaple(ingredient_id=ing.id, min_threshold=1000.0, unit="g")
    await service.add_staple(data)
    await session.commit()

    suggestions = await service.get_suggestions()

    assert len(suggestions) == 1
    assert suggestions[0]["ingredient_id"] == ing.id
    assert suggestions[0]["current_qty"] == 0.0
    assert suggestions[0]["quantity_needed"] == 1000.0
