"""FastAPI dependency factories for service layer injection.

Each ``get_*_service`` function composes a DB session and household_id
into a ready-to-use service instance, following the yt-summarizer
``Depends(get_service)`` pattern.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends
from shared.db.connection import get_session
from sqlalchemy.ext.asyncio import AsyncSession

from .middleware.auth import get_current_household_id
from .services.equipment_service import EquipmentService
from .services.favorite_service import FavoriteService
from .services.grocery_service import GroceryService
from .services.inventory_service import InventoryService
from .services.leftover_service import LeftoverService
from .services.meal_history_service import MealHistoryService
from .services.meal_plan_service import MealPlanService
from .services.preference_service import PreferenceService
from .services.product_service import ProductService
from .services.quick_suggestion_service import QuickSuggestionService
from .services.rating_service import RatingService
from .services.recurring_meal_service import RecurringMealService
from .services.staple_service import StapleService
from .services.substitution_service import SubstitutionService


def get_inventory_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> InventoryService:
    """Dependency: household-scoped inventory service."""
    return InventoryService(session, household_id)


def get_equipment_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> EquipmentService:
    """Dependency: household-scoped equipment service."""
    return EquipmentService(session, household_id)


def get_meal_plan_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> MealPlanService:
    """Dependency: household-scoped meal plan service."""
    return MealPlanService(session, household_id)


def get_grocery_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> GroceryService:
    """Dependency: household-scoped grocery service."""
    return GroceryService(session, household_id)


def get_meal_history_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> MealHistoryService:
    """Dependency: household-scoped meal history service."""
    return MealHistoryService(session, household_id)


def get_favorite_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> FavoriteService:
    """Dependency: household-scoped favorite service."""
    return FavoriteService(session, household_id)


def get_preference_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> PreferenceService:
    """Dependency: household-scoped preference service."""
    return PreferenceService(session, household_id)


def get_product_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> ProductService:
    """Dependency: household-scoped product service."""
    return ProductService(session, household_id)


def get_rating_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> RatingService:
    """Dependency: household-scoped rating service."""
    return RatingService(session, household_id)


def get_leftover_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> LeftoverService:
    """Dependency: household-scoped leftover service."""
    return LeftoverService(session, household_id)


def get_staple_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> StapleService:
    """Dependency: household-scoped staple service."""
    return StapleService(session, household_id)


def get_substitution_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> SubstitutionService:
    """Dependency: household-scoped substitution service."""
    return SubstitutionService(session, household_id)


def get_quick_suggestion_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> QuickSuggestionService:
    """Dependency: household-scoped quick suggestion service."""
    return QuickSuggestionService(session, household_id)


def get_recurring_meal_service(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    household_id: UUID = Depends(get_current_household_id),  # noqa: B008
) -> RecurringMealService:
    """Dependency: household-scoped recurring meal service."""
    return RecurringMealService(session, household_id)
