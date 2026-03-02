"""Tests for US-1: Auto-deduct inventory on cook."""
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from api.models.meal_plan import UpdateSlotStatus
from api.services.inventory_service import InventoryService
from api.services.meal_plan_service import MealPlanService
from shared.db.models.ingredient import Ingredient
from shared.db.models.inventory import InventoryItem
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe, RecipeIngredient
from sqlalchemy.ext.asyncio import AsyncSession


async def _make_ingredient(session, name="Chicken Breast", category="meat", default_unit="g") -> Ingredient:
    now = datetime.now(UTC)
    ing = Ingredient(
        id=uuid4(),
        name=name,
        category=category,
        default_unit=default_unit,
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now
    )
    session.add(ing)
    await session.flush()
    return ing


async def _make_inventory_item(session, ingredient_id, household_id, quantity, expiry_date, location="fridge") -> InventoryItem:
    now = datetime.now(UTC)
    item = InventoryItem(
        id=uuid4(),
        household_id=household_id,
        ingredient_id=ingredient_id,
        quantity=quantity,
        unit="g",
        location=location,
        expiry_date=expiry_date,
        created_at=now,
        updated_at=now
    )
    session.add(item)
    await session.flush()
    return item


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


async def _make_recipe_ingredient(session, recipe_id, ingredient_id, quantity, unit="g", is_optional=False) -> RecipeIngredient:
    now = datetime.now(UTC)
    ri = RecipeIngredient(
        id=uuid4(),
        recipe_id=recipe_id,
        ingredient_id=ingredient_id,
        quantity=quantity,
        unit=unit,
        is_optional=is_optional,
    )
    session.add(ri)
    await session.flush()
    return ri


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


async def test_deduct_decreases_inventory(session: AsyncSession, household):
    """Deducting from inventory should decrease quantity."""
    ing = await _make_ingredient(session, "Chicken Breast")
    expiry = datetime.now(UTC) + timedelta(days=3)
    await _make_inventory_item(session, ing.id, household.id, 500.0, expiry)
    
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 200.0, "g")
    await session.commit()
    
    service = InventoryService(session, household.id)
    result = await service.deduct_for_recipe(recipe.id)
    
    assert len(result) == 1
    assert result[0]["ingredient_id"] == str(ing.id)
    assert result[0]["requested"] == 200.0
    assert result[0]["deducted"] == 200.0
    assert result[0]["unit_mismatch"] is False
    
    # Verify inventory was updated
    items = await service.list_items()
    assert len(items) == 1
    assert items[0].quantity == 300.0


async def test_deduct_removes_empty_items(session: AsyncSession, household):
    """Deducting exact quantity should remove inventory item."""
    ing = await _make_ingredient(session, "Chicken Breast")
    expiry = datetime.now(UTC) + timedelta(days=3)
    await _make_inventory_item(session, ing.id, household.id, 200.0, expiry)
    
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 200.0, "g")
    await session.commit()
    
    service = InventoryService(session, household.id)
    result = await service.deduct_for_recipe(recipe.id)
    
    assert len(result) == 1
    assert result[0]["deducted"] == 200.0
    
    # Verify inventory item was removed
    items = await service.list_items()
    assert len(items) == 0


async def test_deduct_oldest_expiry_first(session: AsyncSession, household):
    """Should deduct from items with oldest expiry first."""
    ing = await _make_ingredient(session, "Chicken Breast")
    old_expiry = datetime.now(UTC) + timedelta(days=1)
    new_expiry = datetime.now(UTC) + timedelta(days=5)
    
    await _make_inventory_item(session, ing.id, household.id, 200.0, old_expiry)
    await _make_inventory_item(session, ing.id, household.id, 200.0, new_expiry)
    
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 250.0, "g")
    await session.commit()
    
    service = InventoryService(session, household.id)
    result = await service.deduct_for_recipe(recipe.id)
    
    assert result[0]["deducted"] == 250.0
    
    # Verify oldest item is gone, newest item has partial quantity
    items = await service.list_items()
    assert len(items) == 1
    assert items[0].expiry_date.date() if hasattr(items[0].expiry_date, 'date') else items[0].expiry_date == new_expiry.date()
    assert items[0].quantity == 150.0


