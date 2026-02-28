"""GroceryList and GroceryItem models."""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid


class GroceryList(Base, TimestampMixin):
    __tablename__ = "GroceryLists"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    meal_plan_id: Mapped[UUID] = mapped_column(
        ForeignKey("MealPlans.id"),
        unique=True,
        nullable=False,
    )

    items: Mapped[list["GroceryItem"]] = relationship(
        "GroceryItem",
        back_populates="grocery_list",
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class GroceryItem(Base, TimestampMixin):
    __tablename__ = "GroceryItems"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    grocery_list_id: Mapped[UUID] = mapped_column(
        ForeignKey("GroceryLists.id"),
        nullable=False,
    )
    ingredient_id: Mapped[UUID] = mapped_column(
        ForeignKey("Ingredients.id"),
        nullable=False,
    )
    quantity_needed: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    is_checked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    preferred_store: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    grocery_list: Mapped["GroceryList"] = relationship(
        "GroceryList",
        back_populates="items",
    )
    ingredient: Mapped["Ingredient"] = relationship(
        "Ingredient",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_grocery_items_list", "grocery_list_id"),
        Index("ix_grocery_items_ingredient", "ingredient_id"),
    )
