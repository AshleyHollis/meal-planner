"""Unit tests for meal history endpoint."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from shared.db.models import MealPlan, MealSlot, MealSlotRating, Recipe
from sqlalchemy.ext.asyncio import AsyncSession

from .conftest import TEST_HOUSEHOLD_ID


async def _make_recipe(
    session: AsyncSession,
    household_id,
    title: str = "Test Recipe",
    cuisine_type: str | None = None,
) -> Recipe:
    """Seed a minimal recipe."""
    now = datetime.now(UTC)
    recipe = Recipe(
        id=uuid4(),
        household_id=household_id,
        title=title,
        servings=2,
        is_ai_generated=False,
        cuisine_type=cuisine_type,
        created_at=now,
        updated_at=now,
    )
    session.add(recipe)
    await session.flush()
    return recipe


async def _make_plan(
    session: AsyncSession,
    household_id,
    status: str = "active",
) -> MealPlan:
    """Seed a meal plan."""
    now = datetime.now(UTC)
    plan = MealPlan(
        id=uuid4(),
        household_id=household_id,
        week_start_date=now,
        status=status,
        created_at=now,
        updated_at=now,
    )
    session.add(plan)
    await session.flush()
    return plan


async def _make_slot(
    session: AsyncSession,
    plan_id,
    recipe_id,
    day: int = 0,
    meal_type: str = "dinner",
    status: str = "cooked",
    cooked_at: datetime | None = None,
) -> MealSlot:
    """Seed a meal slot."""
    now = datetime.now(UTC)
    slot = MealSlot(
        id=uuid4(),
        meal_plan_id=plan_id,
        recipe_id=recipe_id,
        day=day,
        meal_type=meal_type,
        status=status,
        cooked_at=cooked_at or now,
        created_at=now,
        updated_at=now,
    )
    session.add(slot)
    await session.flush()
    return slot


async def _make_rating(
    session: AsyncSession,
    slot_id,
    member_id,
    rating: int = 5,
) -> MealSlotRating:
    """Seed a meal slot rating."""
    now = datetime.now(UTC)
    rating_obj = MealSlotRating(
        id=uuid4(),
        meal_slot_id=slot_id,
        rated_by=member_id,
        rating=rating,
        feedback=None,
        created_at=now,
    )
    session.add(rating_obj)
    await session.flush()
    return rating_obj


@pytest.mark.asyncio
async def test_get_meal_history_paginated(client, session, household):
    """Test meal history returns paginated cooked meals."""
    plan = await _make_plan(session, TEST_HOUSEHOLD_ID)
    now = datetime.now(UTC)

    # Create 3 cooked meals with different timestamps
    for i in range(3):
        recipe = await _make_recipe(session, TEST_HOUSEHOLD_ID, title=f"Recipe {i}")
        cooked_at = now - timedelta(hours=i)
        await _make_slot(
            session,
            plan.id,
            recipe.id,
            day=i,
            meal_type="dinner",
            status="cooked",
            cooked_at=cooked_at,
        )

    await session.commit()

    response = await client.get("/api/v1/meal-history?page=1&page_size=2")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    assert data[0]["recipe_title"] == "Recipe 0"  # Most recent
    assert data[1]["recipe_title"] == "Recipe 1"


@pytest.mark.asyncio
async def test_get_meal_history_empty(client, session, household):
    """Test meal history returns empty list when no cooked meals exist."""
    response = await client.get("/api/v1/meal-history")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_meal_history_sort_order(client, session, household):
    """Test meal history is sorted by cooked_at DESC."""
    plan = await _make_plan(session, TEST_HOUSEHOLD_ID)
    now = datetime.now(UTC)

    # Create meals in random order
    recipe1 = await _make_recipe(session, TEST_HOUSEHOLD_ID, title="Oldest")
    recipe2 = await _make_recipe(session, TEST_HOUSEHOLD_ID, title="Middle")
    recipe3 = await _make_recipe(session, TEST_HOUSEHOLD_ID, title="Newest")

    await _make_slot(
        session,
        plan.id,
        recipe1.id,
        day=0,
        cooked_at=now - timedelta(days=2),
    )
    await _make_slot(
        session,
        plan.id,
        recipe2.id,
        day=1,
        cooked_at=now - timedelta(days=1),
    )
    await _make_slot(
        session,
        plan.id,
        recipe3.id,
        day=2,
        cooked_at=now,
    )

    await session.commit()

    response = await client.get("/api/v1/meal-history")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 3
    assert data[0]["recipe_title"] == "Newest"
    assert data[1]["recipe_title"] == "Middle"
    assert data[2]["recipe_title"] == "Oldest"


@pytest.mark.asyncio
async def test_get_meal_history_rating_inclusion(client, session, household):
    """Test meal history includes rating when available."""
    from shared.db.models import HouseholdMember

    # Get the test member
    from sqlalchemy import select

    from .conftest import TEST_USER_SUB

    result = await session.execute(
        select(HouseholdMember).where(HouseholdMember.auth0_user_id == TEST_USER_SUB)
    )
    member = result.scalar_one()

    plan = await _make_plan(session, TEST_HOUSEHOLD_ID)
    recipe = await _make_recipe(session, TEST_HOUSEHOLD_ID, title="Rated Recipe")
    slot = await _make_slot(session, plan.id, recipe.id)

    # Add rating
    await _make_rating(session, slot.id, member.id, rating=4)
    await session.commit()

    response = await client.get("/api/v1/meal-history")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["recipe_title"] == "Rated Recipe"
    assert data[0]["rating"] == 4


@pytest.mark.asyncio
async def test_get_meal_history_cuisine_type(client, session, household):
    """Test meal history includes cuisine_type when available."""
    plan = await _make_plan(session, TEST_HOUSEHOLD_ID)
    recipe = await _make_recipe(
        session,
        TEST_HOUSEHOLD_ID,
        title="Italian Recipe",
        cuisine_type="italian",
    )
    await _make_slot(session, plan.id, recipe.id)
    await session.commit()

    response = await client.get("/api/v1/meal-history")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["cuisine_type"] == "italian"


@pytest.mark.asyncio
async def test_get_meal_history_only_cooked(client, session, household):
    """Test meal history only includes cooked meals, not planned or skipped."""
    plan = await _make_plan(session, TEST_HOUSEHOLD_ID)
    recipe_cooked = await _make_recipe(session, TEST_HOUSEHOLD_ID, title="Cooked")
    recipe_planned = await _make_recipe(session, TEST_HOUSEHOLD_ID, title="Planned")
    recipe_skipped = await _make_recipe(session, TEST_HOUSEHOLD_ID, title="Skipped")

    # Create slots with different statuses
    await _make_slot(session, plan.id, recipe_cooked.id, status="cooked")
    await _make_slot(session, plan.id, recipe_planned.id, day=1, status="planned")
    await _make_slot(session, plan.id, recipe_skipped.id, day=2, status="skipped")
    await session.commit()

    response = await client.get("/api/v1/meal-history")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["recipe_title"] == "Cooked"
