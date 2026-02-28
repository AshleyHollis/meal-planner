"""Ingredient search and autocomplete service."""

from __future__ import annotations

from shared.db.models.ingredient import Ingredient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def search_ingredients(
    session: AsyncSession,
    query: str,
    limit: int = 20,
) -> list[Ingredient]:
    """Search ingredients by name prefix (case-insensitive).

    Returns up to ``limit`` matching Ingredient rows ordered by name.
    """
    stmt = (
        select(Ingredient)
        .where(Ingredient.name.ilike(f"%{query}%"))
        .order_by(Ingredient.name)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
