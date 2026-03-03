"""Integration tests for rating API routes."""

from datetime import UTC, datetime
from uuid import uuid4

from httpx import AsyncClient
from shared.db.models import HouseholdMember, MealPlan, MealSlot, Recipe
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _seed_member(
    session: AsyncSession, household_id, name: str = "Test Member"
) -> HouseholdMember:
    """Create a test household member."""
    now = datetime.now(UTC)
    member = HouseholdMember(
        id=uuid4(),
        household_id=household_id,
        auth0_user_id=f"auth0|{name.lower().replace(' ', '-')}",
        display_name=name,
        role="member",
        created_at=now,
        updated_at=now,
    )
    session.add(member)
    await session.flush()
    return member


async def _seed_meal_plan(session: AsyncSession, household_id) -> MealPlan:
    """Create a test meal plan."""
    now = datetime.now(UTC)
    plan = MealPlan(
        id=uuid4(),
        household_id=household_id,
        week_start_date=now.date(),
        status="pending",
        created_at=now,
        updated_at=now,
    )
    session.add(plan)
    await session.flush()
    return plan


async def _seed_recipe(session: AsyncSession) -> Recipe:
    """Create a test recipe."""
    now = datetime.now(UTC)
    recipe = Recipe(
        id=uuid4(),
        title="Test Recipe",
        description="A test recipe",
        servings=2,
        prep_time_min=10,
        cook_time_min=20,
        created_at=now,
        updated_at=now,
    )
    session.add(recipe)
    await session.flush()
    return recipe


async def _seed_meal_slot(
    session: AsyncSession,
    plan_id,
    recipe_id,
    *,
    status: str = "planned",
    day: int = 1,
    meal_type: str = "dinner",
) -> MealSlot:
    """Create a test meal slot."""
    now = datetime.now(UTC)
    slot = MealSlot(
        id=uuid4(),
        meal_plan_id=plan_id,
        recipe_id=recipe_id,
        day=day,
        meal_type=meal_type,
        status=status,
        cooked_at=now if status == "cooked" else None,
        created_at=now,
        updated_at=now,
    )
    session.add(slot)
    await session.flush()
    return slot


# ---------------------------------------------------------------------------
# POST /api/v1/meal-plans/{plan_id}/slots/{slot_id}/rating
# ---------------------------------------------------------------------------


class TestSubmitRating:
    async def test_submit_rating_success(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Submit a rating for a cooked meal slot."""
        # Seed plan, recipe, cooked slot
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="cooked")
        await session.commit()

        payload = {"rating": 5, "feedback": "Delicious!"}
        resp = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating", json=payload
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["rating"] == 5
        assert data["feedback"] == "Delicious!"
        assert data["meal_slot_id"] == str(slot.id)

    async def test_submit_rating_updates_existing(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Submitting a rating twice updates the existing rating."""
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="cooked")
        await session.commit()

        # First submission
        payload1 = {"rating": 3, "feedback": "Okay"}
        resp1 = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating", json=payload1
        )
        assert resp1.status_code == 201
        rating_id_1 = resp1.json()["id"]

        # Second submission (update)
        payload2 = {"rating": 5, "feedback": "Actually amazing!"}
        resp2 = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating", json=payload2
        )
        assert resp2.status_code == 201
        data2 = resp2.json()
        assert data2["id"] == rating_id_1  # Same rating ID
        assert data2["rating"] == 5
        assert data2["feedback"] == "Actually amazing!"

    async def test_submit_rating_non_cooked_slot_fails(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Cannot rate a slot that is not cooked."""
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="planned")
        await session.commit()

        payload = {"rating": 5, "feedback": "Great!"}
        resp = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating", json=payload
        )

        assert resp.status_code == 409
        assert "must be cooked" in resp.json()["detail"].lower()

    async def test_submit_rating_out_of_range_fails(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Rating must be between 1 and 5."""
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="cooked")
        await session.commit()

        # Rating too low
        resp_low = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating",
            json={"rating": 0, "feedback": "Bad"},
        )
        assert resp_low.status_code == 422  # Pydantic validation error

        # Rating too high
        resp_high = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating",
            json={"rating": 6, "feedback": "Too good"},
        )
        assert resp_high.status_code == 422

    async def test_submit_rating_feedback_too_long_fails(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Feedback must be max 500 characters."""
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="cooked")
        await session.commit()

        long_feedback = "x" * 501
        payload = {"rating": 5, "feedback": long_feedback}
        resp = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating", json=payload
        )

        assert resp.status_code == 422  # Pydantic validation error

    async def test_submit_rating_without_feedback_success(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Feedback is optional."""
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="cooked")
        await session.commit()

        payload = {"rating": 4}
        resp = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating", json=payload
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["rating"] == 4
        assert data["feedback"] is None

    async def test_submit_rating_plan_not_found_fails(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Non-existent plan returns 400."""
        fake_plan_id = uuid4()
        fake_slot_id = uuid4()
        payload = {"rating": 5}
        resp = await client.post(
            f"/api/v1/meal-plans/{fake_plan_id}/slots/{fake_slot_id}/rating", json=payload
        )

        assert resp.status_code == 400

    async def test_submit_rating_slot_not_in_plan_fails(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Slot must belong to the specified plan."""
        plan1 = await _seed_meal_plan(session, household.id)
        plan2 = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan1.id, recipe.id, status="cooked")
        await session.commit()

        # Try to rate slot under wrong plan
        payload = {"rating": 5}
        resp = await client.post(
            f"/api/v1/meal-plans/{plan2.id}/slots/{slot.id}/rating", json=payload
        )

        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/v1/meal-plans/{plan_id}/slots/{slot_id}/rating
# ---------------------------------------------------------------------------


class TestGetRating:
    async def test_get_rating_success(self, client: AsyncClient, session: AsyncSession, household):
        """Retrieve a submitted rating."""
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="cooked")
        await session.commit()

        # Submit rating
        payload = {"rating": 4, "feedback": "Good meal"}
        submit_resp = await client.post(
            f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating", json=payload
        )
        assert submit_resp.status_code == 201

        # Retrieve rating
        get_resp = await client.get(f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["rating"] == 4
        assert data["feedback"] == "Good meal"

    async def test_get_rating_not_found_returns_null(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Returns null if no rating exists."""
        plan = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan.id, recipe.id, status="cooked")
        await session.commit()

        resp = await client.get(f"/api/v1/meal-plans/{plan.id}/slots/{slot.id}/rating")
        assert resp.status_code == 200
        # FastAPI returns 200 with null body for Optional response models
        assert resp.json() is None

    async def test_get_rating_plan_not_found_fails(
        self, client: AsyncClient, session: AsyncSession
    ):
        """Non-existent plan returns 400."""
        fake_plan_id = uuid4()
        fake_slot_id = uuid4()
        resp = await client.get(f"/api/v1/meal-plans/{fake_plan_id}/slots/{fake_slot_id}/rating")

        assert resp.status_code == 400

    async def test_get_rating_slot_not_in_plan_fails(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Slot must belong to the specified plan."""
        plan1 = await _seed_meal_plan(session, household.id)
        plan2 = await _seed_meal_plan(session, household.id)
        recipe = await _seed_recipe(session)
        slot = await _seed_meal_slot(session, plan1.id, recipe.id, status="cooked")
        await session.commit()

        resp = await client.get(f"/api/v1/meal-plans/{plan2.id}/slots/{slot.id}/rating")
        assert resp.status_code == 400
