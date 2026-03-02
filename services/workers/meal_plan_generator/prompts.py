"""Prompt templates for LLM-based meal plan generation."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from shared.models.equipment import Equipment
    from shared.models.inventory import InventoryItem

SYSTEM_PROMPT = """You are a meal planning assistant. Generate a \
7-day dinner plan for 2 adults.

CRITICAL REQUIREMENTS:
1. You MUST generate EXACTLY 7 recipes — one for each day: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
2. Prioritize ingredients expiring soonest (use them Mon-Wed)
3. Each recipe: EXACTLY 2 servings, realistic prep/cook times
4. Equipment-specific steps with mode, temperature, duration
5. Respond ONLY with valid JSON matching the schema — no comments, no trailing commas
6. Use ingredient names that match the provided inventory list
7. Every recipe must have at least one step

OUTPUT SCHEMA:
{schema_json}
"""


def _get_schema_json() -> str:
    """Get the GeneratedMealPlan JSON schema for the prompt."""
    # Import here to avoid circular imports at module level
    from meal_plan_generator.schemas import GeneratedMealPlan

    return json.dumps(GeneratedMealPlan.model_json_schema(), indent=2)


def format_equipment(equipment: list[Equipment]) -> str:
    """Format equipment list for the prompt.

    Args:
        equipment: List of Equipment ORM models with modes relationship.

    Returns:
        Formatted string listing each equipment and its available modes.
    """
    if not equipment:
        return "No special equipment. Use standard stove/oven."

    lines = []
    for item in equipment:
        modes = getattr(item, "modes", [])
        if modes:
            mode_strs = []
            for m in modes:
                temp_range = ""
                if m.min_temp_celsius is not None and m.max_temp_celsius is not None:
                    temp_range = f" ({m.min_temp_celsius}-{m.max_temp_celsius}C)"
                mode_strs.append(f"{m.name}{temp_range}")
            lines.append(f"- {item.name}: {', '.join(mode_strs)}")
        else:
            lines.append(f"- {item.name}")
    return "\n".join(lines)


def format_inventory(inventory: list[InventoryItem]) -> str:
    """Format inventory items for the prompt.

    Args:
        inventory: List of InventoryItem ORM models with ingredient relationship.

    Returns:
        Formatted string listing each item with quantity, unit, and location.
    """
    if not inventory:
        return "Inventory is empty. All ingredients will need to be purchased."

    lines = []
    for item in inventory:
        ingredient = getattr(item, "ingredient", None)
        name = ingredient.name if ingredient else "Unknown"
        qty = f"{item.quantity} {item.unit}" if item.unit else str(item.quantity)
        location = f" [{item.location}]" if item.location else ""
        lines.append(f"- {name}: {qty}{location}")
    return "\n".join(lines)


def format_expiring(expiring: list[InventoryItem]) -> str:
    """Format expiring items for the prompt, sorted by expiry date.

    Args:
        expiring: List of InventoryItem ORM models that have expiry dates, sorted soonest first.

    Returns:
        Formatted string listing each expiring item with its date.
    """
    if not expiring:
        return "No items expiring soon."

    lines = []
    for item in expiring:
        ingredient = getattr(item, "ingredient", None)
        name = ingredient.name if ingredient else "Unknown"
        expiry = item.expiry_date.strftime("%Y-%m-%d") if item.expiry_date else "unknown"
        qty = f"{item.quantity} {item.unit}" if item.unit else str(item.quantity)
        lines.append(f"- {name}: {qty} (expires {expiry})")
    return "\n".join(lines)


def format_preferences(member_preferences: dict) -> str:
    """Format member preferences grouped by member.

    Args:
        member_preferences: Dict mapping member_name -> list of preference objects
            with preference_type and value fields.

    Returns:
        Formatted string with dietary restrictions (FILTER), allergies (HARD BLOCK),
        dislikes (minimize), and likes (prefer) per member.
    """
    if not member_preferences:
        return ""

    lines = []
    for member_name, prefs in member_preferences.items():
        lines.append(f"**{member_name}**:")

        allergies = [p["value"] for p in prefs if p["preference_type"] == "allergy"]
        if allergies:
            lines.append(f"  - ALLERGIES (HARD BLOCK — never include): {', '.join(allergies)}")

        restrictions = [p["value"] for p in prefs if p["preference_type"] == "dietary_restriction"]
        if restrictions:
            lines.append(f"  - Dietary restrictions (FILTER): {', '.join(restrictions)}")

        dislikes = [p["value"] for p in prefs if p["preference_type"] == "dislike"]
        if dislikes:
            lines.append(f"  - Dislikes (avoid): {', '.join(dislikes)}")

        likes = [p["value"] for p in prefs if p["preference_type"] == "like"]
        if likes:
            lines.append(f"  - Likes (prefer): {', '.join(likes)}")

    return "\n".join(lines)


def format_recent_meals(recent_meals: list[dict]) -> str:
    """Format recent meals to avoid repetition.

    Args:
        recent_meals: List of dicts with 'title' and optional 'cuisine_type'.

    Returns:
        Formatted string listing recent meals with instruction to avoid repeating.
    """
    if not recent_meals:
        return ""

    titles = [meal["title"] for meal in recent_meals]
    lines = ["Do NOT repeat these recipes:"] + [f"- {title}" for title in titles]
    return "\n".join(lines)


def format_favorites(favorites: list[str]) -> str:
    """Format favorite recipes.

    Args:
        favorites: List of favorite recipe titles.

    Returns:
        Formatted string listing favorites with instruction to consider including one.
    """
    if not favorites:
        return ""

    lines = ["Consider including ~1 of these favorites if not recently cooked:"] + [
        f"- {fav}" for fav in favorites
    ]
    return "\n".join(lines)


def format_rating_insights(rating_insights: dict) -> str:
    """Format rating insights to guide recipe selection.

    Args:
        rating_insights: Dict with 'high_rated' and 'low_rated' lists of recipe titles.

    Returns:
        Formatted string with recipes to prefer and avoid based on ratings.
    """
    if not rating_insights:
        return ""

    lines = []
    low_rated = rating_insights.get("low_rated", [])
    if low_rated:
        lines.append("AVOID these low-rated recipes (≤2 stars):")
        lines.extend([f"- {title}" for title in low_rated])

    high_rated = rating_insights.get("high_rated", [])
    if high_rated:
        if lines:
            lines.append("")
        lines.append("PREFER these high-rated recipes (≥4 stars):")
        lines.extend([f"- {title}" for title in high_rated])

    return "\n".join(lines) if lines else ""


def format_cuisine_preferences(cuisine_preferences: list[str]) -> str:
    """Format cuisine preferences constraint.

    Args:
        cuisine_preferences: List of requested cuisine types.

    Returns:
        Formatted string with cuisine matching instruction.
    """
    if not cuisine_preferences:
        return ""

    cuisines = ", ".join(cuisine_preferences)
    return f"At least 70% of recipes should match these cuisines: {cuisines}"


def build_prompt(
    inventory: list[InventoryItem],
    equipment: list[Equipment],
    expiring: list[InventoryItem],
    *,
    member_preferences: dict | None = None,
    recent_meals: list[dict] | None = None,
    favorites: list[str] | None = None,
    rating_insights: dict | None = None,
    cuisine_preferences: list[str] | None = None,
) -> str:
    """Build the complete meal plan generation prompt.

    Combines the system prompt with formatted inventory, equipment, and expiring
    item sections, plus optional personalization sections.

    Args:
        inventory: All inventory items for the household.
        equipment: All equipment for the household.
        expiring: Inventory items with expiry dates, sorted soonest first.
        member_preferences: Dict mapping member_name -> list of preference dicts.
        recent_meals: List of recently cooked meal dicts with 'title', 'cuisine_type'.
        favorites: List of favorite recipe titles.
        rating_insights: Dict with 'high_rated' and 'low_rated' recipe title lists.
        cuisine_preferences: List of requested cuisine types.

    Returns:
        Complete formatted prompt string ready for LLM submission.
    """
    schema_json = _get_schema_json()
    equipment_info = format_equipment(equipment)
    inventory_info = format_inventory(inventory)
    expiring_info = format_expiring(expiring)

    prompt = f"""{SYSTEM_PROMPT.format(schema_json=schema_json)}

