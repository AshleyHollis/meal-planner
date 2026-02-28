"""Unit tests for GroceryService – grocery math, consolidation, check-off."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from shared.db.models.grocery import GroceryItem, GroceryList
from shared.db.models.ingredient import Ingredient
from shared.db.models.inventory import InventoryItem
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe, RecipeIngredient
from sqlalchemy.ext.asyncio import AsyncSession

from api.services.grocery_service import GroceryService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

NOW = datetime.now(UTC)


async def _make_ingredient(
    session: AsyncSession, name: str, unit: str = "g", category: str = "meat"
) -> Ingredient:
    ing = Ingredient(
        id=uuid4(),
        name=name,
        category=category,
        default_unit=unit,
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(ing)
    await session.flush()
    return ing


async def _make_recipe(
    session: AsyncSession,
    title: str,
    ingredients: list[tuple[Ingredient, float, str]],
) -> Recipe:
    """Create a recipe with the given ingredient list.

    Each tuple is (Ingredient, quantity, unit).
    """
    recipe = Recipe(
        id=uuid4(),
        title=title,
        servings=2,
        is_ai_generated=False,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(recipe)
    await session.flush()

    for ing, qty, unit in ingredients:
        ri = RecipeIngredient(
            id=uuid4(),
            recipe_id=recipe.id,
            ingredient_id=ing.id,
            quantity=qty,
            unit=unit,
            is_optional=False,
        )
        session.add(ri)
    await session.flush()

    # Refresh to load the selectin relationships
    await session.refresh(recipe, ["ingredients"])
    return recipe


async def _make_plan_with_slots(
    session: AsyncSession,
    household_id,
    recipes: list[Recipe],
) -> MealPlan:
    """Create a meal plan with one slot per recipe (day 0,1,2...)."""
    plan = MealPlan(
        id=uuid4(),
        household_id=household_id,
        week_start_date=NOW,
        status="ready",
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(plan)
    await session.flush()

    for i, recipe in enumerate(recipes):
        slot = MealSlot(
            id=uuid4(),
            meal_plan_id=plan.id,
            recipe_id=recipe.id,
            day=i,
            meal_type="dinner",
            status="planned",
            created_at=NOW,
            updated_at=NOW,
        )
        session.add(slot)
    await session.flush()

    await session.refresh(plan, ["slots"])
    return plan


async def _add_inventory(
    session: AsyncSession,
    household_id,
    ingredient: Ingredient,
    quantity: float,
    unit: str,
) -> InventoryItem:
    inv = InventoryItem(
        id=uuid4(),
        household_id=household_id,
        ingredient_id=ingredient.id,
        quantity=quantity,
        unit=unit,
        location="fridge",
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(inv)
    await session.flush()
    return inv


# ---------------------------------------------------------------------------
# Grocery list = plan needs minus inventory
# ---------------------------------------------------------------------------


class TestGrocerySubtraction:
    async def test_full_inventory_yields_empty_list(
        self, session: AsyncSession, household
    ):
        """If inventory covers everything, grocery list has zero items."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe = await _make_recipe(session, "Grilled Chicken", [(chicken, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        # Inventory fully covers the recipe
        await _add_inventory(session, household.id, chicken, 500, "g")

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        assert len(gl.items) == 0

    async def test_no_inventory_yields_full_list(
        self, session: AsyncSession, household
    ):
        """With no inventory, grocery list matches recipe needs exactly."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe = await _make_recipe(session, "Grilled Chicken", [(chicken, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        assert len(gl.items) == 1
        assert float(gl.items[0].quantity_needed) == 500.0
        assert gl.items[0].ingredient_id == chicken.id

    async def test_excess_inventory_yields_empty_list(
        self, session: AsyncSession, household
    ):
        """More inventory than needed still yields zero grocery items."""
        rice = await _make_ingredient(session, "Rice", "g", "grain")
        recipe = await _make_recipe(session, "Plain Rice", [(rice, 300, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        await _add_inventory(session, household.id, rice, 1000, "g")

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        assert len(gl.items) == 0


# ---------------------------------------------------------------------------
# Consolidation of same ingredient across meals
# ---------------------------------------------------------------------------


class TestConsolidation:
    async def test_same_ingredient_across_two_meals_consolidated(
        self, session: AsyncSession, household
    ):
        """Two meals using the same ingredient -> one grocery item with summed qty."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe_a = await _make_recipe(session, "Grilled Chicken", [(chicken, 300, "g")])
        recipe_b = await _make_recipe(session, "Chicken Stir Fry", [(chicken, 200, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe_a, recipe_b])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)

        assert len(gl.items) == 1
        assert float(gl.items[0].quantity_needed) == 500.0
        assert gl.items[0].ingredient_id == chicken.id

    async def test_different_ingredients_separate_items(
        self, session: AsyncSession, household
    ):
        """Two recipes with different ingredients -> two grocery items."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        rice = await _make_ingredient(session, "Rice", "g", "grain")
        recipe = await _make_recipe(
            session, "Chicken Rice", [(chicken, 400, "g"), (rice, 200, "g")]
        )
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)

        assert len(gl.items) == 2
        items_by_id = {item.ingredient_id: item for item in gl.items}
        assert float(items_by_id[chicken.id].quantity_needed) == 400.0
        assert float(items_by_id[rice.id].quantity_needed) == 200.0

    async def test_optional_ingredients_excluded(
        self, session: AsyncSession, household
    ):
        """Optional recipe ingredients should NOT appear on grocery list."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        garnish = await _make_ingredient(session, "Parsley", "g", "produce")

        recipe = Recipe(
            id=uuid4(),
            title="Chicken with optional garnish",
            servings=2,
            is_ai_generated=False,
            created_at=NOW,
            updated_at=NOW,
        )
        session.add(recipe)
        await session.flush()

        # Required ingredient
        ri1 = RecipeIngredient(
            id=uuid4(),
            recipe_id=recipe.id,
            ingredient_id=chicken.id,
            quantity=500,
            unit="g",
            is_optional=False,
        )
        # Optional ingredient
        ri2 = RecipeIngredient(
            id=uuid4(),
            recipe_id=recipe.id,
            ingredient_id=garnish.id,
            quantity=10,
            unit="g",
            is_optional=True,
        )
        session.add_all([ri1, ri2])
        await session.flush()
        await session.refresh(recipe, ["ingredients"])

        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)

        assert len(gl.items) == 1
        assert gl.items[0].ingredient_id == chicken.id


