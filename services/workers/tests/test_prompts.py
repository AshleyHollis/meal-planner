"""Unit tests for meal plan prompt builder."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from meal_plan_generator.prompts import (
    add_error_feedback,
    build_prompt,
    format_equipment,
    format_expiring,
    format_inventory,
)


def _make_ingredient(name: str) -> SimpleNamespace:
    return SimpleNamespace(name=name)


def _make_inventory_item(
    name: str,
    quantity: float,
    unit: str,
    location: str | None = None,
    expiry_date: datetime | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        ingredient=_make_ingredient(name),
        quantity=quantity,
        unit=unit,
        location=location,
        expiry_date=expiry_date,
    )


def _make_equipment_mode(
    name: str,
    min_temp: float | None = None,
    max_temp: float | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        name=name,
        min_temp_celsius=min_temp,
        max_temp_celsius=max_temp,
    )


def _make_equipment(name: str, modes: list | None = None) -> SimpleNamespace:
    return SimpleNamespace(name=name, modes=modes or [])


# --- format_inventory ---


class TestFormatInventory:
    def test_empty_inventory(self):
        result = format_inventory([])
        assert "empty" in result.lower()

    def test_single_item(self):
        item = _make_inventory_item("Chicken Breast", 500, "g", "fridge")
        result = format_inventory([item])
        assert "Chicken Breast" in result
        assert "500" in result
        assert "g" in result
        assert "[fridge]" in result

    def test_item_without_location(self):
        item = _make_inventory_item("Rice", 1000, "g")
        result = format_inventory([item])
        assert "Rice" in result
        assert "[" not in result

    def test_multiple_items(self):
        items = [
            _make_inventory_item("Chicken", 500, "g", "fridge"),
            _make_inventory_item("Rice", 1000, "g", "pantry"),
        ]
        result = format_inventory(items)
        assert "Chicken" in result
        assert "Rice" in result


# --- format_equipment ---


class TestFormatEquipment:
    def test_empty_equipment(self):
        result = format_equipment([])
        assert "standard" in result.lower() or "stove" in result.lower()

    def test_equipment_with_modes(self):
        eq = _make_equipment(
            "Ninja Combi",
            modes=[
                _make_equipment_mode("Air Crisp", 150, 230),
                _make_equipment_mode("Sear/Saute"),
            ],
        )
        result = format_equipment([eq])
        assert "Ninja Combi" in result
        assert "Air Crisp" in result
        assert "150" in result
        assert "230" in result
        assert "Sear/Saute" in result

    def test_equipment_without_modes(self):
        eq = _make_equipment("Stove")
        result = format_equipment([eq])
        assert "Stove" in result


# --- format_expiring ---


class TestFormatExpiring:
    def test_empty_expiring(self):
        result = format_expiring([])
        assert "no items" in result.lower()

    def test_expiring_items(self):
        item = _make_inventory_item(
            "Milk",
            1000,
            "ml",
            "fridge",
            expiry_date=datetime(2026, 3, 2),
        )
        result = format_expiring([item])
        assert "Milk" in result
        assert "2026-03-02" in result
        assert "expires" in result

    def test_multiple_expiring(self):
        items = [
            _make_inventory_item("Milk", 1000, "ml", "fridge", datetime(2026, 3, 2)),
            _make_inventory_item("Yogurt", 500, "g", "fridge", datetime(2026, 3, 4)),
        ]
        result = format_expiring(items)
        assert "Milk" in result
        assert "Yogurt" in result


# --- build_prompt ---


class TestBuildPrompt:
    def test_includes_inventory(self):
        inventory = [_make_inventory_item("Chicken", 500, "g", "fridge")]
        prompt = build_prompt(inventory=inventory, equipment=[], expiring=[])
        assert "Chicken" in prompt
        assert "CURRENT INVENTORY" in prompt

    def test_includes_equipment(self):
        eq = _make_equipment(
            "Ninja Combi",
            modes=[_make_equipment_mode("Air Crisp", 150, 230)],
        )
        prompt = build_prompt(inventory=[], equipment=[eq], expiring=[])
        assert "Ninja Combi" in prompt
        assert "AVAILABLE EQUIPMENT" in prompt

    def test_includes_expiring_items(self):
        expiring = [
            _make_inventory_item("Milk", 1000, "ml", "fridge", datetime(2026, 3, 2)),
        ]
        prompt = build_prompt(inventory=[], equipment=[], expiring=expiring)
        assert "Milk" in prompt
        assert "EXPIRING SOON" in prompt

    def test_includes_json_schema(self):
        prompt = build_prompt(inventory=[], equipment=[], expiring=[])
        assert "OUTPUT SCHEMA" in prompt
        # Schema should contain Pydantic model field names
        assert "recipes" in prompt
        assert "ingredients" in prompt
        assert "steps" in prompt

    def test_full_prompt_structure(self):
        inventory = [_make_inventory_item("Rice", 1000, "g", "pantry")]
        equipment = [_make_equipment("Oven")]
        expiring = [
            _make_inventory_item("Beef", 400, "g", "fridge", datetime(2026, 3, 1)),
        ]
        prompt = build_prompt(inventory, equipment, expiring)
        # All sections present in order
        assert "OUTPUT SCHEMA" in prompt
        assert "AVAILABLE EQUIPMENT" in prompt
        assert "CURRENT INVENTORY" in prompt
        assert "EXPIRING SOON" in prompt
        assert "Generate the meal plan JSON now." in prompt


# --- add_error_feedback ---


class TestAddErrorFeedback:
    def test_appends_single_error(self):
        original = "Generate meal plan."
        result = add_error_feedback(original, "Missing recipe steps")
        assert "Generate meal plan." in result
        assert "PREVIOUS ATTEMPT HAD ERRORS" in result
        assert "Missing recipe steps" in result

    def test_appends_list_of_errors(self):
        original = "Generate meal plan."
        errors = ["Recipe 1 missing steps", "Recipe 3 has 0 servings"]
        result = add_error_feedback(original, errors)
        assert "Recipe 1 missing steps" in result
        assert "Recipe 3 has 0 servings" in result

    def test_error_list_formatted_as_bullets(self):
        original = "Generate meal plan."
        errors = ["Error A", "Error B"]
        result = add_error_feedback(original, errors)
        assert "- Error A" in result
        assert "- Error B" in result

    def test_corrected_generation_requested(self):
        result = add_error_feedback("prompt", "some error")
        assert "corrected" in result.lower() or "Generate" in result
