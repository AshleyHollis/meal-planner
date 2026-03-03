"""Unit tests for the constraint validator."""

from __future__ import annotations

from meal_plan_generator.schemas import RecipeIngredientSchema, RecipeStepSchema
from meal_plan_generator.validator import validate_constraints

from .conftest import _make_plan, _make_recipe

# ---------------------------------------------------------------------------
# 1. At least 5 recipes required
# ---------------------------------------------------------------------------


class TestRecipeCount:
    def test_too_few_recipes(self, default_inventory, default_equipment):
        plan = _make_plan(recipes=[_make_recipe() for _ in range(4)])
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("Expected at least 5 recipes, got 4" in e for e in errors)

    def test_too_many_recipes(self, default_inventory, default_equipment):
        plan = _make_plan(recipes=[_make_recipe() for _ in range(9)])
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert not any("Expected" in e and "recipes" in e for e in errors)

    def test_zero_recipes(self, default_inventory, default_equipment):
        plan = _make_plan(recipes=[])
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("Expected at least 5 recipes, got 0" in e for e in errors)


# ---------------------------------------------------------------------------
# 2. Servings must be 2
# ---------------------------------------------------------------------------


class TestServings:
    def test_wrong_servings_rejected(self, default_inventory, default_equipment):
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        recipes[3] = _make_recipe(title="Bad Servings", servings=4)
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("servings=4, expected 2" in e for e in errors)

    def test_one_serving_rejected(self, default_inventory, default_equipment):
        recipes = [_make_recipe(title=f"R{i}", servings=1) for i in range(7)]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert len([e for e in errors if "expected 2" in e]) == 7


# ---------------------------------------------------------------------------
# 3. Unknown equipment modes rejected
# ---------------------------------------------------------------------------


class TestEquipmentModes:
    def test_unknown_equipment_name(self, default_inventory, default_equipment):
        step = RecipeStepSchema(
            step_order=1,
            instruction="Use blender",
            equipment_name="Blender",
            equipment_mode="Pulse",
        )
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        recipes[0] = _make_recipe(title="Bad Equipment", steps=[step])
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("unknown equipment 'Blender'" in e for e in errors)

    def test_unknown_mode_for_known_equipment(self, default_inventory, default_equipment):
        step = RecipeStepSchema(
            step_order=1,
            instruction="Use Ninja",
            equipment_name="Ninja Combi",
            equipment_mode="Turbo Blast",
        )
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        recipes[0] = _make_recipe(title="Bad Mode", steps=[step])
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("unknown mode 'Turbo Blast' for 'Ninja Combi'" in e for e in errors)

    def test_valid_equipment_and_mode_pass(self, default_inventory, default_equipment):
        step = RecipeStepSchema(
            step_order=1,
            instruction="Air crisp chicken",
            equipment_name="Ninja Combi",
            equipment_mode="Air Crisp",
        )
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        recipes[0] = _make_recipe(title="Good Equipment", steps=[step])
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert not any("equipment" in e.lower() for e in errors)

    def test_step_without_equipment_passes(self, default_inventory, default_equipment):
        """Steps with no equipment_name/mode should not trigger equipment errors."""
        step = RecipeStepSchema(step_order=1, instruction="Chop onions")
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        recipes[0] = _make_recipe(title="Manual Step", steps=[step])
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert not any("equipment" in e.lower() for e in errors)


# ---------------------------------------------------------------------------
# 4. Allergen validation
# ---------------------------------------------------------------------------


class TestAllergenValidation:
    def test_allergen_ingredient_rejected(self, default_inventory, default_equipment):
        """Recipe containing allergen ingredient should fail validation."""
        allergens = {"peanuts", "shellfish"}
        ing = RecipeIngredientSchema(ingredient_name="peanuts", quantity=100, unit="g")
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        recipes[0] = _make_recipe(title="Peanut Recipe", ingredients=[ing])
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(
            plan,
            default_inventory,
            default_equipment,
            allergen_ingredients=allergens,
        )
        assert any("allergen ingredient 'peanuts'" in e for e in errors)

    def test_no_allergens_passes(self, default_inventory, default_equipment):
        """Plan with no allergen ingredients should pass."""
        allergens = {"peanuts", "shellfish"}
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(
            plan,
            default_inventory,
            default_equipment,
            allergen_ingredients=allergens,
        )
        assert not any("allergen" in e.lower() for e in errors)

    def test_case_insensitive_allergen_check(self, default_inventory, default_equipment):
        """Allergen check should be case-insensitive."""
        allergens = {"peanuts"}
        ing = RecipeIngredientSchema(ingredient_name="Peanuts", quantity=100, unit="g")
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        recipes[0] = _make_recipe(title="Peanut Recipe", ingredients=[ing])
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(
            plan,
            default_inventory,
            default_equipment,
            allergen_ingredients=allergens,
        )
        assert any("allergen" in e.lower() for e in errors)


# ---------------------------------------------------------------------------
# 5. Cuisine match validation
# ---------------------------------------------------------------------------


class TestCuisineValidation:
    def test_cuisine_match_passes_at_70_percent(self, default_inventory, default_equipment):
        """Plan with ≥70% cuisine match should pass."""
        recipes = [
            _make_recipe(title="R1", cuisine_type="Mexican"),
            _make_recipe(title="R2", cuisine_type="Mexican"),
            _make_recipe(title="R3", cuisine_type="Mexican"),
            _make_recipe(title="R4", cuisine_type="Mexican"),
            _make_recipe(title="R5", cuisine_type="Mexican"),
            _make_recipe(title="R6", cuisine_type="Italian"),
            _make_recipe(title="R7", cuisine_type="Asian"),
        ]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(
            plan,
            default_inventory,
            default_equipment,
            cuisine_preferences=["Mexican"],
        )
        assert not any("Cuisine match" in e for e in errors)

    def test_cuisine_match_fails_below_70_percent(self, default_inventory, default_equipment):
        """Plan with <70% cuisine match should fail."""
        recipes = [
            _make_recipe(title="R1", cuisine_type="Mexican"),
            _make_recipe(title="R2", cuisine_type="Mexican"),
            _make_recipe(title="R3", cuisine_type="Mexican"),
            _make_recipe(title="R4", cuisine_type="Italian"),
            _make_recipe(title="R5", cuisine_type="Italian"),
            _make_recipe(title="R6", cuisine_type="Asian"),
            _make_recipe(title="R7", cuisine_type="Asian"),
        ]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(
            plan,
            default_inventory,
            default_equipment,
            cuisine_preferences=["Mexican"],
        )
        assert any("Cuisine match" in e and "43%" in e for e in errors)

    def test_no_cuisine_preference_skips_validation(self, default_inventory, default_equipment):
        """When no cuisine preferences specified, skip validation."""
        recipes = [_make_recipe(title=f"R{i}") for i in range(7)]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(
            plan,
            default_inventory,
            default_equipment,
            cuisine_preferences=None,
        )
        assert not any("Cuisine match" in e for e in errors)


# ---------------------------------------------------------------------------
# 6. Valid plan passes
# ---------------------------------------------------------------------------


class TestValidPlan:
    def test_valid_plan_no_errors(self, valid_plan, default_inventory, default_equipment):
        errors = validate_constraints(valid_plan, default_inventory, default_equipment)
        assert errors == []
