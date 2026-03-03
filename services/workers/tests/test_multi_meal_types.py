"""Tests for multi-meal-type support in Phase 4."""

from __future__ import annotations

from meal_plan_generator.prompts import (
    build_prompt,
    format_meal_types_description,
    format_recurring_constraints,
    format_system_prompt,
)
from meal_plan_generator.validator import validate_constraints

from .conftest import _make_plan, _make_recipe

# ---------------------------------------------------------------------------
# format_meal_types_description
# ---------------------------------------------------------------------------


class TestFormatMealTypesDescription:
    def test_none_returns_dinner(self):
        assert format_meal_types_description(None) == "dinner"

    def test_single_dinner_returns_dinner(self):
        assert format_meal_types_description(["dinner"]) == "dinner"

    def test_single_breakfast_returns_breakfast(self):
        assert format_meal_types_description(["breakfast"]) == "breakfast"

    def test_two_types_joined(self):
        result = format_meal_types_description(["breakfast", "dinner"])
        assert "breakfast" in result
        assert "dinner" in result
        assert "and" in result

    def test_three_types(self):
        result = format_meal_types_description(["breakfast", "lunch", "dinner"])
        assert "breakfast" in result
        assert "lunch" in result
        assert "dinner" in result


# ---------------------------------------------------------------------------
# format_system_prompt
# ---------------------------------------------------------------------------


class TestFormatSystemPrompt:
    def test_default_produces_dinner_prompt(self):
        prompt = format_system_prompt()
        assert "dinner" in prompt
        assert "7 recipes" in prompt or "EXACTLY 7" in prompt

    def test_single_dinner_explicit(self):
        prompt = format_system_prompt(["dinner"])
        assert "dinner" in prompt
        assert "{schema_json}" in prompt  # placeholder still in place

    def test_multi_meal_mentions_all_types(self):
        prompt = format_system_prompt(["breakfast", "dinner"])
        assert "breakfast" in prompt
        assert "dinner" in prompt
        assert "14" in prompt  # 2 types * 7 days

    def test_multi_meal_includes_meal_type_instruction(self):
        prompt = format_system_prompt(["breakfast", "lunch", "dinner"])
        assert '"meal_type"' in prompt
        assert "21" in prompt  # 3 types * 7 days

    def test_schema_placeholder_present(self):
        prompt = format_system_prompt(["dinner"])
        assert "{schema_json}" in prompt

    def test_multi_meal_includes_type_descriptions(self):
        prompt = format_system_prompt(["breakfast", "dinner"])
        assert "7 breakfast" in prompt
        assert "7 dinner" in prompt


# ---------------------------------------------------------------------------
# build_prompt with meal_types
# ---------------------------------------------------------------------------


class TestBuildPromptMealTypes:
    def test_default_meal_types_produces_dinner_prompt(self):
        prompt = build_prompt(inventory=[], equipment=[], expiring=[])
        assert "dinner" in prompt.lower()

    def test_single_dinner_explicit(self):
        prompt = build_prompt(inventory=[], equipment=[], expiring=[], meal_types=["dinner"])
        assert "dinner" in prompt.lower()

    def test_multi_meal_types_in_prompt(self):
        prompt = build_prompt(
            inventory=[], equipment=[], expiring=[], meal_types=["breakfast", "dinner"]
        )
        assert "breakfast" in prompt
        assert "dinner" in prompt


# ---------------------------------------------------------------------------
# format_recurring_constraints
# ---------------------------------------------------------------------------


class TestFormatRecurringConstraints:
    def _make_template(self, day: int, meal_type: str, title: str):
        from types import SimpleNamespace

        return SimpleNamespace(day=day, meal_type=meal_type, recipe_title=title, recipe=None)

    def test_empty_list_returns_empty(self):
        assert format_recurring_constraints([]) == ""

    def test_none_equivalent(self):
        # Empty list should return empty string
        result = format_recurring_constraints([])
        assert result == ""

    def test_single_template(self):
        tpl = self._make_template(0, "dinner", "Roast Chicken")
        result = format_recurring_constraints([tpl])
        assert "Monday" in result
        assert "dinner" in result
        assert "Roast Chicken" in result

    def test_multiple_templates(self):
        templates = [
            self._make_template(0, "breakfast", "Oatmeal"),
            self._make_template(4, "dinner", "Fish and Chips"),
        ]
        result = format_recurring_constraints(templates)
        assert "Monday" in result
        assert "Friday" in result
        assert "Oatmeal" in result
        assert "Fish and Chips" in result

    def test_all_days_named(self):
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for i, name in enumerate(day_names):
            tpl = self._make_template(i, "dinner", f"Recipe {i}")
            result = format_recurring_constraints([tpl])
            assert name in result


# ---------------------------------------------------------------------------
# Multi-meal validator
# ---------------------------------------------------------------------------


class TestMultiMealValidator:
    def test_single_type_still_requires_5_min(self):
        plan = _make_plan(recipes=[_make_recipe() for _ in range(4)])
        errors = validate_constraints(plan, [], {}, meal_types=["dinner"])
        assert any("at least 5" in e for e in errors)

    def test_multi_type_14_recipes_passes(self):
        recipes = [_make_recipe(title=f"R{i}") for i in range(14)]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, [], {}, meal_types=["breakfast", "dinner"])
        # Should not error on recipe count (14 = 2 * 7, within tolerance)
        count_errors = [e for e in errors if "recipes" in e and "Expected" in e]
        assert len(count_errors) == 0

    def test_multi_type_wrong_count_fails(self):
        # 5 recipes for 2 meal types (expected 14, way off)
        plan = _make_plan(recipes=[_make_recipe(title=f"R{i}") for i in range(5)])
        errors = validate_constraints(plan, [], {}, meal_types=["breakfast", "dinner"])
        assert any("recipes" in e for e in errors)

    def test_multi_type_within_tolerance_passes(self):
        # 13 recipes for 2 meal types (expected 14, ±2 tolerance → 12-16 OK)
        recipes = [_make_recipe(title=f"R{i}") for i in range(13)]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, [], {}, meal_types=["breakfast", "dinner"])
        count_errors = [e for e in errors if "Expected ~14" in e]
        assert len(count_errors) == 0

    def test_none_meal_types_defaults_to_single_dinner_check(self):
        plan = _make_plan(recipes=[_make_recipe() for _ in range(7)])
        errors = validate_constraints(plan, [], {}, meal_types=None)
        # Should use single-type check (at least 5)
        assert errors == []

    def test_three_types_21_recipes_passes(self):
        recipes = [_make_recipe(title=f"R{i}") for i in range(21)]
        plan = _make_plan(recipes=recipes)
        errors = validate_constraints(plan, [], {}, meal_types=["breakfast", "lunch", "dinner"])
        count_errors = [e for e in errors if "Expected ~21" in e]
        assert len(count_errors) == 0
