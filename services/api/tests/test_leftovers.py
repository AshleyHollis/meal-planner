"""Tests for US-2: Leftover recording."""
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from api.models.leftover import CreateLeftover
from api.services.leftover_service import LeftoverService
from shared.db.models.ingredient import Ingredient
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe
from sqlalchemy.ext.asyncio import AsyncSession


async def _make_ingredient(session, name="Chicken Breast") -> Ingredient:
    now = datetime.now(UTC)
    ing = Ingredient(
        id=uuid4(),
        name=name,
        category="meat",
        default_unit="g",
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now
    )
    session.add(ing)
    await session.flush()
    return ing


async def _make_recipe(session, title="Test Recipe") -> Recipe:
    now = datetime.now(UTC)
    recipe = Recipe(
        id=uuid4(),
        title=title,
        description="Test recipe",
        servings=4,
        prep_time_min=10,
        cook_time_min=20,
        is_ai_generated=False,
        created_at=now,
        updated_at=now
    )
    session.add(recipe)
    await session.flush()
    return recipe


async def _make_plan(session, household_id, status="active") -> MealPlan:
    now = datetime.now(UTC)
    plan = MealPlan(
        id=uuid4(),
        household_id=household_id,
        week_start_date=now.date(),
        status=status,
        created_at=now,
        updated_at=now
    )
    session.add(plan)
    await session.flush()
    return plan


async def _make_slot(session, plan_id, day=0, recipe_id=None, status="planned") -> MealSlot:
    now = datetime.now(UTC)
    slot = MealSlot(
        id=uuid4(),
        meal_plan_id=plan_id,
        recipe_id=recipe_id,
        day=day,
        meal_type="dinner",
        status=status,
        created_at=now,
        updated_at=now
    )
    session.add(slot)
    await session.flush()
    return slot


async def test_create_leftover_from_cooked_slot(session: AsyncSession, household):
    """Creating leftover from cooked slot should succeed."""
    recipe = await _make_recipe(session, "Roast Chicken")
    plan = await _make_plan(session, household.id)
    slot = await _make_slot(session, plan.id, recipe_id=recipe.id, status="cooked")
    await session.commit()
    
    service = LeftoverService(session, household.id)
    data = CreateLeftover(
        portions=2,
        storage_location="fridge",
        expiry_date=date.today() + timedelta(days=3)
    )
    
    result = await service.create_leftover(slot.id, data)
    
    assert result.household_id == household.id
    assert result.meal_slot_id == slot.id
    assert result.portions == 2
    assert result.storage_location == "fridge"
    assert result.used_at is None


async def test_create_leftover_on_planned_slot_fails(session: AsyncSession, household):
    """Creating leftover on planned slot should fail."""
    recipe = await _make_recipe(session, "Roast Chicken")
    plan = await _make_plan(session, household.id)
    slot = await _make_slot(session, plan.id, recipe_id=recipe.id, status="planned")
    await session.commit()
    
    service = LeftoverService(session, household.id)
    data = CreateLeftover(
        portions=2,
        storage_location="fridge",
        expiry_date=date.today() + timedelta(days=3)
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await service.create_leftover(slot.id, data)
    
    assert exc_info.value.status_code == 400
    assert "cooked" in str(exc_info.value.detail).lower()


async def test_list_active_leftovers(session: AsyncSession, household):
    """Listing leftovers without include_used should return only active ones."""
    recipe1 = await _make_recipe(session, "Roast Chicken")
    recipe2 = await _make_recipe(session, "Pasta")
    plan = await _make_plan(session, household.id)
    slot1 = await _make_slot(session, plan.id, day=0, recipe_id=recipe1.id, status="cooked")
    slot2 = await _make_slot(session, plan.id, day=1, recipe_id=recipe2.id, status="cooked")
    await session.commit()
    
    service = LeftoverService(session, household.id)
    
    # Create two leftovers
    data1 = CreateLeftover(
        portions=2,
        storage_location="fridge",
        expiry_date=date.today() + timedelta(days=3)
    )
    leftover1 = await service.create_leftover(slot1.id, data1)
    
    data2 = CreateLeftover(
        portions=1,
        storage_location="fridge",
        expiry_date=date.today() + timedelta(days=2)
    )
    leftover2 = await service.create_leftover(slot2.id, data2)
    await session.commit()
    
    # Mark one as used
    await service.mark_used(leftover1.id)
    await session.commit()
    
    # List without include_used
    results = await service.list_leftovers(include_used=False)
    
    assert len(results) == 1
    assert results[0].id == leftover2.id
    assert results[0].used_at is None


async def test_list_leftovers_includes_used(session: AsyncSession, household):
    """Listing with include_used=True should return all leftovers."""
    recipe1 = await _make_recipe(session, "Roast Chicken")
    recipe2 = await _make_recipe(session, "Pasta")
    plan = await _make_plan(session, household.id)
    slot1 = await _make_slot(session, plan.id, day=0, recipe_id=recipe1.id, status="cooked")
    slot2 = await _make_slot(session, plan.id, day=1, recipe_id=recipe2.id, status="cooked")
    await session.commit()
    
    service = LeftoverService(session, household.id)
    
    # Create two leftovers
    data1 = CreateLeftover(
        portions=2,
        storage_location="fridge",
        expiry_date=date.today() + timedelta(days=3)
    )
    leftover1 = await service.create_leftover(slot1.id, data1)
    
    data2 = CreateLeftover(
        portions=1,
        storage_location="fridge",
        expiry_date=date.today() + timedelta(days=2)
    )
    await service.create_leftover(slot2.id, data2)
    await session.commit()
    
    # Mark one as used
    await service.mark_used(leftover1.id)
    await session.commit()
    
    # List with include_used=True
    results = await service.list_leftovers(include_used=True)
    
    assert len(results) == 2
    used_count = sum(1 for lo in results if lo.used_at is not None)
    assert used_count == 1


async def test_mark_leftover_used(session: AsyncSession, household):
    """Marking leftover as used should set used_at timestamp."""
    recipe = await _make_recipe(session, "Roast Chicken")
    plan = await _make_plan(session, household.id)
    slot = await _make_slot(session, plan.id, recipe_id=recipe.id, status="cooked")
    await session.commit()
    
    service = LeftoverService(session, household.id)
    data = CreateLeftover(
        portions=2,
        storage_location="fridge",
        expiry_date=date.today() + timedelta(days=3)
    )
    leftover = await service.create_leftover(slot.id, data)
    await session.commit()
    
    result = await service.mark_used(leftover.id)
    await session.commit()
    
    assert result is not None
    assert result.used_at is not None
    assert isinstance(result.used_at, datetime)


async def test_mark_nonexistent_leftover(session: AsyncSession, household):
    """Marking nonexistent leftover should return None."""
    service = LeftoverService(session, household.id)
    fake_id = uuid4()
    
    result = await service.mark_used(fake_id)
    
    assert result is None
