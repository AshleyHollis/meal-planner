"""Meal history service – query cooked meals."""

from __future__ import annotations

from uuid import UUID

from shared.db.models import MealPlan, MealSlot, MealSlotRating, Recipe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class MealHistoryService:
    """Household-scoped meal history operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def get_history(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> list[dict]:
        """Query cooked meals with recipe and rating data.

        Returns list of dicts with: slot_id, recipe_id, recipe_title,
        cooked_at, day, meal_type, rating (nullable), cuisine_type (nullable).
        """
        offset = (page - 1) * page_size

        stmt = (
            select(MealSlot, Recipe, MealSlotRating.rating)
            .join(MealPlan, MealSlot.meal_plan_id == MealPlan.id)
            .join(Recipe, MealSlot.recipe_id == Recipe.id)
            .outerjoin(MealSlotRating, MealSlot.id == MealSlotRating.meal_slot_id)
            .where(
                MealPlan.household_id == self.household_id,
                MealSlot.status == "cooked",
            )
            .order_by(MealSlot.cooked_at.desc())
            .offset(offset)
            .limit(page_size)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            {
                "slot_id": slot.id,
                "recipe_id": recipe.id,
                "recipe_title": recipe.title,
                "cooked_at": slot.cooked_at,
                "day": slot.day,
                "meal_type": slot.meal_type,
                "rating": rating,
                "cuisine_type": recipe.cuisine_type,
            }
            for slot, recipe, rating in rows
        ]
