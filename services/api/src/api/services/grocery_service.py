"""Grocery list service – build, check, and complete shopping."""

from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from shared.db.models.grocery import GroceryItem, GroceryList
from shared.db.models.inventory import InventoryItem
from shared.db.models.meal_plan import MealPlan
from shared.db.models.product import Product
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class GroceryService:
    """Operations on grocery lists derived from meal plans."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def get_grocery_list(
        self,
        meal_plan_id: UUID,
    ) -> GroceryList | None:
        """Return the grocery list for a meal plan, or None."""
        stmt = select(GroceryList).where(GroceryList.meal_plan_id == meal_plan_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_enriched_grocery_list(
        self,
        meal_plan_id: UUID,
    ) -> tuple[GroceryList | None, dict[UUID, Product]]:
        """Return the grocery list and a lookup of ingredient_id → Product."""
        grocery_list = await self.get_grocery_list(meal_plan_id)
        if grocery_list is None or not grocery_list.items:
            return grocery_list, {}

        ingredient_ids = [item.ingredient_id for item in grocery_list.items]
        products_stmt = select(Product).where(
            Product.household_id == self.household_id,
            Product.ingredient_id.in_(ingredient_ids),
        )
        products_result = await self.session.execute(products_stmt)
        products_lookup: dict[UUID, Product] = {
            p.ingredient_id: p for p in products_result.scalars().all()
        }
        return grocery_list, products_lookup

    async def check_item(
        self,
        item_id: UUID,
    ) -> GroceryItem | None:
        """Mark a grocery item as checked. Returns None if not found."""
        stmt = select(GroceryItem).where(GroceryItem.id == item_id)
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return None
        item.is_checked = True
        await self.session.flush()
        return item

    async def uncheck_item(
        self,
        item_id: UUID,
    ) -> GroceryItem | None:
        """Mark a grocery item as unchecked. Returns None if not found."""
        stmt = select(GroceryItem).where(GroceryItem.id == item_id)
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return None
        item.is_checked = False
        await self.session.flush()
        return item

    async def complete_shopping(
        self,
        grocery_list_id: UUID,
        purchased_items: list[dict],
    ) -> list[InventoryItem]:
        """Add purchased items to inventory with optional expiry dates.

        Each dict in *purchased_items* must contain:
            ingredient_id, quantity, unit
        and may optionally contain:
            expiry_date (datetime), location (str, defaults to "pantry")
        """
        created: list[InventoryItem] = []
        for entry in purchased_items:
            inv = InventoryItem(
                household_id=self.household_id,
                ingredient_id=entry["ingredient_id"],
                quantity=entry["quantity"],
                unit=entry["unit"],
                location=entry.get("location", "pantry"),
                expiry_date=entry.get("expiry_date"),
            )
            self.session.add(inv)
            created.append(inv)
        await self.session.flush()
        # Reload ingredient relationship for response serialization
        for inv in created:
            await self.session.refresh(inv, attribute_names=["ingredient"])
        return created

    async def regenerate_grocery_list(
        self,
        meal_plan_id: UUID,
    ) -> GroceryList:
        """Recalculate grocery list from plan recipes minus inventory.

        Aggregates all recipe ingredients across the meal plan's slots,
        subtracts quantities already in the household inventory, and
        replaces any existing grocery list for this plan.
        """
        # 1. Load meal plan with slots -> recipes -> ingredients
        plan_stmt = (
            select(MealPlan)
            .options(
                selectinload(MealPlan.slots),
            )
            .where(
                MealPlan.id == meal_plan_id,
                MealPlan.household_id == self.household_id,
            )
        )
        plan_result = await self.session.execute(plan_stmt)
        plan = plan_result.scalar_one()

        # 2. Aggregate needed ingredients: (ingredient_id, unit) -> qty
        needed: dict[tuple[UUID, str], float] = defaultdict(float)
        for slot in plan.slots:
            if slot.recipe is None:
                continue
            for ri in slot.recipe.ingredients:
                if ri.is_optional:
                    continue
                needed[(ri.ingredient_id, ri.unit)] += ri.quantity

        # 3. Load current inventory for household
        inv_stmt = select(InventoryItem).where(InventoryItem.household_id == self.household_id)
        inv_result = await self.session.execute(inv_stmt)
        inventory_items = inv_result.scalars().all()

        # Build inventory lookup: (ingredient_id, unit) -> total qty
        on_hand: dict[tuple[UUID, str], float] = defaultdict(float)
        for inv in inventory_items:
            on_hand[(inv.ingredient_id, inv.unit)] += inv.quantity

        # 4. Subtract inventory from needed
        grocery_entries: list[tuple[UUID, float, str]] = []
        for (ing_id, unit), qty in needed.items():
            remaining = qty - on_hand.get((ing_id, unit), 0.0)
            if remaining > 0:
                grocery_entries.append((ing_id, remaining, unit))

        # 5. Remove existing grocery list if present
        existing_stmt = select(GroceryList).where(GroceryList.meal_plan_id == meal_plan_id)
        existing_result = await self.session.execute(existing_stmt)
        existing = existing_result.scalar_one_or_none()
        if existing is not None:
            await self.session.delete(existing)
            await self.session.flush()

        # 6. Create new grocery list with items
        grocery_list = GroceryList(meal_plan_id=meal_plan_id)
        grocery_list.items = [
            GroceryItem(
                ingredient_id=ing_id,
                quantity_needed=qty,
                unit=unit,
            )
            for ing_id, qty, unit in grocery_entries
        ]
        self.session.add(grocery_list)
        await self.session.flush()
        return grocery_list
