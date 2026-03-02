"""Favorite CRUD endpoints – scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_favorite_service
from ..models.favorite import RecipeFavoriteResponse
from ..services.favorite_service import FavoriteService

router = APIRouter(tags=["favorites"])


@router.post(
    "/api/v1/recipes/{recipe_id}/favorite",
    response_model=RecipeFavoriteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_favorite(
    recipe_id: UUID,
    service: FavoriteService = Depends(get_favorite_service),  # noqa: B008
) -> RecipeFavoriteResponse:
    """Mark recipe as favorite (idempotent)."""
    try:
        favorite = await service.add_favorite(recipe_id)
        # Map to response with recipe_title from the loaded recipe
        return RecipeFavoriteResponse(
            id=favorite.id,
            recipe_id=favorite.recipe_id,
            recipe_title=favorite.recipe.title,
            created_at=favorite.created_at,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e


@router.delete("/api/v1/recipes/{recipe_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    recipe_id: UUID,
    service: FavoriteService = Depends(get_favorite_service),  # noqa: B008
) -> None:
    """Remove favorite."""
    deleted = await service.remove_favorite(recipe_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )


@router.get("/api/v1/favorites", response_model=list[RecipeFavoriteResponse])
async def list_favorites(
    service: FavoriteService = Depends(get_favorite_service),  # noqa: B008
) -> list[RecipeFavoriteResponse]:
    """List household favorites."""
    favorites = await service.list_favorites()
    return [
        RecipeFavoriteResponse(
            id=fav.id,
            recipe_id=fav.recipe_id,
            recipe_title=fav.recipe.title,
            created_at=fav.created_at,
        )
        for fav in favorites
    ]
