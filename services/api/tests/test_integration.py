"""Integration test: full API lifecycle with mock LLM/worker.

Flow: add inventory -> generate plan (mock enqueue) -> simulate worker
output (seed DB) -> view grocery list -> check items -> complete shopping
-> verify inventory updated.

Uses a custom client fixture with a shared connection so that data written
by one HTTP request is visible to subsequent requests within the same test.
"""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from shared.db.models.base import Base
from shared.db.models.grocery import GroceryItem, GroceryList
from shared.db.models.household import Household, HouseholdMember
from shared.db.models.ingredient import Ingredient
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe, RecipeIngredient, RecipeStep
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

NOW = datetime.now(UTC)
_HOUSEHOLD_ID = uuid4()
_USER_SUB = "auth0|integration-user"


# ---------------------------------------------------------------------------
# Custom fixtures: shared-connection engine so cross-request data is visible
# ---------------------------------------------------------------------------


@pytest.fixture()
async def _int_engine():
    """In-memory SQLite engine with StaticPool (single shared connection)."""
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(eng.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        dbapi_conn.create_function("sysutcdatetime", 0, lambda: datetime.now(UTC).isoformat())

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest.fixture()
async def _int_session(_int_engine) -> AsyncGenerator[AsyncSession, None]:
    """Session bound to the shared engine. Rolls back after test."""
    factory = async_sessionmaker(_int_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as sess:
        yield sess
        await sess.rollback()


@pytest.fixture()
async def _int_household(_int_session: AsyncSession) -> Household:
    """Seed household + member for integration test."""
    hh = Household(
        id=_HOUSEHOLD_ID,
        name="Integration Household",
        default_servings=2,
        created_at=NOW,
        updated_at=NOW,
    )
    _int_session.add(hh)
    await _int_session.flush()
    _int_session.add(
        HouseholdMember(
            id=uuid4(),
            household_id=hh.id,
            auth0_user_id=_USER_SUB,
            display_name="Integration User",
            role="owner",
            created_at=NOW,
            updated_at=NOW,
        )
    )
    await _int_session.flush()
    return hh


@pytest.fixture()
async def int_client(_int_engine, _int_household) -> AsyncGenerator[AsyncClient, None]:
    """HTTPX client with shared-connection session override."""
    from api.main import create_app
    from api.middleware.auth import get_current_household_id, get_current_user
    from shared.db.connection import get_session

    app = create_app()
    factory = async_sessionmaker(_int_engine, class_=AsyncSession, expire_on_commit=False)

    async def _override_session() -> AsyncGenerator[AsyncSession, None]:
        async with factory() as sess:
            yield sess
            # Commit so subsequent requests see this request's writes
            await sess.commit()

    async def _override_user() -> dict:
        return {"sub": _USER_SUB, "name": "Integration User"}

    async def _override_household_id() -> UUID:
        return _HOUSEHOLD_ID

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_household_id] = _override_household_id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _next_monday() -> str:
    """Return next Monday as ISO string (required by CreateMealPlan validator)."""
    from datetime import timedelta

    now = datetime.now(UTC)
    days_ahead = (7 - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    monday = (now + timedelta(days=days_ahead)).replace(hour=0, minute=0, second=0, microsecond=0)
    return monday.isoformat()


async def _seed_ingredients(session: AsyncSession) -> dict[str, Ingredient]:
    """Create three ingredients for the test recipes."""
    ingredients = {}
    for name, cat, unit, storage in [
        ("Chicken Breast", "meat", "g", "fridge"),
        ("Jasmine Rice", "grain", "g", "pantry"),
        ("Broccoli", "produce", "g", "fridge"),
    ]:
        ing = Ingredient(
            id=uuid4(),
            name=name,
            category=cat,
            default_unit=unit,
            default_storage=storage,
            typical_shelf_life_days=3,
            created_at=NOW,
            updated_at=NOW,
        )
        session.add(ing)
        ingredients[name] = ing
    await session.flush()
    await session.commit()
    return ingredients


async def _simulate_worker_output(
    session: AsyncSession,
    plan_id: UUID,
    household_id: UUID,
    ingredients: dict[str, Ingredient],
) -> None:
    """Simulate what the worker would do: create recipes, slots, grocery list.

    Creates two recipes using the seeded ingredients and attaches them
    to the meal plan as meal slots.  Also creates a grocery list with
    the aggregated ingredient needs.
    """
    chicken = ingredients["Chicken Breast"]
    rice = ingredients["Jasmine Rice"]
    broccoli = ingredients["Broccoli"]

    # Recipe 1: Chicken Rice Bowl (day 0)
    recipe1 = Recipe(
        id=uuid4(),
        household_id=household_id,
        title="Chicken Rice Bowl",
        description="Simple chicken and rice",
        servings=2,
        prep_time_min=10,
        cook_time_min=25,
        is_ai_generated=True,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(recipe1)
    await session.flush()

    for ing, qty, unit in [
        (chicken, 500.0, "g"),
        (rice, 300.0, "g"),
    ]:
        session.add(
            RecipeIngredient(
                id=uuid4(),
                recipe_id=recipe1.id,
                ingredient_id=ing.id,
                quantity=qty,
                unit=unit,
                is_optional=False,
            )
        )

    session.add(
        RecipeStep(
            id=uuid4(),
            recipe_id=recipe1.id,
            step_order=1,
            instruction="Cook rice according to package directions",
            duration_min=20,
        )
    )
    session.add(
        RecipeStep(
            id=uuid4(),
            recipe_id=recipe1.id,
            step_order=2,
            instruction="Grill chicken breast until internal temp reaches 74C",
            duration_min=15,
        )
    )

    # Recipe 2: Broccoli Stir Fry (day 1)
    recipe2 = Recipe(
        id=uuid4(),
        household_id=household_id,
        title="Broccoli Stir Fry",
        description="Quick veggie stir fry with chicken",
        servings=2,
        prep_time_min=5,
        cook_time_min=10,
        is_ai_generated=True,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(recipe2)
    await session.flush()

    for ing, qty, unit in [
        (chicken, 300.0, "g"),
        (broccoli, 400.0, "g"),
    ]:
        session.add(
            RecipeIngredient(
                id=uuid4(),
                recipe_id=recipe2.id,
                ingredient_id=ing.id,
                quantity=qty,
                unit=unit,
                is_optional=False,
            )
        )

    session.add(
        RecipeStep(
            id=uuid4(),
            recipe_id=recipe2.id,
            step_order=1,
            instruction="Slice chicken and broccoli, stir fry on high heat",
            duration_min=10,
        )
    )
    await session.flush()

    # Create meal slots
    from sqlalchemy import update

    for i, recipe in enumerate([recipe1, recipe2]):
        session.add(
            MealSlot(
                id=uuid4(),
                meal_plan_id=plan_id,
                recipe_id=recipe.id,
                day=i,
                meal_type="dinner",
                status="planned",
                created_at=NOW,
                updated_at=NOW,
            )
        )
    await session.flush()

    # Activate the plan
    await session.execute(update(MealPlan).where(MealPlan.id == plan_id).values(status="active"))
    await session.flush()

    # Create grocery list
    # Total needs: chicken 800g, rice 300g, broccoli 400g
    grocery_list = GroceryList(
        id=uuid4(),
        meal_plan_id=plan_id,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(grocery_list)
    await session.flush()

    for ing, qty, unit in [
        (chicken, 800.0, "g"),
        (rice, 300.0, "g"),
        (broccoli, 400.0, "g"),
    ]:
        session.add(
            GroceryItem(
                id=uuid4(),
                grocery_list_id=grocery_list.id,
                ingredient_id=ing.id,
                quantity_needed=qty,
                unit=unit,
                is_checked=False,
                created_at=NOW,
                updated_at=NOW,
            )
        )
    await session.flush()
    await session.commit()


# ---------------------------------------------------------------------------
# Full lifecycle integration test
# ---------------------------------------------------------------------------


class TestFullLifecycle:
    """End-to-end API lifecycle: inventory -> plan -> grocery -> shop."""

    @patch("api.services.meal_plan_service.enqueue_message")
    async def test_full_lifecycle(
        self,
        mock_enqueue,
        int_client: AsyncClient,
        _int_session: AsyncSession,
        _int_household,
    ):
        # ---------------------------------------------------------------
        # Step 1: Seed ingredients (reference data)
        # ---------------------------------------------------------------
        ingredients = await _seed_ingredients(_int_session)
        chicken = ingredients["Chicken Breast"]
        rice = ingredients["Jasmine Rice"]
        broccoli = ingredients["Broccoli"]

        # ---------------------------------------------------------------
        # Step 2: Add inventory via API (200g chicken on hand)
        # ---------------------------------------------------------------
        inv_resp = await int_client.post(
            "/api/v1/inventory",
            json={
                "ingredient_id": str(chicken.id),
                "quantity": 200,
                "unit": "g",
                "location": "fridge",
            },
        )
        assert inv_resp.status_code == 201
        inv_data = inv_resp.json()
        assert inv_data["quantity"] == 200
        assert inv_data["ingredient"]["name"] == "Chicken Breast"

        # Verify inventory visible via GET
        list_resp = await int_client.get("/api/v1/inventory")
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1

        # ---------------------------------------------------------------
        # Step 3: Create meal plan via API (mock enqueue)
        # ---------------------------------------------------------------
        plan_resp = await int_client.post(
            "/api/v1/meal-plans",
            json={"week_start_date": _next_monday()},
        )
        assert plan_resp.status_code == 202
        plan_data = plan_resp.json()
        plan_id = plan_data["id"]
        assert plan_data["status"] == "draft"
        mock_enqueue.assert_called_once()

        # ---------------------------------------------------------------
        # Step 4: Simulate worker output (seed recipes, slots, grocery)
        # ---------------------------------------------------------------
        await _simulate_worker_output(_int_session, UUID(plan_id), _int_household.id, ingredients)

        # ---------------------------------------------------------------
        # Step 5: Verify plan is active with slots
        # ---------------------------------------------------------------
        detail_resp = await int_client.get(f"/api/v1/meal-plans/{plan_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["status"] == "active"
        assert len(detail["slots"]) == 2
        slot_titles = {s["recipe"]["title"] for s in detail["slots"]}
        assert "Chicken Rice Bowl" in slot_titles
        assert "Broccoli Stir Fry" in slot_titles

        # /active endpoint
        active_resp = await int_client.get("/api/v1/meal-plans/active")
        assert active_resp.status_code == 200
        assert active_resp.json()["id"] == plan_id

        # ---------------------------------------------------------------
        # Step 6: View grocery list
        # ---------------------------------------------------------------
        grocery_resp = await int_client.get(f"/api/v1/meal-plans/{plan_id}/grocery-list")
        assert grocery_resp.status_code == 200
        grocery_data = grocery_resp.json()
        assert len(grocery_data["items"]) == 3
        grocery_list_id = grocery_data["id"]

        grocery_by_ing = {item["ingredient_id"]: item for item in grocery_data["items"]}
        assert grocery_by_ing[str(chicken.id)]["quantity_needed"] == 800.0
        assert grocery_by_ing[str(rice.id)]["quantity_needed"] == 300.0
        assert grocery_by_ing[str(broccoli.id)]["quantity_needed"] == 400.0

        # ---------------------------------------------------------------
        # Step 7: Check off a grocery item
        # ---------------------------------------------------------------
        chicken_grocery_id = grocery_by_ing[str(chicken.id)]["id"]
        check_resp = await int_client.patch(
            f"/api/v1/grocery-items/{chicken_grocery_id}",
            json={"is_checked": True},
        )
        assert check_resp.status_code == 200
        assert check_resp.json()["is_checked"] is True

        # Verify persistence
        grocery_resp2 = await int_client.get(f"/api/v1/meal-plans/{plan_id}/grocery-list")
        checked_items = {item["ingredient_id"]: item for item in grocery_resp2.json()["items"]}
        assert checked_items[str(chicken.id)]["is_checked"] is True
        assert checked_items[str(rice.id)]["is_checked"] is False

        # ---------------------------------------------------------------
        # Step 8: Complete shopping (purchased items -> inventory)
        # ---------------------------------------------------------------
        complete_resp = await int_client.post(
            f"/api/v1/grocery-lists/{grocery_list_id}/complete",
            json={
                "purchased_items": [
                    {
                        "ingredient_id": str(chicken.id),
                        "quantity": 800,
                        "unit": "g",
                    },
                    {
                        "ingredient_id": str(rice.id),
                        "quantity": 300,
                        "unit": "g",
                    },
                    {
                        "ingredient_id": str(broccoli.id),
                        "quantity": 400,
                        "unit": "g",
                    },
                ]
            },
        )
        assert complete_resp.status_code == 201
        purchased = complete_resp.json()
        assert len(purchased) == 3

        # ---------------------------------------------------------------
        # Step 9: Verify inventory updated
        # ---------------------------------------------------------------
        final_resp = await int_client.get("/api/v1/inventory")
        assert final_resp.status_code == 200
        final_items = final_resp.json()
        # 200g chicken (original) + 800g chicken + 300g rice + 400g broccoli
        assert len(final_items) == 4

        chicken_inv = [i for i in final_items if i["ingredient"]["name"] == "Chicken Breast"]
        assert len(chicken_inv) == 2
        assert sum(i["quantity"] for i in chicken_inv) == 1000

        rice_inv = [i for i in final_items if i["ingredient"]["name"] == "Jasmine Rice"]
        assert len(rice_inv) == 1
        assert rice_inv[0]["quantity"] == 300

        broccoli_inv = [i for i in final_items if i["ingredient"]["name"] == "Broccoli"]
        assert len(broccoli_inv) == 1
        assert broccoli_inv[0]["quantity"] == 400

        # ---------------------------------------------------------------
        # Step 10: Mark slot cooked, complete the plan
        # ---------------------------------------------------------------
        # Sort slots by day for deterministic order
        slots_sorted = sorted(detail["slots"], key=lambda s: s["day"])
        slot_id = slots_sorted[0]["id"]
        cook_resp = await int_client.patch(
            f"/api/v1/meal-plans/{plan_id}/slots/{slot_id}/status",
            json={"status": "cooked"},
        )
        assert cook_resp.status_code == 200
        assert cook_resp.json()["status"] == "cooked"
        assert cook_resp.json()["cooked_at"] is not None

        complete_plan_resp = await int_client.patch(
            f"/api/v1/meal-plans/{plan_id}/status",
            json={"status": "completed"},
        )
        assert complete_plan_resp.status_code == 200
        assert complete_plan_resp.json()["status"] == "completed"
