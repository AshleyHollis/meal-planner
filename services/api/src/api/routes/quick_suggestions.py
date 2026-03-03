"""Quick meal suggestions routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..dependencies import get_quick_suggestion_service
from ..models.quick_suggestion import QuickSuggestionsResponse
from ..services.quick_suggestion_service import QuickSuggestionService

router = APIRouter(prefix="/api/v1/quick-suggestions", tags=["quick-suggestions"])


@router.get("", response_model=QuickSuggestionsResponse)
async def get_quick_suggestions(
    max_results: int = Query(default=5, ge=1, le=20),
    service: QuickSuggestionService = Depends(get_quick_suggestion_service),  # noqa: B008
) -> QuickSuggestionsResponse:
    """Get quick meal suggestions based on current household inventory."""
    return await service.get_suggestions(max_results=max_results)
