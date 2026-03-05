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
6. Prioritize using ingredients from the provided inventory, especially items expiring soon. Recipes MAY include ingredients not in inventory — those will be added to the grocery list.
7. Every recipe must have at least one step
8. Be CONCISE: 1-sentence descriptions, 4-8 ingredients, 3-5 steps per recipe

OUTPUT SCHEMA:
{schema_json}
"""


def format_meal_types_description(meal_types: list[str] | None) -> str:
    """Format meal types for the system prompt description.

    Args:
        meal_types: List of meal types, or None for default (dinner).

    Returns:
        Human-readable string describing the meal types.
    """
    if not meal_types or meal_types == ["dinner"]:
        return "dinner"
    return " and ".join(meal_types)


def format_system_prompt(meal_types: list[str] | None = None) -> str:
    """Build system prompt with configurable meal types.

    Args:
        meal_types: Optional list of meal types. Defaults to ["dinner"].

    Returns:
        System prompt string with {schema_json} placeholder for later formatting.
    """
    effective_types = meal_types or ["dinner"]
    types_desc = format_meal_types_description(effective_types)
    total_recipes = len(effective_types) * 7

    type_instructions = ""
    if len(effective_types) > 1:
        type_instructions = f"""
8. For each recipe, include a "meal_type" field with one of: {", ".join(f'"{t}"' for t in effective_types)}
9. Generate {total_recipes} total recipes: {", ".join(f"7 {t}" for t in effective_types)}
10. Breakfast recipes should be lighter/quicker; lunch should be moderate; dinner can be more elaborate"""

    return f"""You are a meal planning assistant. Generate a \
7-day {types_desc} plan for 2 adults.

CRITICAL REQUIREMENTS:
1. You MUST generate EXACTLY {total_recipes} recipes — {"one" if len(effective_types) == 1 else str(len(effective_types))} for each day: Monday through Sunday
2. Prioritize ingredients expiring soonest (use them Mon-Wed)
3. Each recipe: EXACTLY 2 servings, realistic prep/cook times
4. Equipment-specific steps with mode, temperature, duration
5. Respond ONLY with valid JSON matching the schema — no comments, no trailing commas
6. Prioritize using ingredients from the provided inventory, especially items expiring soon. Recipes MAY include ingredients not in inventory — those will be added to the grocery list.
7. Every recipe must have at least one step
8. Be CONCISE: 1-sentence descriptions, 4-8 ingredients, 3-5 steps per recipe{type_instructions}

OUTPUT SCHEMA:
{{schema_json}}
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


def format_leftovers(leftovers: list) -> str:
    """Format leftover items for the prompt.

    Args:
        leftovers: List of Leftover objects with recipe, portions, and expiry info.

    Returns:
        Formatted string listing each leftover with portions and expiry.
    """
    if not leftovers:
        return "No leftovers available."

    lines = []
    for leftover in leftovers:
        recipe_title = getattr(leftover, "recipe_title", "Unknown recipe")
        portions = getattr(leftover, "portions", 0)
        expiry = getattr(leftover, "expiry_date", None)
        location = getattr(leftover, "storage_location", "unknown")
        expiry_str = expiry.strftime("%Y-%m-%d") if expiry else "no expiry"
        lines.append(f"- {recipe_title}: {portions} portions [{location}] (expires {expiry_str})")
    return "\n".join(lines)


def format_freezer_items(freezer_items: list[InventoryItem]) -> str:
    """Format freezer items for the prompt.

    Args:
        freezer_items: List of InventoryItem ORM models in freezer with defrost times.

    Returns:
        Formatted string listing each freezer item with defrost hours.
    """
    if not freezer_items:
        return "No items in freezer requiring defrosting."

    lines = []
    for item in freezer_items:
        ingredient = getattr(item, "ingredient", None)
        name = ingredient.name if ingredient else "Unknown"
        qty = f"{item.quantity} {item.unit}" if item.unit else str(item.quantity)
        defrost = item.defrost_hours if item.defrost_hours else "unknown"
        lines.append(f"- {name}: {qty} (defrost {defrost}h)")
    return "\n".join(lines)


def format_recurring_constraints(recurring_templates: list) -> str:
    """Format recurring meal template constraints for the prompt.

    Args:
        recurring_templates: List of RecurringMealTemplate ORM objects.

    Returns:
        Formatted string listing pre-assigned recurring meals, or empty string if none.
    """
    if not recurring_templates:
        return ""

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    lines = [
        "The following slots already have recurring meals assigned (do NOT generate for these):"
    ]
    for tpl in recurring_templates:
        day_name = day_names[tpl.day] if 0 <= tpl.day <= 6 else f"Day {tpl.day}"
        recipe = getattr(tpl, "recipe", None)
        title = tpl.recipe_title or (recipe.title if recipe else "Unknown")
        lines.append(f"- {day_name} {tpl.meal_type}: {title}")
    return "\n".join(lines)


