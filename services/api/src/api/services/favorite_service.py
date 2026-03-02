"""Favorite CRUD service – scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models import Recipe, RecipeFavorite
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class FavoriteService:
    """Household-scoped favorite operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def add_favorite(self, recipe_id: UUID) -> RecipeFavorite:
        """Mark recipe as favorite (idempotent)."""
        # Check if already exists
        stmt = select(RecipeFavorite).where(
            RecipeFavorite.household_id == self.household_id,
            RecipeFavorite.recipe_id == recipe_id,
        )
        result = await self.session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing is not None:
            # Already favorited - return the existing one
            # Need to load the recipe relationship
            await self.session.refresh(existing, attribute_names=["recipe"])
            return existing

        # Verify recipe exists
        recipe_stmt = select(Recipe).where(Recipe.id == recipe_id)
        recipe_result = await self.session.execute(recipe_stmt)
        recipe = recipe_result.scalar_one_or_none()
        if recipe is None:
            raise ValueError("Recipe not found")

        # Create new favorite
        favorite = RecipeFavorite(
            household_id=self.household_id,
            recipe_id=recipe_id,
        )
        self.session.add(favorite)
        await self.session.flush()
        # Load the recipe relationship
        await self.session.refresh(favorite, attribute_names=["recipe"])
        return favorite

    async def remove_favorite(self, recipe_id: UUID) -> bool:
        """Remove favorite. Returns True if deleted."""
        stmt = select(RecipeFavorite).where(
            RecipeFavorite.household_id == self.household_id,
            RecipeFavorite.recipe_id == recipe_id,
        )
        result = await self.session.execute(stmt)
        favorite = result.scalar_one_or_none()
        if favorite is None:
            return False
        await self.session.delete(favorite)
        await self.session.flush()
        return True

    async def list_favorites(self) -> list[RecipeFavorite]:
        """List household favorites (joined with Recipe for title)."""
        stmt = (
            select(RecipeFavorite)
            .join(Recipe, RecipeFavorite.recipe_id == Recipe.id)
            .where(RecipeFavorite.household_id == self.household_id)
            .order_by(RecipeFavorite.created_at.desc())
        )
        result = await self.session.execute(stmt)
        favorites = list(result.scalars().all())
        # Ensure recipe relationship is loaded
        for fav in favorites:
            await self.session.refresh(fav, attribute_names=["recipe"])
        return favorites
