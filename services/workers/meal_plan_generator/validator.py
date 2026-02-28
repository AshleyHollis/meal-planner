"""Constraint validator for LLM-generated meal plans."""

from __future__ import annotations

from .schemas import GeneratedMealPlan


def validate_constraints(
    plan: GeneratedMealPlan,
    inventory: list[str],
    equipment: dict[str, list[str]],
) -> list[str]:
    """Validate a generated meal plan against hard constraints.

    Args:
        plan: The LLM-generated meal plan to validate.
        inventory: List of available ingredient names (lowercase).
        equipment: Mapping of equipment name -> list of mode names.

    Returns:
        List of error strings. Empty list means valid.
    """
    errors: list[str] = []

    # 1. Exactly 7 recipes
    if len(plan.recipes) != 7:
        errors.append(f"Expected 7 recipes, got {len(plan.recipes)}")

    for i, recipe in enumerate(plan.recipes):
        label = f"Recipe {i + 1} ({recipe.title})"

        # 2. Servings must equal 2
        if recipe.servings != 2:
            errors.append(f"{label}: servings={recipe.servings}, expected 2")

        # 3. Equipment modes must exist
        for step in recipe.steps:
            if step.equipment_name and step.equipment_mode:
                eq_name = step.equipment_name
                mode = step.equipment_mode
                if eq_name not in equipment:
                    errors.append(f"{label} step {step.step_order}: unknown equipment '{eq_name}'")
                elif mode not in equipment[eq_name]:
                    errors.append(
                        f"{label} step {step.step_order}: unknown mode '{mode}' for '{eq_name}'"
                    )

        # 4. Ingredients must be referenced (exist in inventory)
        for ing in recipe.ingredients:
            if ing.ingredient_name.lower() not in inventory:
                errors.append(f"{label}: ingredient '{ing.ingredient_name}' not in inventory")

    return errors
