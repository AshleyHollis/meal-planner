"""Integration tests for preference API routes."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from httpx import AsyncClient
from shared.db.models import HouseholdMember, MemberPreference
from sqlalchemy.ext.asyncio import AsyncSession


async def _seed_member(
    session: AsyncSession,
    household_id: UUID,
    display_name: str = "Test Member",
    role: str = "member",
) -> HouseholdMember:
    """Seed a household member."""
    now = datetime.now(UTC)
    member = HouseholdMember(
        id=uuid4(),
        household_id=household_id,
        auth0_user_id=f"auth0|{uuid4()}",
        display_name=display_name,
        role=role,
        created_at=now,
        updated_at=now,
    )
    session.add(member)
    await session.flush()
    return member


async def _seed_preference(
    session: AsyncSession,
    member_id: UUID,
    preference_type: str = "allergy",
    value: str = "peanut",
    **kwargs,
) -> MemberPreference:
    """Seed a member preference."""
    now = datetime.now(UTC)
    preference = MemberPreference(
        id=uuid4(),
        household_member_id=member_id,
        preference_type=preference_type,
        value=value,
        ingredient_id=kwargs.get("ingredient_id"),
        notes=kwargs.get("notes"),
        created_at=now,
        updated_at=now,
    )
    session.add(preference)
    await session.flush()
    return preference


class TestListPreferences:
    async def test_list_empty_preferences(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """List preferences when member has none."""
        member = await _seed_member(session, household.id)
        await session.commit()

        resp = await client.get(f"/api/v1/members/{member.id}/preferences")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_multiple_preferences(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """List multiple preferences for a member."""
        member = await _seed_member(session, household.id)
        await _seed_preference(session, member.id, "allergy", "peanut")
        await _seed_preference(session, member.id, "dietary_restriction", "vegetarian")
        await _seed_preference(session, member.id, "dislike", "cilantro")
        await session.commit()

        resp = await client.get(f"/api/v1/members/{member.id}/preferences")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        # Most recent first
        assert data[0]["preference_type"] == "dislike"
        assert data[1]["preference_type"] == "dietary_restriction"
        assert data[2]["preference_type"] == "allergy"

    async def test_list_403_member_not_in_household(self, client: AsyncClient):
        """Reject list when member doesn't belong to household."""
        # Use a member ID that doesn't exist in the test household
        fake_member_id = uuid4()

        resp = await client.get(f"/api/v1/members/{fake_member_id}/preferences")
        assert resp.status_code == 403

    async def test_list_current_resolves_to_member(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Using member_id='current' resolves to the household's primary member."""
        resp = await client.get("/api/v1/members/current/preferences")
        assert resp.status_code == 200
        assert resp.json() == []


class TestAddPreference:
    async def test_add_dietary_restriction(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Add a dietary restriction preference."""
        member = await _seed_member(session, household.id)
        await session.commit()

        payload = {
            "preference_type": "dietary_restriction",
            "value": "vegetarian",
        }
        resp = await client.post(f"/api/v1/members/{member.id}/preferences", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["preference_type"] == "dietary_restriction"
        assert data["value"] == "vegetarian"
        assert data["household_member_id"] == str(member.id)
        assert data["ingredient_id"] is None
        assert data["notes"] is None
        assert "id" in data
        assert "created_at" in data

    async def test_add_allergy_with_ingredient(
        self, client: AsyncClient, session: AsyncSession, household, sample_ingredient
    ):
        """Add an allergy preference with ingredient_id."""
        member = await _seed_member(session, household.id)
        await session.commit()

        payload = {
            "preference_type": "allergy",
            "value": "chicken",
            "ingredient_id": str(sample_ingredient.id),
            "notes": "Severe reaction",
        }
        resp = await client.post(f"/api/v1/members/{member.id}/preferences", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["preference_type"] == "allergy"
        assert data["value"] == "chicken"
        assert data["ingredient_id"] == str(sample_ingredient.id)
        assert data["notes"] == "Severe reaction"

    async def test_add_like_preference(self, client: AsyncClient, session: AsyncSession, household):
        """Add a 'like' preference."""
        member = await _seed_member(session, household.id)
        await session.commit()

        payload = {
            "preference_type": "like",
            "value": "garlic",
        }
        resp = await client.post(f"/api/v1/members/{member.id}/preferences", json=payload)
        assert resp.status_code == 201
        assert resp.json()["preference_type"] == "like"

    async def test_add_dislike_preference(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Add a 'dislike' preference."""
        member = await _seed_member(session, household.id)
        await session.commit()

        payload = {
            "preference_type": "dislike",
            "value": "cilantro",
        }
        resp = await client.post(f"/api/v1/members/{member.id}/preferences", json=payload)
        assert resp.status_code == 201
        assert resp.json()["preference_type"] == "dislike"

    async def test_add_409_duplicate_preference(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Reject duplicate preference (same member, type, value)."""
        member = await _seed_member(session, household.id)
        await _seed_preference(session, member.id, "allergy", "peanut")
        await session.commit()

        payload = {
            "preference_type": "allergy",
            "value": "peanut",
        }
        resp = await client.post(f"/api/v1/members/{member.id}/preferences", json=payload)
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"].lower()

    async def test_add_422_invalid_preference_type(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Reject invalid preference_type."""
        member = await _seed_member(session, household.id)
        await session.commit()

        payload = {
            "preference_type": "invalid_type",
            "value": "something",
        }
        resp = await client.post(f"/api/v1/members/{member.id}/preferences", json=payload)
        assert resp.status_code == 422
        assert "invalid preference_type" in resp.json()["detail"].lower()

    async def test_add_403_member_not_in_household(self, client: AsyncClient):
        """Reject add when member doesn't belong to household."""
        # Use a member ID that doesn't exist in the test household
        fake_member_id = uuid4()

        payload = {
            "preference_type": "allergy",
            "value": "peanut",
        }
        resp = await client.post(f"/api/v1/members/{fake_member_id}/preferences", json=payload)
        assert resp.status_code == 403

    async def test_add_via_current_member(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Adding preference via member_id='current' uses household's primary member."""
        payload = {
            "preference_type": "allergy",
            "value": "shellfish",
        }
        resp = await client.post("/api/v1/members/current/preferences", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["preference_type"] == "allergy"
        assert data["value"] == "shellfish"


class TestDeletePreference:
    async def test_delete_preference(self, client: AsyncClient, session: AsyncSession, household):
        """Delete a preference."""
        member = await _seed_member(session, household.id)
        preference = await _seed_preference(session, member.id, "allergy", "peanut")
        resp = await client.delete(f"/api/v1/members/{member.id}/preferences/{preference.id}")
        assert resp.status_code == 204

    async def test_delete_404_not_found(
        self, client: AsyncClient, session: AsyncSession, household
    ):
        """Return 404 when preference doesn't exist."""
        member = await _seed_member(session, household.id)
        await session.commit()

        fake_id = uuid4()
        resp = await client.delete(f"/api/v1/members/{member.id}/preferences/{fake_id}")
        assert resp.status_code == 404

    async def test_delete_403_member_not_in_household(self, client: AsyncClient):
        """Reject delete when member doesn't belong to household."""
        # Use a member ID that doesn't exist in the test household
        fake_member_id = uuid4()
        fake_pref_id = uuid4()

        resp = await client.delete(f"/api/v1/members/{fake_member_id}/preferences/{fake_pref_id}")
        assert resp.status_code == 403


class TestDietaryTypes:
    async def test_get_dietary_types(self, client: AsyncClient):
        """Get list of valid dietary restriction types."""
        resp = await client.get("/api/v1/preferences/dietary-types")
        assert resp.status_code == 200
        types = resp.json()
        assert isinstance(types, list)
        assert "vegetarian" in types
        assert "vegan" in types
        assert "gluten-free" in types
        assert "keto" in types
        assert len(types) == 8
