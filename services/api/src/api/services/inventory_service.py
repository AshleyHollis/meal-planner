"""Inventory CRUD service – scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models.inventory import InventoryItem
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.inventory import CreateInventoryItem, UpdateInventoryItem


class InventoryService:
    """Household-scoped inventory operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def list_items(
        self,
        location: str | None = None,
    ) -> list[InventoryItem]:
        """Return inventory items for a household, expiring-soon first."""
        stmt = (
            select(InventoryItem)
            .options(selectinload(InventoryItem.ingredient))
            .where(InventoryItem.household_id == self.household_id)
        )
        if location is not None:
            stmt = stmt.where(InventoryItem.location == location)
        # Nulls last so items with expiry dates sort before those without
        # SQL Server doesn't support NULLS LAST, use CASE expression instead
        stmt = stmt.order_by(
            case((InventoryItem.expiry_date.is_(None), 1), else_=0),
            InventoryItem.expiry_date.asc(),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add_item(
        self,
        data: CreateInventoryItem,
    ) -> InventoryItem:
        """Add a new inventory item to the household."""
        item = InventoryItem(
            household_id=self.household_id,
            ingredient_id=data.ingredient_id,
            quantity=data.quantity,
            unit=data.unit,
            location=data.location,
            expiry_date=data.expiry_date,
        )
        self.session.add(item)
        await self.session.flush()
        # Reload with ingredient relationship
        await self.session.refresh(item, attribute_names=["ingredient"])
        return item

    async def update_item(
        self,
        item_id: UUID,
        data: UpdateInventoryItem,
    ) -> InventoryItem | None:
        """Update an existing inventory item. Returns None if not found."""
        stmt = (
            select(InventoryItem)
            .options(selectinload(InventoryItem.ingredient))
            .where(
                InventoryItem.id == item_id,
                InventoryItem.household_id == self.household_id,
            )
        )
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return None
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(item, field, value)
        await self.session.flush()
        return item

    async def remove_item(
        self,
        item_id: UUID,
    ) -> bool:
        """Delete an inventory item. Returns True if deleted."""
        stmt = select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return False
        await self.session.delete(item)
        await self.session.flush()
        return True
