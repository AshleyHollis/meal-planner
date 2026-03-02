"""Member preference Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateMemberPreference(BaseModel):
    """Request body for adding a member preference."""

    preference_type: str = Field(
        ...,
        description="One of: dietary_restriction, allergy, dislike, like",
    )
    value: str = Field(..., min_length=1, max_length=200)
    ingredient_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=500)


class MemberPreferenceResponse(BaseModel):
    """Response body for a member preference."""

    model_config = {"from_attributes": True}

    id: UUID
    household_member_id: UUID
    preference_type: str
    value: str
    ingredient_id: UUID | None
    notes: str | None
    created_at: datetime
