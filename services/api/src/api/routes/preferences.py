"""Member preference CRUD endpoints – scoped by household."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_preference_service
from ..models.preference import CreateMemberPreference, MemberPreferenceResponse
from ..services.preference_service import PreferenceService

router = APIRouter(prefix="/api/v1", tags=["preferences"])

DIETARY_TYPES = [
    "vegetarian",
    "vegan",
    "halal",
    "kosher",
    "gluten-free",
    "dairy-free",
    "keto",
    "paleo",
]


@router.get(
    "/members/{member_id}/preferences",
    response_model=list[MemberPreferenceResponse],
)
async def list_preferences(
    member_id: str,
    service: PreferenceService = Depends(get_preference_service),  # noqa: B008
) -> list[MemberPreferenceResponse]:
    """List all preferences for a member."""
    resolved_id = await service.resolve_member_id(member_id)
    try:
        preferences = await service.list_preferences(resolved_id)
        return [MemberPreferenceResponse.model_validate(p) for p in preferences]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e


@router.post(
    "/members/{member_id}/preferences",
    response_model=MemberPreferenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_preference(
    member_id: str,
    body: CreateMemberPreference,
    service: PreferenceService = Depends(get_preference_service),  # noqa: B008
) -> MemberPreferenceResponse:
    """Add a new preference to a member."""
    valid_types = ["dietary_restriction", "allergy", "dislike", "like"]
    if body.preference_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid preference_type. Must be one of: {', '.join(valid_types)}",
        )

    resolved_id = await service.resolve_member_id(member_id)
    try:
        preference = await service.add_preference(resolved_id, body)
        return MemberPreferenceResponse.model_validate(preference)
    except ValueError as e:
        if "duplicate" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Preference already exists",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e


@router.delete(
    "/members/{member_id}/preferences/{preference_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_preference(
    member_id: str,
    preference_id: UUID,
    service: PreferenceService = Depends(get_preference_service),  # noqa: B008
) -> None:
    """Remove a preference from a member."""
    resolved_id = await service.resolve_member_id(member_id)
    try:
        deleted = await service.delete_preference(resolved_id, preference_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Preference not found",
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e


@router.get("/preferences/dietary-types", response_model=list[str])
async def get_dietary_types() -> list[str]:
    """Get list of available dietary restriction types."""
    return DIETARY_TYPES
