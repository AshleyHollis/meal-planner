"""Unit tests for MealPlanService."""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from api.models.meal_plan import (
    CreateMealPlan,
    UpdateMealSlot,
    UpdatePlanStatus,
    UpdateSlotStatus,
)
from api.services.meal_plan_service import MealPlanService
from shared.db.models.household import Household
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _next_monday() -> datetime:
    """Return the next Monday at midnight UTC."""
    now = datetime.now(UTC)
    days_ahead = (7 - now.weekday()) % 7  # 0 = Monday
    if days_ahead == 0:
        days_ahead = 7
    return (now + timedelta(days=days_ahead)).replace(hour=0, minute=0, second=0, microsecond=0)


async def _make_recipe(session: AsyncSession, household_id) -> Recipe:
    """Seed a minimal recipe for slot tests."""
    now = datetime.now(UTC)
    recipe = Recipe(
        id=uuid4(),
        household_id=household_id,
        title="Test Recipe",
        servings=2,
        is_ai_generated=False,
        created_at=now,
        updated_at=now,
    )
    session.add(recipe)
    await session.flush()
    return recipe


async def _make_plan(
    session: AsyncSession,
    household_id,
    status: str = "draft",
    week_start: datetime | None = None,
) -> MealPlan:
    """Seed a meal plan directly via ORM."""
    now = datetime.now(UTC)
    plan = MealPlan(
        id=uuid4(),
        household_id=household_id,
        week_start_date=week_start or _next_monday(),
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
    day: int = 0,
    meal_type: str = "dinner",
    status: str = "planned",
    recipe_id=None,
) -> MealSlot:
    """Seed a meal slot directly via ORM."""
    now = datetime.now(UTC)
    slot = MealSlot(
        id=uuid4(),
        meal_plan_id=plan_id,
        recipe_id=recipe_id,
        day=day,
        meal_type=meal_type,
        status=status,
        created_at=now,
        updated_at=now,
    )
    session.add(slot)
    await session.flush()
    return slot


# ---------------------------------------------------------------------------
# Plan status lifecycle: draft -> active -> completed
# ---------------------------------------------------------------------------


class TestPlanStatusLifecycle:
    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_create_plan_starts_as_draft(
        self, mock_enqueue, session: AsyncSession, household
    ):
        svc = MealPlanService(session, household.id)
        plan = await svc.create_plan(CreateMealPlan(week_start_date=_next_monday()))
        assert plan.status == "draft"
        assert plan.household_id == household.id

    async def test_transition_draft_to_active(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="draft")
        svc = MealPlanService(session, household.id)

        updated = await svc.update_plan_status(plan.id, UpdatePlanStatus(status="active"))
        assert updated is not None
        assert updated.status == "active"

    async def test_transition_active_to_completed(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="active")
        svc = MealPlanService(session, household.id)

        updated = await svc.update_plan_status(plan.id, UpdatePlanStatus(status="completed"))
        assert updated is not None
        assert updated.status == "completed"

    async def test_full_lifecycle_draft_active_completed(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="draft")
        svc = MealPlanService(session, household.id)

        # draft -> active
        plan = await svc.update_plan_status(plan.id, UpdatePlanStatus(status="active"))
        assert plan.status == "active"

        # active -> completed
        plan = await svc.update_plan_status(plan.id, UpdatePlanStatus(status="completed"))
        assert plan.status == "completed"

    async def test_get_plan_returns_correct_plan(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id)
        svc = MealPlanService(session, household.id)

        fetched = await svc.get_plan(plan.id)
        assert fetched is not None
        assert fetched.id == plan.id

    async def test_get_plan_nonexistent_returns_none(self, session: AsyncSession, household):
        svc = MealPlanService(session, household.id)
        result = await svc.get_plan(uuid4())
        assert result is None

    async def test_get_active_plan(self, session: AsyncSession, household):
        await _make_plan(session, household.id, status="active")
        svc = MealPlanService(session, household.id)

        active = await svc.get_active_plan()
        assert active is not None
        assert active.status == "active"

    async def test_get_active_plan_returns_none_when_only_draft(
        self, session: AsyncSession, household
    ):
        await _make_plan(session, household.id, status="draft")
        svc = MealPlanService(session, household.id)

        active = await svc.get_active_plan()
        assert active is None

    async def test_update_plan_status_nonexistent_returns_none(
        self, session: AsyncSession, household
    ):
        svc = MealPlanService(session, household.id)
        result = await svc.update_plan_status(uuid4(), UpdatePlanStatus(status="active"))
        assert result is None


# ---------------------------------------------------------------------------
# Only one active plan per household
# ---------------------------------------------------------------------------


