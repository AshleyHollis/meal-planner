"""Meal plan service – create, read, update plans and slots."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.queue.client import enqueue_message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.meal_plan import (
    CreateMealPlan,
    UpdateMealSlot,
    UpdatePlanStatus,
    UpdateSlotStatus,
)


class MealPlanService:
    """Household-scoped meal plan operations."""

    @staticmethod
    async def create_plan(
        session: AsyncSession,
        household_id: UUID,
        data: CreateMealPlan,
    ) -> MealPlan:
        """Create a draft meal plan and enqueue generation request."""
        plan = MealPlan(
            household_id=household_id,
            week_start_date=data.week_start_date,
            status="draft",
        )
        session.add(plan)
        await session.flush()

        enqueue_message(
            {
                "meal_plan_id": str(plan.id),
                "household_id": str(household_id),
                "week_start_date": data.week_start_date.isoformat(),
            }
        )

        return plan

    @staticmethod
    async def get_plan(
        session: AsyncSession,
        household_id: UUID,
        plan_id: UUID,
    ) -> MealPlan | None:
        """Return a single meal plan with slots, or None if not found."""
        stmt = select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.household_id == household_id,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_active_plan(
        session: AsyncSession,
        household_id: UUID,
    ) -> MealPlan | None:
        """Return the current active meal plan for the household."""
        stmt = select(MealPlan).where(
            MealPlan.household_id == household_id,
            MealPlan.status == "active",
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_slot(
        session: AsyncSession,
        household_id: UUID,
        plan_id: UUID,
        slot_id: UUID,
        data: UpdateMealSlot,
    ) -> MealSlot | None:
        """Update a meal slot's recipe. Returns None if not found."""
        stmt = (
            select(MealSlot)
            .join(MealPlan)
            .where(
                MealSlot.id == slot_id,
                MealSlot.meal_plan_id == plan_id,
                MealPlan.household_id == household_id,
            )
        )
        result = await session.execute(stmt)
        slot = result.scalar_one_or_none()
        if slot is None:
            return None

        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(slot, field, value)
        await session.flush()
        return slot

    @staticmethod
    async def update_slot_status(
        session: AsyncSession,
        household_id: UUID,
        plan_id: UUID,
        slot_id: UUID,
        data: UpdateSlotStatus,
    ) -> MealSlot | None:
        """Mark a slot as cooked/skipped with timestamp."""
        stmt = (
            select(MealSlot)
            .join(MealPlan)
            .where(
                MealSlot.id == slot_id,
                MealSlot.meal_plan_id == plan_id,
                MealPlan.household_id == household_id,
            )
        )
        result = await session.execute(stmt)
        slot = result.scalar_one_or_none()
        if slot is None:
            return None

        slot.status = data.status
        if data.status in ("cooked", "skipped"):
            slot.cooked_at = datetime.now(UTC)
        else:
            slot.cooked_at = None
        await session.flush()
        return slot

    @staticmethod
    async def update_plan_status(
        session: AsyncSession,
        household_id: UUID,
        plan_id: UUID,
        data: UpdatePlanStatus,
    ) -> MealPlan | None:
        """Transition plan status: draft -> active -> completed."""
        stmt = select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.household_id == household_id,
        )
        result = await session.execute(stmt)
        plan = result.scalar_one_or_none()
        if plan is None:
            return None

        plan.status = data.status
        await session.flush()
        return plan