def build_prompt(
    inventory: list[InventoryItem],
    equipment: list[Equipment],
    expiring: list[InventoryItem],
    *,
    meal_types: list[str] | None = None,
    member_preferences: dict | None = None,
    recent_meals: list[dict] | None = None,
    favorites: list[str] | None = None,
    rating_insights: dict | None = None,
    cuisine_preferences: list[str] | None = None,
    leftovers: list | None = None,
    freezer_items: list[InventoryItem] | None = None,
    recurring_constraints: list | None = None,
) -> str:
    """Build the complete meal plan generation prompt.

    Combines the system prompt with formatted inventory, equipment, and expiring
    item sections, plus optional personalization sections.

    Args:
        inventory: All inventory items for the household.
        equipment: All equipment for the household.
        expiring: Inventory items with expiry dates, sorted soonest first.
        meal_types: Optional list of meal types to include (e.g. ["breakfast", "dinner"]).
        member_preferences: Dict mapping member_name -> list of preference dicts.
        recent_meals: List of recently cooked meal dicts with 'title', 'cuisine_type'.
        favorites: List of favorite recipe titles.
        rating_insights: Dict with 'high_rated' and 'low_rated' recipe title lists.
        cuisine_preferences: List of requested cuisine types.
        leftovers: Optional list of leftover portions to use first.
        freezer_items: Optional list of freezer items requiring defrosting.
        recurring_constraints: Optional list of RecurringMealTemplate objects already assigned.

    Returns:
        Complete formatted prompt string ready for LLM submission.
    """
    schema_json = _get_schema_json()
    system_prompt = format_system_prompt(meal_types)
    equipment_info = format_equipment(equipment)
    inventory_info = format_inventory(inventory)
    expiring_info = format_expiring(expiring)

    prompt = f"""{system_prompt.format(schema_json=schema_json)}

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

    if leftovers:
        leftovers_info = format_leftovers(leftovers)
        prompt += f"""

LEFTOVERS TO USE FIRST:
{leftovers_info}"""

    if freezer_items:
        freezer_info = format_freezer_items(freezer_items)
        prompt += f"""

FREEZER ITEMS (need defrosting):
{freezer_info}"""

    if recurring_constraints:
        recurring_info = format_recurring_constraints(recurring_constraints)
        if recurring_info:
            prompt += f"\n\nRECURRING MEALS (pre-assigned, skip these slots):\n{recurring_info}"

    prompt += "\n\nGenerate the meal plan JSON now."
    return prompt


def build_substitution_prompt(
    recipe_title: str,
    recipe_ingredients: list[dict],
    recipe_steps: list[dict],
    original_ingredient: str,
    replacement_ingredient: str,
    allergen_ingredients: set[str] | None = None,
) -> str:
    """Build a prompt for ingredient substitution in a recipe.

    Args:
        recipe_title: Title of the recipe being modified.
        recipe_ingredients: List of ingredient dicts with name, quantity, unit.
        recipe_steps: List of step dicts with step_order, instruction, duration_min.
        original_ingredient: Name of the ingredient to replace.
        replacement_ingredient: Name of the replacement ingredient.
        allergen_ingredients: Optional set of allergen ingredient names to warn about.

    Returns:
        Complete formatted prompt string ready for LLM submission.
    """
    ingredients_text = "\n".join(
        f"- {ing.get('ingredient_name', ing.get('name', 'Unknown'))}: "
        f"{ing.get('quantity', 0)} {ing.get('unit', '')}"
        for ing in recipe_ingredients
    )
    steps_text = "\n".join(
        f"{s.get('step_order', i + 1)}. {s.get('instruction', '')}"
        for i, s in enumerate(recipe_steps)
    )
    allergen_note = ""
    if allergen_ingredients:
        allergen_list = ", ".join(sorted(allergen_ingredients))
        allergen_note = f"\nALLERGEN WARNING: The following are allergens for household members: {allergen_list}. Do NOT introduce these ingredients."

    return f"""You are a cooking assistant. Modify the following recipe by substituting one ingredient.

RECIPE: {recipe_title}

CURRENT INGREDIENTS:
{ingredients_text}

CURRENT STEPS:
{steps_text}

SUBSTITUTION INSTRUCTION: Replace "{original_ingredient}" with "{replacement_ingredient}".
Adjust quantities, steps, and cooking instructions as needed for the swap.{allergen_note}

Respond ONLY with valid JSON matching this schema:
{{
  "title": "string",
  "description": "string",
  "prep_time_min": int,
  "cook_time_min": int,
  "servings": int,
  "ingredients": [
    {{"ingredient_name": "string", "quantity": float, "unit": "string", "is_optional": false}}
  ],
  "steps": [
    {{"step_order": int, "instruction": "string", "duration_min": int or null}}
  ]
}}

Generate the modified recipe JSON now."""


def build_quick_suggestion_prompt(
    inventory_items: list[dict],
    expiring_items: list[dict],
    max_results: int,
    allergen_ingredients: set[str] | None = None,
) -> str:
    """Build a prompt for quick meal suggestions based on available inventory.

    Args:
        inventory_items: List of dicts with name, quantity, unit fields.
        expiring_items: List of dicts with name, quantity, unit, expiry fields.
        max_results: Maximum number of suggestions to return.
        allergen_ingredients: Optional set of allergen ingredient names to avoid.

    Returns:
        Complete formatted prompt string ready for LLM submission.
    """
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
