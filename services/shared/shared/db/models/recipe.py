"""Recipe, RecipeIngredient, and RecipeStep models."""

from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid


class Recipe(Base, TimestampMixin):
    __tablename__ = "Recipes"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("Households.id"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    servings: Mapped[int] = mapped_column(
        Integer,
        default=2,
        nullable=False,
    )
    prep_time_min: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    cook_time_min: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    is_ai_generated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    source_recipe_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("Recipes.id"),
        nullable=True,
    )

    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        "RecipeIngredient",
        back_populates="recipe",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    steps: Mapped[list["RecipeStep"]] = relationship(
        "RecipeStep",
        back_populates="recipe",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    source_recipe: Mapped["Recipe | None"] = relationship(
        "Recipe",
        remote_side="Recipe.id",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_recipes_household", "household_id"),
    )


class RecipeIngredient(Base):
    __tablename__ = "RecipeIngredients"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    recipe_id: Mapped[UUID] = mapped_column(
        ForeignKey("Recipes.id"),
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
        String(20),
        nullable=False,
    )
    is_optional: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    recipe: Mapped["Recipe"] = relationship(
        "Recipe",
        back_populates="ingredients",
    )
    ingredient: Mapped["Ingredient"] = relationship(
        "Ingredient",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_recipe_ingredients_recipe", "recipe_id"),
        Index("ix_recipe_ingredients_ingredient", "ingredient_id"),
    )


class RecipeStep(Base):
    __tablename__ = "RecipeSteps"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    recipe_id: Mapped[UUID] = mapped_column(
        ForeignKey("Recipes.id"),
        nullable=False,
    )
    step_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    instruction: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    equipment_mode_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("EquipmentModes.id"),
        nullable=True,
    )
    temperature: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    duration_min: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    recipe: Mapped["Recipe"] = relationship(
        "Recipe",
        back_populates="steps",
    )
    equipment_mode: Mapped["EquipmentMode | None"] = relationship(
        "EquipmentMode",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_recipe_steps_recipe", "recipe_id"),
    )