AVAILABLE EQUIPMENT:
{equipment_info}

CURRENT INVENTORY (use these first):
{inventory_info}

EXPIRING SOON (prioritize these):
{expiring_info}"""

    # Add personalization sections if data is present
    if member_preferences:
        prefs_info = format_preferences(member_preferences)
        if prefs_info:
            prompt += f"\n\nMEMBER PREFERENCES:\n{prefs_info}"

    if recent_meals:
        recent_info = format_recent_meals(recent_meals)
        if recent_info:
            prompt += f"\n\nRECENT MEALS:\n{recent_info}"

    if favorites:
        favorites_info = format_favorites(favorites)
        if favorites_info:
            prompt += f"\n\nFAVORITES:\n{favorites_info}"

    if rating_insights:
        ratings_info = format_rating_insights(rating_insights)
        if ratings_info:
            prompt += f"\n\nRATING INSIGHTS:\n{ratings_info}"

    if cuisine_preferences:
        cuisine_info = format_cuisine_preferences(cuisine_preferences)
        if cuisine_info:
            prompt += f"\n\nCUISINE PREFERENCE:\n{cuisine_info}"

    prompt += "\n\nGenerate the meal plan JSON now."
    return prompt


def add_error_feedback(prompt: str, errors: str | list[str]) -> str:
    """Append error feedback to the prompt for retry attempts.

    When the LLM returns invalid output, this adds the validation errors
    to the prompt so the LLM can correct its response.

    Args:
        prompt: The original or previous prompt.
        errors: Validation error string or list of error strings.

    Returns:
        Updated prompt with error feedback appended.
    """
    error_text = "\n".join(f"- {e}" for e in errors) if isinstance(errors, list) else errors

    return f"""{prompt}

PREVIOUS ATTEMPT HAD ERRORS. Fix these issues:
{error_text}

Generate corrected meal plan JSON now."""
