"""Leftover model."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from .meal_plan import MealSlot
    from .recipe import Recipe


class Leftover(Base, TimestampMixin):
    __tablename__ = "Leftovers"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    meal_slot_id: Mapped[UUID] = mapped_column(
        ForeignKey("MealSlots.id"),
        nullable=False,
    )
    recipe_id: Mapped[UUID] = mapped_column(
        ForeignKey("Recipes.id"),
        nullable=False,
    )
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("Households.id"),
        nullable=False,
    )
    portions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    storage_location: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    expiry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    meal_slot: Mapped[MealSlot] = relationship(
        "MealSlot",
        lazy="selectin",
    )
    recipe: Mapped[Recipe] = relationship(
        "Recipe",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint("portions > 0", name="ck_leftover_portions"),
        Index("ix_leftovers_household", "household_id"),
        Index("ix_leftovers_slot", "meal_slot_id"),
    )