async def test_deduct_no_inventory(session: AsyncSession, household):
    """Deducting without inventory should show 0 deducted."""
    ing = await _make_ingredient(session, "Chicken Breast")
    
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 200.0, "g")
    await session.commit()
    
    service = InventoryService(session, household.id)
    result = await service.deduct_for_recipe(recipe.id)
    
    assert len(result) == 1
    assert result[0]["ingredient_id"] == str(ing.id)
    assert result[0]["requested"] == 200.0
    assert result[0]["deducted"] == 0.0
    assert result[0]["unit_mismatch"] is False


async def test_deduct_unit_mismatch(session: AsyncSession, household):
    """Deducting with unit mismatch should flag it."""
    ing = await _make_ingredient(session, "Milk", default_unit="ml")
    expiry = datetime.now(UTC) + timedelta(days=3)
    
    item = await _make_inventory_item(session, ing.id, household.id, 1000.0, expiry)
    item.unit = "ml"
    
    recipe = await _make_recipe(session, "Pancakes")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 250.0, "g")
    await session.commit()
    
    service = InventoryService(session, household.id)
    result = await service.deduct_for_recipe(recipe.id)
    
    assert len(result) == 1
    assert result[0]["unit_mismatch"] is True
    assert result[0]["deducted"] == 0.0


async def test_cook_slot_triggers_deduction(session: AsyncSession, household):
    """Updating slot to 'cooked' should trigger inventory deduction."""
    ing = await _make_ingredient(session, "Chicken Breast")
    expiry = datetime.now(UTC) + timedelta(days=3)
    await _make_inventory_item(session, ing.id, household.id, 500.0, expiry)
    
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 200.0, "g")
    
    plan = await _make_plan(session, household.id)
    slot = await _make_slot(session, plan.id, recipe_id=recipe.id, status="planned")
    await session.commit()
    
    service = MealPlanService(session, household.id)
    update = UpdateSlotStatus(status="cooked")
    slot_result, deductions = await service.update_slot_status(plan.id, slot.id, update)
    
    assert slot_result.status == "cooked"
    assert deductions is not None
    assert len(deductions) == 1
    assert deductions[0]["deducted"] == 200.0


async def test_skip_slot_no_deduction(session: AsyncSession, household):
    """Marking slot as 'skipped' should not deduct inventory."""
    ing = await _make_ingredient(session, "Chicken Breast")
    expiry = datetime.now(UTC) + timedelta(days=3)
    await _make_inventory_item(session, ing.id, household.id, 500.0, expiry)
    
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 200.0, "g")
    
    plan = await _make_plan(session, household.id)
    slot = await _make_slot(session, plan.id, recipe_id=recipe.id, status="planned")
    await session.commit()
    
    service = MealPlanService(session, household.id)
    update = UpdateSlotStatus(status="skipped")
    slot_result, deductions = await service.update_slot_status(plan.id, slot.id, update)
    
    assert slot_result.status == "skipped"
    assert deductions is None or len(deductions) == 0


async def test_deduct_skips_optional_ingredients(session: AsyncSession, household):
    """Optional recipe ingredients should not be deducted."""
    ing1 = await _make_ingredient(session, "Chicken Breast")
    ing2 = await _make_ingredient(session, "Parsley", category="herb")
    
    expiry = datetime.now(UTC) + timedelta(days=3)
    await _make_inventory_item(session, ing1.id, household.id, 500.0, expiry)
    await _make_inventory_item(session, ing2.id, household.id, 50.0, expiry)
    
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing1.id, 200.0, "g", is_optional=False)
    await _make_recipe_ingredient(session, recipe.id, ing2.id, 10.0, "g", is_optional=True)
    await session.commit()
    
    service = InventoryService(session, household.id)
    result = await service.deduct_for_recipe(recipe.id)
    
    # Only non-optional ingredient should be deducted
    assert len(result) == 1
    assert result[0]["ingredient_id"] == str(ing1.id)
    assert result[0]["deducted"] == 200.0
    
    # Verify parsley was not deducted (check all items and filter)
    items = await service.list_items()
    parsley_items = [i for i in items if i.ingredient_id == ing2.id]
    assert len(parsley_items) == 1
    assert parsley_items[0].quantity == 50.0
