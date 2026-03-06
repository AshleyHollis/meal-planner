"""Constraint validator for LLM-generated meal plans."""

from __future__ import annotations

from .schemas import GeneratedMealPlan


def validate_constraints(
    plan: GeneratedMealPlan,
    inventory: list[str],
    equipment: dict[str, list[str]],
    *,
    allergen_ingredients: set[str] | None = None,
    cuisine_preferences: list[str] | None = None,
    meal_types: list[str] | None = None,
) -> list[str]:
    """Validate a generated meal plan against hard constraints.

    Args:
        plan: The LLM-generated meal plan to validate.
        inventory: List of available ingredient names (lowercase).
        equipment: Mapping of equipment name -> list of mode names.
        allergen_ingredients: Set of ingredient names (lowercase) that are allergens.
        cuisine_preferences: List of requested cuisine types (≥70% match required).
        meal_types: Optional list of requested meal types. When multiple types provided,
            validates that total recipe count matches len(meal_types) * 7 (±2 tolerance).

    Returns:
        List of error strings. Empty list means valid.
    """
    errors: list[str] = []

    effective_types = meal_types or ["dinner"]

    # 1. Recipe count check
    if len(effective_types) > 1:
        # Multi-meal: expected total is len(meal_types) * 7, allow ±2 tolerance
        expected_total = len(effective_types) * 7
        tolerance = 2
        if abs(len(plan.recipes) - expected_total) > tolerance:
            errors.append(
                f"Expected ~{expected_total} recipes for {len(effective_types)} meal types "
                f"(±{tolerance}), got {len(plan.recipes)}"
            )
    else:
        # Single meal type: at least 5 recipes (ideally 7)
        if len(plan.recipes) < 5:
            errors.append(f"Expected at least 5 recipes, got {len(plan.recipes)}")

    # Track cuisine matches for cuisine preference validation
    cuisine_matches = 0

    for i, recipe in enumerate(plan.recipes):
        label = f"Recipe {i + 1} ({recipe.title})"

        # 2. Servings must equal 2
        if recipe.servings != 2:
            errors.append(f"{label}: servings={recipe.servings}, expected 2")

        # 3. Equipment modes must exist — skip if no equipment configured
        if equipment:
            for step in recipe.steps:
                if step.equipment_name and step.equipment_mode:
                    eq_name = step.equipment_name
                    mode = step.equipment_mode
                    if eq_name not in equipment:
                        errors.append(
                            f"{label} step {step.step_order}: unknown equipment '{eq_name}'"
                        )
                    elif mode not in equipment[eq_name]:
                        errors.append(
                            f"{label} step {step.step_order}: unknown mode '{mode}' for '{eq_name}'"
                        )

        # 4. Inventory check REMOVED — recipes may include ingredients not in
        #    inventory; those will be added to the grocery list.  The prompt
        #    already prioritizes inventory items, so this is guidance not a gate.

        # 5. Allergen check — no recipe should contain allergen ingredients
        if allergen_ingredients:
            for ing in recipe.ingredients:
                if ing.ingredient_name.lower() in allergen_ingredients:
                    errors.append(f"{label}: contains allergen ingredient '{ing.ingredient_name}'")

        # 6. Track cuisine matches for validation
        if (
            cuisine_preferences
            and recipe.cuisine_type
            and recipe.cuisine_type in cuisine_preferences
        ):
            cuisine_matches += 1

    # 7. Cuisine match check — at least 70% should match when preferences specified
    if cuisine_preferences and len(plan.recipes) > 0:
        match_percentage = (cuisine_matches / len(plan.recipes)) * 100
        if match_percentage < 70:
            errors.append(
                f"Cuisine match: {match_percentage:.0f}% ({cuisine_matches}/{len(plan.recipes)}), expected ≥70%"
            )

    return errors