# ---------------------------------------------------------------------------
# Partial inventory subtraction
# ---------------------------------------------------------------------------


class TestPartialInventory:
    async def test_partial_stock_yields_remainder(
        self, session: AsyncSession, household
    ):
        """500g needed, 200g in stock -> 300g on grocery list."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe = await _make_recipe(session, "Grilled Chicken", [(chicken, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        await _add_inventory(session, household.id, chicken, 200, "g")

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        assert len(gl.items) == 1
        assert float(gl.items[0].quantity_needed) == 300.0

    async def test_multiple_inventory_entries_summed(
        self, session: AsyncSession, household
    ):
        """Two inventory entries for same ingredient are summed before subtraction."""
        rice = await _make_ingredient(session, "Rice", "g", "grain")
        recipe = await _make_recipe(session, "Rice Bowl", [(rice, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        # Two separate inventory entries: 150 + 150 = 300 on hand
        await _add_inventory(session, household.id, rice, 150, "g")
        await _add_inventory(session, household.id, rice, 150, "g")

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        assert len(gl.items) == 1
        assert float(gl.items[0].quantity_needed) == 200.0

    async def test_mixed_covered_and_partial(
        self, session: AsyncSession, household
    ):
        """One ingredient fully covered, another partially -> only partial on list."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        rice = await _make_ingredient(session, "Rice", "g", "grain")
        recipe = await _make_recipe(
            session, "Chicken Rice", [(chicken, 400, "g"), (rice, 300, "g")]
        )
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        # Chicken fully covered, rice partially
        await _add_inventory(session, household.id, chicken, 500, "g")
        await _add_inventory(session, household.id, rice, 100, "g")

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        assert len(gl.items) == 1
        assert gl.items[0].ingredient_id == rice.id
        assert float(gl.items[0].quantity_needed) == 200.0


