"""Unit tests for the constraint validator."""

from __future__ import annotations

from meal_plan_generator.schemas import RecipeStepSchema
from meal_plan_generator.validator import validate_constraints

from .conftest import _make_plan, _make_recipe

# ---------------------------------------------------------------------------
# 1. Exactly 7 recipes required
# ---------------------------------------------------------------------------


class TestRecipeCount:
    def test_too_few_recipes(self, default_inventory, default_equipment):
        plan = _make_plan(recipes=[_make_recipe() for _ in range(5)])
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("Expected 7 recipes, got 5" in e for e in errors)

    def test_too_many_recipes(self, default_inventory, default_equipment):
        plan = _make_plan(recipes=[_make_recipe() for _ in range(9)])
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("Expected 7 recipes, got 9" in e for e in errors)

    def test_zero_recipes(self, default_inventory, default_equipment):
        plan = _make_plan(recipes=[])
        errors = validate_constraints(plan, default_inventory, default_equipment)
        assert any("Expected 7 recipes, got 0" in e for e in errors)


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
# 4. Valid plan passes
# ---------------------------------------------------------------------------


class TestValidPlan:
    def test_valid_plan_no_errors(self, valid_plan, default_inventory, default_equipment):
        errors = validate_constraints(valid_plan, default_inventory, default_equipment)
        assert errors == []
