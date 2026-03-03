"""Service layer for leftover management."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from shared.db.models.leftover import Leftover
from shared.db.models.meal_plan import MealPlan, MealSlot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.leftover import CreateLeftover


class LeftoverService:
    """Service for managing leftovers."""

    def __init__(self, session: AsyncSession, household_id: UUID):
        self.session = session
        self.household_id = household_id

    async def create_leftover(self, slot_id: UUID, data: CreateLeftover) -> Leftover:
        """Create a leftover from a cooked meal slot."""
        # Validate slot exists and is cooked
        stmt = (
            select(MealSlot)
            .join(MealPlan)
            .where(
                MealSlot.id == slot_id,
                MealPlan.household_id == self.household_id,
                MealSlot.status == "cooked",
            )
        )
        result = await self.session.execute(stmt)
        slot = result.scalar_one_or_none()

        if slot is None:
            raise HTTPException(
                status_code=400,
                detail="Slot not found or not in cooked status",
            )

        # Create leftover
        leftover = Leftover(
            meal_slot_id=slot_id,
            recipe_id=slot.recipe_id,
            household_id=self.household_id,
            portions=data.portions,
            storage_location=data.storage_location,
            expiry_date=data.expiry_date,
        )
        self.session.add(leftover)
        await self.session.flush()
        await self.session.refresh(leftover)
        return leftover

    async def list_leftovers(self, include_used: bool = False) -> list[Leftover]:
        """List leftovers for this household."""
        stmt = select(Leftover).where(Leftover.household_id == self.household_id)

        if not include_used:
            stmt = stmt.where(Leftover.used_at.is_(None))

        stmt = stmt.order_by(Leftover.expiry_date.asc())

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def mark_used(self, leftover_id: UUID) -> Leftover | None:
        """Mark a leftover as used."""
        stmt = select(Leftover).where(
            Leftover.id == leftover_id,
            Leftover.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        leftover = result.scalar_one_or_none()

        if leftover is None:
            return None

        leftover.used_at = datetime.now(UTC)
        await self.session.flush()
        return leftover
