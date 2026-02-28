"""Inventory CRUD service – scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models.inventory import InventoryItem
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.inventory import CreateInventoryItem, UpdateInventoryItem


class InventoryService:
    """Household-scoped inventory operations."""

    @staticmethod
    async def list_items(
        session: AsyncSession,
        household_id: UUID,
        location: str | None = None,
    ) -> list[InventoryItem]:
        """Return inventory items for a household, expiring-soon first."""
        stmt = (
            select(InventoryItem)
            .options(selectinload(InventoryItem.ingredient))
            .where(InventoryItem.household_id == household_id)
        )
        if location is not None:
            stmt = stmt.where(InventoryItem.location == location)
        # Nulls last so items with expiry dates sort before those without
        stmt = stmt.order_by(InventoryItem.expiry_date.asc().nullslast())
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def add_item(
        session: AsyncSession,
        household_id: UUID,
        data: CreateInventoryItem,
    ) -> InventoryItem:
        """Add a new inventory item to the household."""
        item = InventoryItem(
            household_id=household_id,
            ingredient_id=data.ingredient_id,
            quantity=data.quantity,
            unit=data.unit,
            location=data.location,
            expiry_date=data.expiry_date,
        )
        session.add(item)
        await session.flush()
        # Reload with ingredient relationship
        await session.refresh(item, attribute_names=["ingredient"])
        return item

    @staticmethod
    async def update_item(
        session: AsyncSession,
        household_id: UUID,
        item_id: UUID,
        data: UpdateInventoryItem,
    ) -> InventoryItem | None:
        """Update an existing inventory item. Returns None if not found."""
        stmt = (
            select(InventoryItem)
            .options(selectinload(InventoryItem.ingredient))
            .where(
                InventoryItem.id == item_id,
                InventoryItem.household_id == household_id,
            )
        )
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return None
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(item, field, value)
        await session.flush()
        return item

    @staticmethod
    async def remove_item(
        session: AsyncSession,
        household_id: UUID,
        item_id: UUID,
    ) -> bool:
        """Delete an inventory item. Returns True if deleted."""
        stmt = select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.household_id == household_id,
        )
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return False
        await session.delete(item)
        await session.flush()
        return True
