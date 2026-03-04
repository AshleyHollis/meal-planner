"""Quick meal suggestion service – suggests recipes from available inventory."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from shared.db.models.household import HouseholdMember
from shared.db.models.inventory import InventoryItem
from shared.db.models.preference import MemberPreference
from shared.logging.config import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.quick_suggestion import (
    QuickSuggestion,
    QuickSuggestionsResponse,
    SuggestionIngredient,
)
from .meal_plan_service import _call_llm

logger = get_logger(__name__)

_EXPIRY_SOON_DAYS = 5


def _parse_llm_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON from LLM response."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)


class QuickSuggestionService:
    """Household-scoped quick meal suggestion operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def get_suggestions(self, max_results: int = 5) -> QuickSuggestionsResponse:
        """Generate quick meal suggestions based on available inventory.

        Loads inventory, identifies expiring items, loads household allergens,
        calls LLM to generate suggestions, and flags which ingredients are on hand.
        """
        # Load inventory with ingredient names
        stmt = (
            select(InventoryItem)
            .options(selectinload(InventoryItem.ingredient))
            .where(InventoryItem.household_id == self.household_id)
        )
        result = await self.session.execute(stmt)
        inventory = list(result.scalars().all())

        if not inventory:
            return QuickSuggestionsResponse(
                suggestions=[],
                message="No inventory items found. Add ingredients to get meal suggestions.",
            )

        # Build inventory dicts
        now = datetime.now(UTC)
        expiry_threshold = now + timedelta(days=_EXPIRY_SOON_DAYS)

        inventory_items: list[dict] = []
        expiring_items: list[dict] = []
        on_hand_names: set[str] = set()

        for item in inventory:
            name = item.ingredient.name if item.ingredient else "Unknown"
            on_hand_names.add(name.lower())
            item_dict = {
                "name": name,
                "quantity": item.quantity,
                "unit": item.unit,
            }
            inventory_items.append(item_dict)

            if item.expiry_date is not None:
                expiry_aware = item.expiry_date
                if expiry_aware.tzinfo is None:
                    expiry_aware = expiry_aware.replace(tzinfo=UTC)
                if expiry_aware <= expiry_threshold:
                    expiring_items.append(
                        {
                            **item_dict,
                            "expiry": item.expiry_date.strftime("%Y-%m-%d"),
                        }
                    )

        # Load allergens
        allergen_ingredients = await self._get_allergens()

        # Build prompt
        prompt = _build_quick_suggestion_prompt(
            inventory_items,
            expiring_items,
            max_results,
            allergen_ingredients if allergen_ingredients else None,
        )

        # Call LLM
        raw = _call_llm(prompt)

        # Parse response
        try:
            data = _parse_llm_json(raw)
        except (json.JSONDecodeError, ValueError):
            logger.warning("quick_suggestion_parse_failed", raw_length=len(raw))
            return QuickSuggestionsResponse(
                suggestions=[],
                message="Could not generate suggestions at this time. Please try again.",
            )

        # Parse recipes into QuickSuggestion models
        suggestions: list[QuickSuggestion] = []
        for recipe_data in data.get("recipes", [])[:max_results]:
            ingredients = [
                SuggestionIngredient(
                    name=ing.get("ingredient_name", ing.get("name", "Unknown")),
                    quantity=ing.get("quantity", 1.0),
                    unit=ing.get("unit", "units"),
                    on_hand=ing.get("ingredient_name", ing.get("name", "")).lower()
                    in on_hand_names,
                )
                for ing in recipe_data.get("ingredients", [])
            ]
            suggestions.append(
                QuickSuggestion(
                    title=recipe_data.get("title", "Unnamed Recipe"),
                    description=recipe_data.get("description", ""),
                    prep_time_min=recipe_data.get("prep_time_min", 10),
                    cook_time_min=recipe_data.get("cook_time_min", 20),
                    servings=recipe_data.get("servings", 2),
                    ingredients=ingredients,
                )
            )

        return QuickSuggestionsResponse(suggestions=suggestions)

    async def cook_suggestion(self, title: str, ingredients: list[dict]) -> list[dict]:
        """Deduct suggestion ingredients from inventory and return deduction results.

        Looks up each ingredient by name, then deducts quantities from inventory
        (oldest expiry first). Returns per-ingredient deduction results.
        """
        from shared.db.models.ingredient import Ingredient

        deductions: list[dict] = []
        for ing in ingredients:
            name = ing.get("name", "")
            quantity = float(ing.get("quantity", 0))
            unit = ing.get("unit", "units")

            # Find ingredient by name
            ing_stmt = select(Ingredient).where(Ingredient.name == name)
            ing_result = await self.session.execute(ing_stmt)
            ingredient = ing_result.scalar_one_or_none()

            if ingredient is None:
                deductions.append(
                    {
                        "ingredient_name": name,
                        "requested": quantity,
                        "deducted": 0.0,
                        "remaining": 0.0,
                        "unit": unit,
                        "unit_mismatch": False,
                    }
                )
                continue

            # Load matching inventory items
            inv_stmt = (
                select(InventoryItem)
                .where(
                    InventoryItem.household_id == self.household_id,
                    InventoryItem.ingredient_id == ingredient.id,
                    InventoryItem.unit == unit,
                )
            )
            inv_result = await self.session.execute(inv_stmt)
            inv_items = sorted(
                inv_result.scalars().all(),
                key=lambda x: (x.expiry_date is None, x.expiry_date),
            )

            remaining_to_deduct = quantity
            total_deducted = 0.0
            for inv_item in inv_items:
                if remaining_to_deduct <= 0:
                    break
                deduct_amount = min(remaining_to_deduct, inv_item.quantity)
                inv_item.quantity -= deduct_amount
                remaining_to_deduct -= deduct_amount
                total_deducted += deduct_amount

            total_remaining = sum(i.quantity for i in inv_items)
            deductions.append(
                {
                    "ingredient_name": name,
                    "requested": quantity,
                    "deducted": total_deducted,
                    "remaining": total_remaining,
                    "unit": unit,
                    "unit_mismatch": False,
                }
            )

        await self.session.flush()
        return deductions

    async def _get_allergens(self) -> set[str]:
        """Load allergen values for all household members."""
        stmt = (
            select(MemberPreference)
            .join(HouseholdMember)
            .where(
                HouseholdMember.household_id == self.household_id,
                MemberPreference.preference_type == "allergy",
            )
        )
        result = await self.session.execute(stmt)
        prefs = result.scalars().all()
        return {p.value.lower() for p in prefs}


