"""RecurringMealTemplate model."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from .recipe import Recipe


class RecurringMealTemplate(Base, TimestampMixin):
    __tablename__ = "RecurringMealTemplates"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("Households.id"),
        nullable=False,
    )
    day: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    meal_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    recipe_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("Recipes.id"),
        nullable=True,
    )
    recipe_title: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    recipe: Mapped[Recipe | None] = relationship(
        "Recipe",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint("day >= 0 AND day <= 6", name="ck_recurring_day_range"),
        UniqueConstraint(
            "household_id",
            "day",
            "meal_type",
            name="uq_recurring_household_day_type",
        ),
        Index("ix_recurring_templates_household", "household_id"),
    )
