"""MealSlotRating model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, generate_uuid

if TYPE_CHECKING:
    from .household import HouseholdMember
    from .meal_plan import MealSlot


class MealSlotRating(Base):
    __tablename__ = "MealSlotRatings"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    meal_slot_id: Mapped[UUID] = mapped_column(
        ForeignKey("MealSlots.id"),
        nullable=False,
    )
    rated_by: Mapped[UUID] = mapped_column(
        ForeignKey("HouseholdMembers.id"),
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    feedback: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.sysutcdatetime(),
        nullable=False,
    )

    meal_slot: Mapped[MealSlot] = relationship(
        "MealSlot",
        lazy="selectin",
    )
    rated_by_member: Mapped[HouseholdMember] = relationship(
        "HouseholdMember",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
        UniqueConstraint(
            "meal_slot_id",
            "rated_by",
            name="uq_slot_rated_by",
        ),
        Index("ix_meal_slot_ratings_slot", "meal_slot_id"),
    )
