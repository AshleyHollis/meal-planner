"""Prompt templates for LLM-based meal plan generation."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from shared.models.equipment import Equipment
    from shared.models.inventory import InventoryItem

SYSTEM_PROMPT = """You are a meal planning assistant. Generate a \
7-day dinner plan for 2 adults.

RULES:
1. Prioritize ingredients expiring soonest (use them Mon-Wed)
2. Each recipe: 2 servings, realistic prep/cook times
3. Equipment-specific steps with mode, temperature, duration
4. Respond ONLY with valid JSON matching the schema
5. Use ingredient names that match the provided inventory list
6. Every recipe must have at least one step

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


def build_prompt(
    inventory: list[InventoryItem],
    equipment: list[Equipment],
    expiring: list[InventoryItem],
) -> str:
    """Build the complete meal plan generation prompt.

    Combines the system prompt with formatted inventory, equipment, and expiring
    item sections to create the full prompt for the LLM.

    Args:
        inventory: All inventory items for the household.
        equipment: All equipment for the household.
        expiring: Inventory items with expiry dates, sorted soonest first.

    Returns:
        Complete formatted prompt string ready for LLM submission.
    """
    schema_json = _get_schema_json()
    equipment_info = format_equipment(equipment)
    inventory_info = format_inventory(inventory)
    expiring_info = format_expiring(expiring)

    return f"""{SYSTEM_PROMPT.format(schema_json=schema_json)}

AVAILABLE EQUIPMENT:
{equipment_info}

CURRENT INVENTORY (use these first):
{inventory_info}

EXPIRING SOON (prioritize these):
{expiring_info}

Generate the meal plan JSON now."""


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
    if isinstance(errors, list):
        error_text = "\n".join(f"- {e}" for e in errors)
    else:
        error_text = errors

    return f"""{prompt}

PREVIOUS ATTEMPT HAD ERRORS. Fix these issues:
{error_text}

Generate corrected meal plan JSON now."""
