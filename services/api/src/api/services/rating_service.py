"""Rating service – scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models import HouseholdMember, MealPlan, MealSlot, MealSlotRating
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.rating import CreateMealSlotRating


class RatingService:
    """Household-scoped rating operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def submit_rating(
        self,
        plan_id: UUID,
        slot_id: UUID,
        member_id: UUID,
        data: CreateMealSlotRating,
    ) -> MealSlotRating:
        """Submit or update a rating for a cooked meal slot.

        Validates:
        - Plan belongs to household
        - Slot belongs to plan
        - Slot status is "cooked"
        - Member belongs to household

        Returns the created or updated rating.
        Raises ValueError if validation fails.
        """
        # Verify plan belongs to household
        plan_stmt = select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.household_id == self.household_id,
        )
        plan_result = await self.session.execute(plan_stmt)
        plan = plan_result.scalar_one_or_none()
        if plan is None:
            raise ValueError("Plan not found or does not belong to household")

        # Verify slot belongs to plan and is cooked
        slot_stmt = select(MealSlot).where(
            MealSlot.id == slot_id,
            MealSlot.meal_plan_id == plan_id,
        )
        slot_result = await self.session.execute(slot_stmt)
        slot = slot_result.scalar_one_or_none()
        if slot is None:
            raise ValueError("Slot not found or does not belong to plan")
        if slot.status != "cooked":
            raise ValueError("Slot must be cooked before rating")

        # Verify member belongs to household
        member_stmt = select(HouseholdMember).where(
            HouseholdMember.id == member_id,
            HouseholdMember.household_id == self.household_id,
        )
        member_result = await self.session.execute(member_stmt)
        member = member_result.scalar_one_or_none()
        if member is None:
            raise ValueError("Member not found or does not belong to household")

        # Check for existing rating
        existing_stmt = select(MealSlotRating).where(
            MealSlotRating.meal_slot_id == slot_id,
            MealSlotRating.rated_by == member_id,
        )
        existing_result = await self.session.execute(existing_stmt)
        existing = existing_result.scalar_one_or_none()

        if existing:
            # Update existing rating
            existing.rating = data.rating
            existing.feedback = data.feedback
            await self.session.flush()
            return existing
        else:
            # Create new rating
            rating = MealSlotRating(
                meal_slot_id=slot_id,
                rated_by=member_id,
                rating=data.rating,
                feedback=data.feedback,
            )
            self.session.add(rating)
            await self.session.flush()
            return rating

    async def get_rating(
        self,
        plan_id: UUID,
        slot_id: UUID,
        member_id: UUID,
    ) -> MealSlotRating | None:
        """Get a rating for a slot by a specific member.

        Validates:
        - Plan belongs to household
        - Slot belongs to plan
        - Member belongs to household

        Returns the rating or None if not found.
        Raises ValueError if validation fails.
        """
        # Verify plan belongs to household
        plan_stmt = select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.household_id == self.household_id,
        )
        plan_result = await self.session.execute(plan_stmt)
        plan = plan_result.scalar_one_or_none()
        if plan is None:
            raise ValueError("Plan not found or does not belong to household")

        # Verify slot belongs to plan
        slot_stmt = select(MealSlot).where(
            MealSlot.id == slot_id,
            MealSlot.meal_plan_id == plan_id,
        )
        slot_result = await self.session.execute(slot_stmt)
        slot = slot_result.scalar_one_or_none()
        if slot is None:
            raise ValueError("Slot not found or does not belong to plan")

        # Verify member belongs to household
        member_stmt = select(HouseholdMember).where(
            HouseholdMember.id == member_id,
            HouseholdMember.household_id == self.household_id,
        )
        member_result = await self.session.execute(member_stmt)
        member = member_result.scalar_one_or_none()
        if member is None:
            raise ValueError("Member not found or does not belong to household")

        # Get rating
        rating_stmt = select(MealSlotRating).where(
            MealSlotRating.meal_slot_id == slot_id,
            MealSlotRating.rated_by == member_id,
        )
        rating_result = await self.session.execute(rating_stmt)
        return rating_result.scalar_one_or_none()
