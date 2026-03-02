"""Ingredient search / autocomplete endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from shared.db.connection import get_session
from sqlalchemy.ext.asyncio import AsyncSession

from ..middleware.auth import get_current_user
from ..models.ingredient import IngredientResponse
from ..services.ingredient_service import search_ingredients

router = APIRouter(prefix="/api/v1/ingredients", tags=["ingredients"])


@router.get("", response_model=list[IngredientResponse])
async def list_ingredients(
    q: str = Query("", description="Search query (name substring)"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    _user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[IngredientResponse]:
    """Search / autocomplete ingredients by name."""
    rows = await search_ingredients(session, query=q, limit=limit)
    return [IngredientResponse.model_validate(r) for r in rows]
