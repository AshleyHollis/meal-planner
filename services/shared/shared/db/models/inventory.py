"""InventoryItem model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from .ingredient import Ingredient


class InventoryItem(Base, TimestampMixin):
    __tablename__ = "InventoryItems"

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
    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )  # g, ml, units
    location: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )  # fridge, pantry
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    defrost_hours: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    ingredient: Mapped[Ingredient] = relationship(
        "Ingredient",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_inventory_qty"),
        UniqueConstraint(
            "household_id",
            "ingredient_id",
            "location",
            name="uq_inventory_household_ingredient_location",
        ),
        Index("ix_inventory_household", "household_id"),
        Index("ix_inventory_ingredient", "ingredient_id"),
        Index("ix_inventory_expiry", "expiry_date"),
    )
