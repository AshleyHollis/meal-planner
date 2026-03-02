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
            defrost_hours=data.defrost_hours,
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

    async def deduct_for_recipe(self, recipe_id: UUID) -> list[dict]:
        """Deduct recipe ingredient quantities from household inventory.
        
        Returns a list of deduction results, one per recipe ingredient.
        """
        from shared.db.models.recipe import RecipeIngredient
        
        # Load recipe with ingredients
        stmt = (
            select(RecipeIngredient)
            .options(selectinload(RecipeIngredient.ingredient))
            .where(RecipeIngredient.recipe_id == recipe_id)
        )
        result = await self.session.execute(stmt)
        recipe_ingredients = list(result.scalars().all())
        
        deductions = []
        for ri in recipe_ingredients:
            if ri.is_optional:
                continue
            
            # Find matching inventory item
            inv_stmt = select(InventoryItem).where(
                InventoryItem.household_id == self.household_id,
                InventoryItem.ingredient_id == ri.ingredient_id,
            )
            inv_result = await self.session.execute(inv_stmt)
            inv_items = list(inv_result.scalars().all())
            
            ingredient_name = ri.ingredient.name if ri.ingredient else "Unknown"
            
            if not inv_items:
                deductions.append({
                    "ingredient_id": str(ri.ingredient_id),
                    "ingredient_name": ingredient_name,
                    "requested": ri.quantity,
                    "deducted": 0.0,
                    "remaining": 0.0,
                    "unit": ri.unit,
                    "unit_mismatch": False,
                })
                continue
            
            # Sum matching inventory (same unit)
            matching = [i for i in inv_items if i.unit == ri.unit]
            if not matching:
                deductions.append({
                    "ingredient_id": str(ri.ingredient_id),
                    "ingredient_name": ingredient_name,
                    "requested": ri.quantity,
                    "deducted": 0.0,
                    "remaining": sum(i.quantity for i in inv_items),
                    "unit": ri.unit,
                    "unit_mismatch": True,
                })
                continue
            
            # Deduct from matching items (oldest expiry first)
            remaining_to_deduct = ri.quantity
            total_deducted = 0.0
            for inv_item in sorted(matching, key=lambda x: (x.expiry_date is None, x.expiry_date)):
                if remaining_to_deduct <= 0:
                    break
                deduct_amount = min(remaining_to_deduct, inv_item.quantity)
                inv_item.quantity -= deduct_amount
                remaining_to_deduct -= deduct_amount
                total_deducted += deduct_amount
                if inv_item.quantity <= 0:
                    await self.session.delete(inv_item)
            
            await self.session.flush()
            
            remaining_qty = sum(i.quantity for i in matching if i.quantity > 0)
            deductions.append({
                "ingredient_id": str(ri.ingredient_id),
                "ingredient_name": ingredient_name,
                "requested": ri.quantity,
                "deducted": total_deducted,
                "remaining": remaining_qty,
                "unit": ri.unit,
                "unit_mismatch": False,
            })
        
        return deductions
