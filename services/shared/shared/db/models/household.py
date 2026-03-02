"""Household and HouseholdMember models."""

from uuid import UUID

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid


class Household(Base, TimestampMixin):
    __tablename__ = "Households"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    default_servings: Mapped[int] = mapped_column(
        Integer,
        default=2,
        nullable=False,
    )

    members: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember",
        back_populates="household",
        lazy="selectin",
    )


class HouseholdMember(Base, TimestampMixin):
    __tablename__ = "HouseholdMembers"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("Households.id"),
        nullable=False,
    )
    auth0_user_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        default="owner",
        nullable=False,
    )

    household: Mapped["Household"] = relationship(
        "Household",
        back_populates="members",
    )

    __table_args__ = (
        Index("ix_members_auth0", "auth0_user_id"),
        Index("ix_members_household", "household_id"),
    )
