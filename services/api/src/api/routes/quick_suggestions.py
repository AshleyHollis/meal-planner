"""Quick meal suggestions routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from shared.logging.config import get_logger

from ..dependencies import get_quick_suggestion_service
from ..models.quick_suggestion import QuickSuggestionsResponse
from ..services.quick_suggestion_service import QuickSuggestionService

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/quick-suggestions", tags=["quick-suggestions"])


@router.get("", response_model=QuickSuggestionsResponse)
async def get_quick_suggestions(
    max_results: int = Query(default=5, ge=1, le=20),
    service: QuickSuggestionService = Depends(get_quick_suggestion_service),  # noqa: B008
) -> QuickSuggestionsResponse:
    """Get quick meal suggestions based on current household inventory."""
    try:
        return await service.get_suggestions(max_results=max_results)
    except Exception:
        logger.exception("quick_suggestions_failed")
        return QuickSuggestionsResponse(
            suggestions=[],
            message="Could not generate suggestions at this time. Please try again later.",
        )
