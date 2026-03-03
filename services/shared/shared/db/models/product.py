"""Product model — household-scoped ingredient-to-product mapping."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from .household import Household
    from .ingredient import Ingredient


class Product(Base, TimestampMixin):
    """Maps an ingredient to a purchasable product for a household."""

    __tablename__ = "Products"

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
    brand: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    product_name: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )
    size_desc: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    price: Mapped[float | None] = mapped_column(
        Numeric(8, 2),
        nullable=True,
    )
    shop: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    household: Mapped[Household] = relationship(
        "Household",
        lazy="selectin",
    )
    ingredient: Mapped[Ingredient] = relationship(
        "Ingredient",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("household_id", "ingredient_id", name="uq_product_household_ingredient"),
        Index("ix_products_household", "household_id"),
        Index("ix_products_ingredient", "ingredient_id"),
    )
