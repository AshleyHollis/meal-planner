"""Preference CRUD service – scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models import HouseholdMember, MemberPreference
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.preference import CreateMemberPreference


class PreferenceService:
    """Household-scoped preference operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def resolve_member_id(self, member_id_or_current: str) -> UUID:
        """Resolve 'current' to the primary household member's ID."""
        if member_id_or_current != "current":
            return UUID(member_id_or_current)
        stmt = (
            select(HouseholdMember.id)
            .where(HouseholdMember.household_id == self.household_id)
            .order_by(HouseholdMember.created_at)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        mid = result.scalar_one_or_none()
        if mid is None:
            raise ValueError("No members found in household")
        return mid

    async def _validate_member_ownership(self, member_id: UUID) -> None:
        """Raise ValueError if member doesn't belong to household."""
        stmt = select(HouseholdMember).where(
            HouseholdMember.id == member_id,
            HouseholdMember.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none() is None:
            raise ValueError("Member not found or not in household")

    async def list_preferences(self, member_id: UUID) -> list[MemberPreference]:
        """Return all preferences for a member."""
        await self._validate_member_ownership(member_id)
        stmt = (
            select(MemberPreference)
            .where(MemberPreference.household_member_id == member_id)
            .order_by(MemberPreference.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add_preference(
        self, member_id: UUID, data: CreateMemberPreference
    ) -> MemberPreference:
        """Add a new preference to a member. Enforces unique constraint."""
        await self._validate_member_ownership(member_id)

        preference = MemberPreference(
            household_member_id=member_id,
            preference_type=data.preference_type,
            value=data.value,
            ingredient_id=data.ingredient_id,
            notes=data.notes,
        )
        self.session.add(preference)
        try:
            await self.session.flush()
        except IntegrityError as e:
            if "UNIQUE" in str(e).upper() or "unique" in str(e):
                raise ValueError("Duplicate preference") from e
            raise
        return preference

    async def delete_preference(self, member_id: UUID, preference_id: UUID) -> bool:
        """Delete a preference. Returns True if deleted."""
        await self._validate_member_ownership(member_id)
        stmt = select(MemberPreference).where(
            MemberPreference.id == preference_id,
            MemberPreference.household_member_id == member_id,
        )
        result = await self.session.execute(stmt)
        preference = result.scalar_one_or_none()
        if preference is None:
            return False
        await self.session.delete(preference)
        await self.session.flush()
        return True
