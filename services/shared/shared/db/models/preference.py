"""MemberPreference model."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from .household import HouseholdMember
    from .ingredient import Ingredient


class MemberPreference(Base, TimestampMixin):
    __tablename__ = "MemberPreferences"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_member_id: Mapped[UUID] = mapped_column(
        ForeignKey("HouseholdMembers.id"),
        nullable=False,
    )
    preference_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    value: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    ingredient_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("Ingredients.id"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    household_member: Mapped[HouseholdMember] = relationship(
        "HouseholdMember",
        lazy="selectin",
    )
    ingredient: Mapped[Ingredient | None] = relationship(
        "Ingredient",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint(
            "household_member_id",
            "preference_type",
            "value",
            name="uq_member_pref_type_value",
        ),
        Index("ix_member_prefs_member", "household_member_id"),
    )
