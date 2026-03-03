"""Tests for US-4: Freezer storage and defrost reminders."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from api.models.inventory import CreateInventoryItem
from api.services.inventory_service import InventoryService
from shared.db.models.ingredient import Ingredient
from shared.db.models.inventory import InventoryItem as InventoryItemModel
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe, RecipeIngredient
from sqlalchemy.ext.asyncio import AsyncSession


async def _make_ingredient(
    session, name="Chicken Breast", category="meat", default_unit="g"
) -> Ingredient:
    now = datetime.now(UTC)
    ing = Ingredient(
        id=uuid4(),
        name=name,
        category=category,
        default_unit=default_unit,
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now,
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
        updated_at=now,
    )
    session.add(recipe)
    await session.flush()
    return recipe


async def _make_recipe_ingredient(
    session, recipe_id, ingredient_id, quantity, unit="g"
) -> RecipeIngredient:
    ri = RecipeIngredient(
        id=uuid4(),
        recipe_id=recipe_id,
        ingredient_id=ingredient_id,
        quantity=quantity,
        unit=unit,
        is_optional=False,
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
        updated_at=now,
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
        updated_at=now,
    )
    session.add(slot)
    await session.flush()
    return slot


async def test_add_freezer_item_with_defrost(session: AsyncSession, household):
    """Adding freezer item with defrost hours should store correctly."""
    ing = await _make_ingredient(session, "Chicken Breast")
    await session.commit()

    service = InventoryService(session, household.id)
    expiry = datetime.now(UTC) + timedelta(days=90)

    data = CreateInventoryItem(
        ingredient_id=ing.id,
        quantity=1000.0,
        unit="g",
        location="freezer",
        expiry_date=expiry.date(),
        defrost_hours=12,
    )

    result = await service.add_item(data)

    assert result.location == "freezer"
    assert result.defrost_hours == 12
    assert result.quantity == 1000.0


async def test_defrost_reminders_returns_matching_items(session: AsyncSession, household):
    """Defrost reminders should return freezer items matching upcoming recipes."""
    ing = await _make_ingredient(session, "Chicken Breast")
    expiry = datetime.now(UTC) + timedelta(days=90)

    # Add freezer item
    now = datetime.now(UTC)
    item = InventoryItemModel(
        id=uuid4(),
        household_id=household.id,
        ingredient_id=ing.id,
        quantity=1000.0,
        unit="g",
        location="freezer",
        expiry_date=expiry.date(),
        defrost_hours=12,
        created_at=now,
        updated_at=now,
    )
    session.add(item)

    # Create recipe with this ingredient
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 500.0, "g")

    # Create active plan with upcoming slot
    plan = await _make_plan(session, household.id, status="active")
    await _make_slot(session, plan.id, day=1, recipe_id=recipe.id, status="planned")
    await session.commit()

    service = InventoryService(session, household.id)
    reminders = await service.get_defrost_reminders()

    assert len(reminders) == 1
    assert reminders[0]["ingredient_name"] == "Chicken Breast"
    assert reminders[0]["defrost_hours"] == 12
    assert "meal_day" in reminders[0]


async def test_defrost_reminders_empty_without_plan(session: AsyncSession, household):
    """Defrost reminders should return empty list without active plan."""
    ing = await _make_ingredient(session, "Chicken Breast")
    expiry = datetime.now(UTC) + timedelta(days=90)

    # Add freezer item
    now = datetime.now(UTC)
    item = InventoryItemModel(
        id=uuid4(),
        household_id=household.id,
        ingredient_id=ing.id,
        quantity=1000.0,
        unit="g",
        location="freezer",
        expiry_date=expiry.date(),
        defrost_hours=12,
        created_at=now,
        updated_at=now,
    )
    session.add(item)
    await session.commit()

    service = InventoryService(session, household.id)
    reminders = await service.get_defrost_reminders()

    assert len(reminders) == 0


async def test_defrost_reminders_empty_without_freezer_items(session: AsyncSession, household):
    """Defrost reminders should return empty list without freezer items."""
    ing = await _make_ingredient(session, "Chicken Breast")

    # Create recipe
    recipe = await _make_recipe(session, "Grilled Chicken")
    await _make_recipe_ingredient(session, recipe.id, ing.id, 500.0, "g")

    # Create active plan with upcoming slot
    plan = await _make_plan(session, household.id, status="active")
    await _make_slot(session, plan.id, day=1, recipe_id=recipe.id, status="planned")
    await session.commit()

    service = InventoryService(session, household.id)
    reminders = await service.get_defrost_reminders()

    assert len(reminders) == 0
