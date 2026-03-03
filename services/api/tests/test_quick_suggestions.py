"""Tests for the quick meal suggestions API endpoint."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from shared.db.models.ingredient import Ingredient
from shared.db.models.inventory import InventoryItem
from sqlalchemy.ext.asyncio import AsyncSession

_LLM_SUGGESTIONS_RESPONSE = """{
  "recipes": [
    {
      "title": "Quick Chicken Stir Fry",
      "description": "A fast stir fry using pantry staples",
      "prep_time_min": 5,
      "cook_time_min": 15,
      "servings": 2,
      "ingredients": [
        {"ingredient_name": "Chicken Breast", "quantity": 300, "unit": "g", "is_optional": false},
        {"ingredient_name": "Rice", "quantity": 200, "unit": "g", "is_optional": false}
      ],
      "steps": [
        {"step_order": 1, "instruction": "Cook rice", "duration_min": 10},
        {"step_order": 2, "instruction": "Stir fry chicken", "duration_min": 10}
      ]
    }
  ]
}"""


async def _seed_inventory(session: AsyncSession, household_id) -> list[InventoryItem]:
    """Seed inventory items for tests."""
    now = datetime.now(UTC)

    chicken_ing = Ingredient(
        id=uuid4(),
        name="Chicken Breast",
        category="meat",
        default_unit="g",
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now,
    )
    rice_ing = Ingredient(
        id=uuid4(),
        name="Rice",
        category="pantry",
        default_unit="g",
        default_storage="pantry",
        typical_shelf_life_days=365,
        created_at=now,
        updated_at=now,
    )
    session.add_all([chicken_ing, rice_ing])
    await session.flush()

    chicken_item = InventoryItem(
        id=uuid4(),
        household_id=household_id,
        ingredient_id=chicken_ing.id,
        quantity=500,
        unit="g",
        location="fridge",
        expiry_date=datetime.now(UTC) + timedelta(days=2),
        created_at=now,
        updated_at=now,
    )
    rice_item = InventoryItem(
        id=uuid4(),
        household_id=household_id,
        ingredient_id=rice_ing.id,
        quantity=1000,
        unit="g",
        location="pantry",
        created_at=now,
        updated_at=now,
    )
    session.add_all([chicken_item, rice_item])
    await session.flush()

    return [chicken_item, rice_item]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_suggestions_with_inventory(client, household, session):
    """GET quick-suggestions returns suggestions when inventory exists."""
    await _seed_inventory(session, household.id)

    with patch(
        "api.services.quick_suggestion_service._call_llm",
        return_value=_LLM_SUGGESTIONS_RESPONSE,
    ):
        response = await client.get("/api/v1/quick-suggestions?max_results=1")

    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) == 1
    suggestion = data["suggestions"][0]
    assert suggestion["title"] == "Quick Chicken Stir Fry"
    assert suggestion["prep_time_min"] == 5


@pytest.mark.asyncio
async def test_get_suggestions_flags_on_hand(client, household, session):
    """Suggestion ingredients present in inventory are flagged as on_hand=True."""
    await _seed_inventory(session, household.id)

    with patch(
        "api.services.quick_suggestion_service._call_llm",
        return_value=_LLM_SUGGESTIONS_RESPONSE,
    ):
        response = await client.get("/api/v1/quick-suggestions?max_results=1")

    assert response.status_code == 200
    ingredients = response.json()["suggestions"][0]["ingredients"]
    on_hand_map = {ing["name"]: ing["on_hand"] for ing in ingredients}
    assert on_hand_map.get("Chicken Breast") is True
    assert on_hand_map.get("Rice") is True


@pytest.mark.asyncio
async def test_get_suggestions_empty_inventory(client, household, session):
    """GET quick-suggestions returns empty list with message when no inventory."""
    response = await client.get("/api/v1/quick-suggestions")

    assert response.status_code == 200
    data = response.json()
    assert data["suggestions"] == []
    assert data["message"] is not None
    assert "inventory" in data["message"].lower()


@pytest.mark.asyncio
async def test_get_suggestions_default_max_results(client, household, session):
    """GET quick-suggestions uses default max_results=5."""
    # Just verify the endpoint responds without explicit max_results param
    response = await client.get("/api/v1/quick-suggestions")
    assert response.status_code == 200
