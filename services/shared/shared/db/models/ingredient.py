"""Ingredient reference entity."""

from uuid import UUID

from sqlalchemy import Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, generate_uuid


class Ingredient(Base, TimestampMixin):
    __tablename__ = "Ingredients"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    name: Mapped[str] = mapped_column(
        String(200),
        unique=True,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # produce, dairy, meat, pantry, etc.
    default_unit: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )  # g, ml, units
    default_storage: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )  # fridge, pantry
    typical_shelf_life_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    __table_args__ = (
        Index("ix_ingredients_name", "name"),
        Index("ix_ingredients_category", "category"),
    )
