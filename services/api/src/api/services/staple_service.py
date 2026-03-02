"""Service layer for staple ingredient management."""

from __future__ import annotations

from uuid import UUID

from shared.db.models.inventory import InventoryItem
from shared.db.models.staple_ingredient import StapleIngredient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.staple import CreateStaple


class StapleService:
    """Service for managing staple ingredients."""

    def __init__(self, session: AsyncSession, household_id: UUID):
        self.session = session
        self.household_id = household_id

    async def add_staple(self, data: CreateStaple) -> StapleIngredient:
        """Add a staple ingredient."""
        staple = StapleIngredient(
            household_id=self.household_id,
            ingredient_id=data.ingredient_id,
            min_threshold=data.min_threshold,
            unit=data.unit,
        )
        self.session.add(staple)
        await self.session.flush()
        await self.session.refresh(staple)
        return staple

    async def remove_staple(self, staple_id: UUID) -> bool:
        """Remove a staple ingredient."""
        stmt = select(StapleIngredient).where(
            StapleIngredient.id == staple_id,
            StapleIngredient.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        staple = result.scalar_one_or_none()

        if staple is None:
            return False

        await self.session.delete(staple)
        await self.session.flush()
        return True

    async def list_staples(self) -> list[StapleIngredient]:
        """List all staples for this household."""
        stmt = select(StapleIngredient).where(
            StapleIngredient.household_id == self.household_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_suggestions(self) -> list[dict]:
        """Get shopping suggestions for staples below threshold."""
        # Get all staples with ingredient info
        stmt = (
            select(StapleIngredient)
            .options(selectinload(StapleIngredient.ingredient))
            .where(StapleIngredient.household_id == self.household_id)
        )
        result = await self.session.execute(stmt)
        staples = list(result.scalars().all())

        suggestions = []
        for staple in staples:
            # Sum matching inventory (same ingredient, same unit)
            inv_stmt = select(InventoryItem).where(
                InventoryItem.household_id == self.household_id,
                InventoryItem.ingredient_id == staple.ingredient_id,
                InventoryItem.unit == staple.unit,
            )
            inv_result = await self.session.execute(inv_stmt)
            inv_items = list(inv_result.scalars().all())

            current_qty = sum(item.quantity for item in inv_items)
            shortfall = max(0, staple.min_threshold - current_qty)

            if shortfall > 0:
                suggestions.append(
                    {
                        "ingredient_id": staple.ingredient_id,
                        "ingredient_name": (
                            staple.ingredient.name if staple.ingredient else "Unknown"
                        ),
                        "current_qty": current_qty,
                        "min_threshold": staple.min_threshold,
                        "quantity_needed": shortfall,
                        "unit": staple.unit,
                    }
                )

        return suggestions
