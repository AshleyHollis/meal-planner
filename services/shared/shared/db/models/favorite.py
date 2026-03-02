"""RecipeFavorite model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, generate_uuid

if TYPE_CHECKING:
    from .recipe import Recipe


class RecipeFavorite(Base):
    __tablename__ = "RecipeFavorites"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("Households.id"),
        nullable=False,
    )
    recipe_id: Mapped[UUID] = mapped_column(
        ForeignKey("Recipes.id"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.sysutcdatetime(),
        nullable=False,
    )

    recipe: Mapped[Recipe] = relationship(
        "Recipe",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint(
            "household_id",
            "recipe_id",
            name="uq_household_recipe",
        ),
        Index("ix_recipe_favorites_household", "household_id"),
    )
