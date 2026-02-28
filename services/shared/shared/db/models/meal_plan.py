"""MealPlan and MealSlot models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from .recipe import Recipe


class MealPlan(Base, TimestampMixin):
    __tablename__ = "MealPlans"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("Households.id"),
        nullable=False,
    )
    week_start_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    slots: Mapped[list[MealSlot]] = relationship(
        "MealSlot",
        back_populates="meal_plan",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("ix_meal_plans_household", "household_id"),)


class MealSlot(Base, TimestampMixin):
    __tablename__ = "MealSlots"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    meal_plan_id: Mapped[UUID] = mapped_column(
        ForeignKey("MealPlans.id"),
        nullable=False,
    )
    recipe_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("Recipes.id"),
        nullable=True,
    )
    day: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    meal_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="planned",
        nullable=False,
    )
    cooked_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    meal_plan: Mapped[MealPlan] = relationship(
        "MealPlan",
        back_populates="slots",
    )
    recipe: Mapped[Recipe | None] = relationship(
        "Recipe",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint(
            "meal_plan_id",
            "day",
            "meal_type",
            name="uq_slot_plan_day_type",
        ),
        Index("ix_slots_plan", "meal_plan_id"),
    )