# ---------------------------------------------------------------------------
# Check-off persistence and shopping complete flow
# ---------------------------------------------------------------------------


class TestCheckOff:
    async def test_check_item_persists(
        self, session: AsyncSession, household
    ):
        """Checking off a grocery item sets is_checked=True."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe = await _make_recipe(session, "Grilled Chicken", [(chicken, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        item = gl.items[0]
        assert item.is_checked is False

        checked = await svc.check_item(item.id)
        assert checked is not None
        assert checked.is_checked is True

    async def test_uncheck_item_persists(
        self, session: AsyncSession, household
    ):
        """Unchecking a grocery item sets is_checked=False."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe = await _make_recipe(session, "Grilled Chicken", [(chicken, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)
        item = gl.items[0]

        await svc.check_item(item.id)
        unchecked = await svc.uncheck_item(item.id)
        assert unchecked is not None
        assert unchecked.is_checked is False

    async def test_check_nonexistent_returns_none(
        self, session: AsyncSession, household
    ):
        svc = GroceryService(session, household.id)
        result = await svc.check_item(uuid4())
        assert result is None

    async def test_uncheck_nonexistent_returns_none(
        self, session: AsyncSession, household
    ):
        svc = GroceryService(session, household.id)
        result = await svc.uncheck_item(uuid4())
        assert result is None


class TestShoppingComplete:
    async def test_complete_shopping_adds_to_inventory(
        self, session: AsyncSession, household
    ):
        """Completing shopping creates InventoryItem records."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe = await _make_recipe(session, "Grilled Chicken", [(chicken, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)

        purchased = [
            {
                "ingredient_id": chicken.id,
                "quantity": 500,
                "unit": "g",
            }
        ]
        created = await svc.complete_shopping(gl.id, purchased)
        assert len(created) == 1
        assert created[0].ingredient_id == chicken.id
        assert created[0].quantity == 500
        assert created[0].unit == "g"
        assert created[0].location == "pantry"  # default
        assert created[0].household_id == household.id

    async def test_complete_shopping_with_location_and_expiry(
        self, session: AsyncSession, household
    ):
        """Purchased items can specify location and expiry_date."""
        milk = await _make_ingredient(session, "Milk", "ml", "dairy")
        recipe = await _make_recipe(session, "Cereal", [(milk, 500, "ml")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl = await svc.regenerate_grocery_list(plan.id)

        expiry = datetime(2026, 3, 15, tzinfo=UTC)
        purchased = [
            {
                "ingredient_id": milk.id,
                "quantity": 1000,
                "unit": "ml",
                "location": "fridge",
                "expiry_date": expiry,
            }
        ]
        created = await svc.complete_shopping(gl.id, purchased)
        assert len(created) == 1
        assert created[0].location == "fridge"
        assert created[0].expiry_date == expiry


class TestRegenerateReplacesExisting:
    async def test_regenerate_replaces_previous_list(
        self, session: AsyncSession, household
    ):
        """Calling regenerate twice replaces the first list."""
        chicken = await _make_ingredient(session, "Chicken Breast")
        recipe = await _make_recipe(session, "Grilled Chicken", [(chicken, 500, "g")])
        plan = await _make_plan_with_slots(session, household.id, [recipe])

        svc = GroceryService(session, household.id)
        gl1 = await svc.regenerate_grocery_list(plan.id)
        first_id = gl1.id

        # Add inventory so second generation is different
        await _add_inventory(session, household.id, chicken, 200, "g")
        gl2 = await svc.regenerate_grocery_list(plan.id)

        assert gl2.id != first_id
        assert len(gl2.items) == 1
        assert float(gl2.items[0].quantity_needed) == 300.0

        # Verify old list was removed
        old = await svc.get_grocery_list(plan.id)
        assert old is not None
        assert old.id == gl2.id
