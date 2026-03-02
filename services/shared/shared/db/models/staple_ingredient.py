"""StapleIngredient model."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from .ingredient import Ingredient


class StapleIngredient(Base, TimestampMixin):
    __tablename__ = "StapleIngredients"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("Households.id"),
        nullable=False,
    )
    ingredient_id: Mapped[UUID] = mapped_column(
        ForeignKey("Ingredients.id"),
        nullable=False,
    )
    min_threshold: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    ingredient: Mapped[Ingredient] = relationship(
        "Ingredient",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("household_id", "ingredient_id", name="uq_staple_household_ingredient"),
        CheckConstraint("min_threshold > 0", name="ck_staple_threshold"),
        Index("ix_staple_household", "household_id"),
        Index("ix_staple_ingredient", "ingredient_id"),
    )