class TestOneActivePlanPerHousehold:
    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_cannot_create_plan_when_active_exists(
        self, mock_enqueue, session: AsyncSession, household
    ):
        await _make_plan(session, household.id, status="active")
        svc = MealPlanService(session, household.id)

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await svc.create_plan(CreateMealPlan(week_start_date=_next_monday()))
        assert exc_info.value.status_code == 409

    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_cannot_create_plan_when_draft_exists(
        self, mock_enqueue, session: AsyncSession, household
    ):
        await _make_plan(session, household.id, status="draft")
        svc = MealPlanService(session, household.id)

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await svc.create_plan(CreateMealPlan(week_start_date=_next_monday()))
        assert exc_info.value.status_code == 409

    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_can_create_plan_after_previous_completed(
        self, mock_enqueue, session: AsyncSession, household
    ):
        await _make_plan(session, household.id, status="completed")
        svc = MealPlanService(session, household.id)

        plan = await svc.create_plan(CreateMealPlan(week_start_date=_next_monday()))
        assert plan.status == "draft"

    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_different_household_can_have_active_plan(
        self, mock_enqueue, session: AsyncSession, household
    ):
        # Household A has active plan
        await _make_plan(session, household.id, status="active")

        # Seed household B so FK constraint is satisfied
        now = datetime.now(UTC)
        other_hh = Household(
            id=uuid4(),
            name="Other Household",
            default_servings=2,
            created_at=now,
            updated_at=now,
        )
        session.add(other_hh)
        await session.flush()

        # Household B can create its own
        svc_b = MealPlanService(session, other_hh.id)
        plan = await svc_b.create_plan(CreateMealPlan(week_start_date=_next_monday()))
        assert plan.status == "draft"


# ---------------------------------------------------------------------------
# Slot operations: swap, mark cooked/skipped
# ---------------------------------------------------------------------------


class TestSlotOperations:
    async def test_swap_slot_recipe(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="active")
        recipe_a = await _make_recipe(session, household.id)
        recipe_b = await _make_recipe(session, household.id)
        slot = await _make_slot(session, plan.id, day=0, recipe_id=recipe_a.id)

        svc = MealPlanService(session, household.id)
        updated = await svc.update_slot(plan.id, slot.id, UpdateMealSlot(recipe_id=recipe_b.id))
        assert updated is not None
        assert updated.recipe_id == recipe_b.id

    async def test_swap_slot_to_none(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="active")
        recipe = await _make_recipe(session, household.id)
        slot = await _make_slot(session, plan.id, day=0, recipe_id=recipe.id)

        svc = MealPlanService(session, household.id)
        updated = await svc.update_slot(plan.id, slot.id, UpdateMealSlot(recipe_id=None))
        assert updated is not None
        assert updated.recipe_id is None

    async def test_mark_slot_cooked(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="active")
        slot = await _make_slot(session, plan.id, day=0)

        svc = MealPlanService(session, household.id)
        updated, deductions = await svc.update_slot_status(
            plan.id, slot.id, UpdateSlotStatus(status="cooked")
        )
        assert updated is not None
        assert updated.status == "cooked"
        assert updated.cooked_at is not None

    async def test_mark_slot_skipped(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="active")
        slot = await _make_slot(session, plan.id, day=1)

        svc = MealPlanService(session, household.id)
        updated, deductions = await svc.update_slot_status(
            plan.id, slot.id, UpdateSlotStatus(status="skipped")
        )
        assert updated is not None
        assert updated.status == "skipped"
        assert updated.cooked_at is not None

    async def test_revert_slot_to_planned_clears_cooked_at(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="active")
        slot = await _make_slot(session, plan.id, day=0)

        svc = MealPlanService(session, household.id)
        # Mark cooked first
        await svc.update_slot_status(plan.id, slot.id, UpdateSlotStatus(status="cooked"))
        # Revert to planned
        updated, deductions = await svc.update_slot_status(
            plan.id, slot.id, UpdateSlotStatus(status="planned")
        )
        assert updated is not None
        assert updated.status == "planned"
        assert updated.cooked_at is None

    async def test_update_slot_nonexistent_returns_none(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id)
        svc = MealPlanService(session, household.id)

        result = await svc.update_slot(plan.id, uuid4(), UpdateMealSlot(recipe_id=uuid4()))
        assert result is None

    async def test_update_slot_status_nonexistent_returns_none(
        self, session: AsyncSession, household
    ):
        plan = await _make_plan(session, household.id)
        svc = MealPlanService(session, household.id)

        result, deductions = await svc.update_slot_status(
            plan.id, uuid4(), UpdateSlotStatus(status="cooked")
        )
        assert result is None

    async def test_update_slot_scoped_to_household(self, session: AsyncSession, household):
        plan = await _make_plan(session, household.id, status="active")
        slot = await _make_slot(session, plan.id, day=0)

        # Other household cannot touch the slot
        svc_other = MealPlanService(session, uuid4())
        result, deductions = await svc_other.update_slot_status(
            plan.id, slot.id, UpdateSlotStatus(status="cooked")
        )
        assert result is None


# ---------------------------------------------------------------------------
# Plan creation enqueues message
# ---------------------------------------------------------------------------


class TestCreatePlanEnqueuesMessage:
    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_create_plan_calls_enqueue(self, mock_enqueue, session: AsyncSession, household):
        svc = MealPlanService(session, household.id)
        monday = _next_monday()
        plan = await svc.create_plan(CreateMealPlan(week_start_date=monday))

        mock_enqueue.assert_called_once()
        call_args = mock_enqueue.call_args[0][0]
        assert call_args["meal_plan_id"] == str(plan.id)
        assert call_args["household_id"] == str(household.id)
        assert call_args["week_start_date"] == monday.isoformat()

    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_enqueue_not_called_on_conflict(
        self, mock_enqueue, session: AsyncSession, household
    ):
        await _make_plan(session, household.id, status="active")
        svc = MealPlanService(session, household.id)

        from fastapi import HTTPException

        with pytest.raises(HTTPException):
            await svc.create_plan(CreateMealPlan(week_start_date=_next_monday()))

        mock_enqueue.assert_not_called()
