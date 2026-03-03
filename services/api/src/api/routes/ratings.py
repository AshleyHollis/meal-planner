"""Rating endpoints – submit and retrieve meal slot ratings."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from shared.db.connection import get_session
from shared.db.models import HouseholdMember
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_rating_service
from ..middleware.auth import get_current_user
from ..models.rating import CreateMealSlotRating, MealSlotRatingResponse
from ..services.rating_service import RatingService

router = APIRouter(prefix="/api/v1/meal-plans", tags=["ratings"])


async def _get_member_id(user: dict, session: AsyncSession) -> UUID:
    """Resolve auth0 user ID to household member ID."""
    auth0_user_id = user["sub"]
    result = await session.execute(
        select(HouseholdMember.id).where(HouseholdMember.auth0_user_id == auth0_user_id)
    )
    member_id = result.scalar_one_or_none()
    if member_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )
    return member_id


@router.post(
    "/{plan_id}/slots/{slot_id}/rating",
    response_model=MealSlotRatingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_rating(
    plan_id: UUID,
    slot_id: UUID,
    body: CreateMealSlotRating,
    user: dict = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    service: RatingService = Depends(get_rating_service),  # noqa: B008
) -> MealSlotRatingResponse:
    """Submit or update a rating for a cooked meal slot."""
    member_id = await _get_member_id(user, session)
    try:
        rating = await service.submit_rating(plan_id, slot_id, member_id, body)
        return MealSlotRatingResponse.model_validate(rating)
    except ValueError as e:
        # Check if error is about slot not being cooked
        if "must be cooked" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e),
            ) from None
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from None


@router.get(
    "/{plan_id}/slots/{slot_id}/rating",
    response_model=MealSlotRatingResponse | None,
)
async def get_rating(
    plan_id: UUID,
    slot_id: UUID,
    user: dict = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    service: RatingService = Depends(get_rating_service),  # noqa: B008
) -> MealSlotRatingResponse | None:
    """Get the current user's rating for a meal slot."""
    member_id = await _get_member_id(user, session)
    try:
        rating = await service.get_rating(plan_id, slot_id, member_id)
        if rating is None:
            return None
        return MealSlotRatingResponse.model_validate(rating)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from None