def _build_quick_suggestion_prompt(
    inventory_items: list[dict],
    expiring_items: list[dict],
    max_results: int,
    allergen_ingredients: set[str] | None = None,
) -> str:
    """Build LLM prompt for quick meal suggestions."""
    if inventory_items:
        inventory_text = "\n".join(
            f"- {item.get('name', 'Unknown')}: {item.get('quantity', 0)} {item.get('unit', '')}"
            for item in inventory_items
        )
    else:
        inventory_text = "No inventory items available."

    if expiring_items:
        expiring_text = "\n".join(
            f"- {item.get('name', 'Unknown')}: {item.get('quantity', 0)} {item.get('unit', '')} "
            f"(expires {item.get('expiry', 'soon')})"
            for item in expiring_items
        )
    else:
        expiring_text = "No items expiring soon."

    allergen_note = ""
    if allergen_ingredients:
        allergen_list = ", ".join(sorted(allergen_ingredients))
        allergen_note = f"\nALLERGEN RESTRICTION (HARD BLOCK — never include): {allergen_list}"

    return f"""You are a meal planning assistant. Suggest {max_results} quick meals that can be made primarily from the available inventory.{allergen_note}

CURRENT INVENTORY:
{inventory_text}

EXPIRING SOON (prioritize using these):
{expiring_text}

Requirements:
- Suggest exactly {max_results} recipes
- Prioritize ingredients expiring soon
- Each recipe should be practical and quick to prepare
- Use ingredient names from the inventory where possible

Respond ONLY with valid JSON matching this schema:
{{
  "recipes": [
    {{
      "title": "string",
      "description": "string",
      "prep_time_min": int,
      "cook_time_min": int,
      "servings": 2,
      "ingredients": [
        {{"ingredient_name": "string", "quantity": float, "unit": "string", "is_optional": false}}
      ],
      "steps": [
        {{"step_order": int, "instruction": "string", "duration_min": int or null}}
      ]
    }}
  ]
}}

Generate the meal suggestions JSON now."""
