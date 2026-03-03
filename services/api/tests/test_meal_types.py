"""Tests for meal_types validation on CreateMealPlan and queue message inclusion."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.meal_plan import CreateMealPlan
from api.services.meal_plan_service import MealPlanService


def _next_monday() -> datetime:
    now = datetime.now(UTC)
    days_ahead = (7 - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return (now + timedelta(days=days_ahead)).replace(hour=0, minute=0, second=0, microsecond=0)


# ---------------------------------------------------------------------------
# CreateMealPlan.meal_types validation
# ---------------------------------------------------------------------------


class TestCreateMealPlanMealTypes:
    def test_none_is_valid(self):
        plan = CreateMealPlan(week_start_date=_next_monday(), meal_types=None)
        assert plan.meal_types is None

    def test_single_dinner(self):
        plan = CreateMealPlan(week_start_date=_next_monday(), meal_types=["dinner"])
        assert plan.meal_types == ["dinner"]

    def test_all_valid_types(self):
        plan = CreateMealPlan(
            week_start_date=_next_monday(), meal_types=["breakfast", "lunch", "dinner"]
        )
        assert set(plan.meal_types) == {"breakfast", "lunch", "dinner"}

    def test_invalid_type_raises(self):
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            CreateMealPlan(week_start_date=_next_monday(), meal_types=["brunch"])
        assert "Invalid meal type: brunch" in str(exc_info.value)

    def test_mixed_valid_invalid_raises(self):
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CreateMealPlan(week_start_date=_next_monday(), meal_types=["dinner", "snack"])

    def test_error_message_includes_allowed_types(self):
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            CreateMealPlan(week_start_date=_next_monday(), meal_types=["invalid"])
        error_str = str(exc_info.value)
        assert "breakfast" in error_str or "Allowed" in error_str


# ---------------------------------------------------------------------------
# MealPlanService enqueues meal_types
# ---------------------------------------------------------------------------


class TestMealTypesInQueueMessage:
    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_meal_types_included_in_message(
        self, mock_enqueue, session: AsyncSession, household
    ):
        svc = MealPlanService(session, household.id)
        await svc.create_plan(
            CreateMealPlan(
                week_start_date=_next_monday(),
                meal_types=["breakfast", "dinner"],
            )
        )
        call_args = mock_enqueue.call_args[0][0]
        assert call_args["meal_types"] == ["breakfast", "dinner"]

    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_meal_types_absent_when_none(
        self, mock_enqueue, session: AsyncSession, household
    ):
        svc = MealPlanService(session, household.id)
        await svc.create_plan(CreateMealPlan(week_start_date=_next_monday()))
        call_args = mock_enqueue.call_args[0][0]
        assert "meal_types" not in call_args

    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_meal_types_single_dinner(
        self, mock_enqueue, session: AsyncSession, household
    ):
        svc = MealPlanService(session, household.id)
        await svc.create_plan(
            CreateMealPlan(week_start_date=_next_monday(), meal_types=["dinner"])
        )
        call_args = mock_enqueue.call_args[0][0]
        assert call_args["meal_types"] == ["dinner"]
