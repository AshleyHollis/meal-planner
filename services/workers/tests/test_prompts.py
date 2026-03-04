"""Unit tests for meal plan prompt builder."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from meal_plan_generator.prompts import (
    add_error_feedback,
    build_prompt,
    build_quick_suggestion_prompt,
    build_substitution_prompt,
    format_cuisine_preferences,
    format_equipment,
    format_expiring,
    format_favorites,
    format_inventory,
    format_preferences,
    format_rating_insights,
    format_recent_meals,
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


# --- format_preferences ---


class TestFormatPreferences:
    def test_empty_preferences(self):
        result = format_preferences({})
        assert result == ""

    def test_single_member_with_allergy(self):
        prefs = {
            "Alice": [
                {"preference_type": "allergy", "value": "peanuts"},
            ]
        }
        result = format_preferences(prefs)
        assert "Alice" in result
        assert "ALLERGIES" in result
        assert "HARD BLOCK" in result
        assert "peanuts" in result

    def test_multiple_preference_types(self):
        prefs = {
            "Bob": [
                {"preference_type": "allergy", "value": "shellfish"},
                {"preference_type": "dietary_restriction", "value": "vegetarian"},
                {"preference_type": "dislike", "value": "mushrooms"},
                {"preference_type": "like", "value": "pasta"},
            ]
        }
        result = format_preferences(prefs)
        assert "Bob" in result
        assert "shellfish" in result
        assert "vegetarian" in result
        assert "mushrooms" in result
        assert "pasta" in result

    def test_multiple_members(self):
        prefs = {
            "Alice": [{"preference_type": "allergy", "value": "peanuts"}],
            "Bob": [{"preference_type": "like", "value": "chicken"}],
        }
        result = format_preferences(prefs)
        assert "Alice" in result
        assert "Bob" in result


# --- format_recent_meals ---


class TestFormatRecentMeals:
    def test_empty_recent_meals(self):
        result = format_recent_meals([])
        assert result == ""

    def test_recent_meals_list(self):
        meals = [
            {"title": "Chicken Stir Fry", "cuisine_type": "Asian"},
            {"title": "Spaghetti Carbonara", "cuisine_type": "Italian"},
        ]
        result = format_recent_meals(meals)
        assert "Do NOT repeat" in result
        assert "Chicken Stir Fry" in result
        assert "Spaghetti Carbonara" in result


# --- format_favorites ---


class TestFormatFavorites:
    def test_empty_favorites(self):
        result = format_favorites([])
        assert result == ""

    def test_favorites_list(self):
        favorites = ["Lasagna", "Tacos", "Pad Thai"]
        result = format_favorites(favorites)
        assert "Consider including" in result
        assert "Lasagna" in result
        assert "Tacos" in result
        assert "Pad Thai" in result


# --- format_rating_insights ---


class TestFormatRatingInsights:
    def test_empty_insights(self):
        result = format_rating_insights({})
        assert result == ""

    def test_low_rated_only(self):
        insights = {"low_rated": ["Bad Recipe", "Awful Dish"]}
        result = format_rating_insights(insights)
        assert "AVOID" in result
        assert "Bad Recipe" in result
        assert "Awful Dish" in result

    def test_high_rated_only(self):
        insights = {"high_rated": ["Amazing Dish", "Fantastic Meal"]}
        result = format_rating_insights(insights)
        assert "PREFER" in result
        assert "Amazing Dish" in result
        assert "Fantastic Meal" in result

    def test_both_high_and_low(self):
        insights = {
            "low_rated": ["Bad Recipe"],
            "high_rated": ["Great Recipe"],
        }
        result = format_rating_insights(insights)
        assert "AVOID" in result
        assert "PREFER" in result
        assert "Bad Recipe" in result
        assert "Great Recipe" in result


# --- format_cuisine_preferences ---


class TestFormatCuisinePreferences:
    def test_empty_cuisine_preferences(self):
        result = format_cuisine_preferences([])
        assert result == ""

    def test_single_cuisine(self):
        result = format_cuisine_preferences(["Italian"])
        assert "70%" in result
        assert "Italian" in result

    def test_multiple_cuisines(self):
        result = format_cuisine_preferences(["Mexican", "Asian", "Italian"])
        assert "70%" in result
        assert "Mexican" in result
        assert "Asian" in result
        assert "Italian" in result


# --- build_prompt with personalization ---


class TestBuildPromptWithPersonalization:
    def test_includes_member_preferences(self):
        prefs = {"Alice": [{"preference_type": "allergy", "value": "peanuts"}]}
        prompt = build_prompt(
            inventory=[],
            equipment=[],
            expiring=[],
            member_preferences=prefs,
        )
        assert "MEMBER PREFERENCES" in prompt
        assert "Alice" in prompt
        assert "peanuts" in prompt

    def test_includes_recent_meals(self):
        meals = [{"title": "Lasagna", "cuisine_type": "Italian"}]
        prompt = build_prompt(
            inventory=[],
            equipment=[],
            expiring=[],
            recent_meals=meals,
        )
        assert "RECENT MEALS" in prompt
        assert "Lasagna" in prompt

    def test_includes_favorites(self):
        prompt = build_prompt(
            inventory=[],
            equipment=[],
            expiring=[],
            favorites=["Tacos", "Pizza"],
        )
        assert "FAVORITES" in prompt
        assert "Tacos" in prompt
        assert "Pizza" in prompt

    def test_includes_rating_insights(self):
        insights = {"high_rated": ["Great Dish"], "low_rated": ["Bad Dish"]}
        prompt = build_prompt(
            inventory=[],
            equipment=[],
            expiring=[],
            rating_insights=insights,
        )
        assert "RATING INSIGHTS" in prompt
        assert "Great Dish" in prompt
        assert "Bad Dish" in prompt

    def test_includes_cuisine_preferences(self):
        prompt = build_prompt(
            inventory=[],
            equipment=[],
            expiring=[],
            cuisine_preferences=["Mexican", "Italian"],
        )
        assert "CUISINE PREFERENCE" in prompt
        assert "Mexican" in prompt
        assert "Italian" in prompt

    def test_omits_sections_when_data_absent(self):
        prompt = build_prompt(
            inventory=[],
            equipment=[],
            expiring=[],
            member_preferences=None,
            recent_meals=None,
            favorites=None,
            rating_insights=None,
            cuisine_preferences=None,
        )
        assert "MEMBER PREFERENCES" not in prompt
        assert "RECENT MEALS" not in prompt
        assert "FAVORITES" not in prompt
        assert "RATING INSIGHTS" not in prompt
        assert "CUISINE PREFERENCE" not in prompt


# --- build_substitution_prompt ---


class TestBuildSubstitutionPrompt:
    def test_contains_ingredient_swap_instruction(self):
        prompt = build_substitution_prompt(
            recipe_title="Chicken Pasta",
            recipe_ingredients=[
                {"ingredient_name": "Chicken", "quantity": 300, "unit": "g"},
                {"ingredient_name": "Pasta", "quantity": 200, "unit": "g"},
            ],
            recipe_steps=[
                {"step_order": 1, "instruction": "Cook chicken", "duration_min": 15},
            ],
            original_ingredient="Chicken",
            replacement_ingredient="Beef",
        )
        assert "Chicken" in prompt
        assert "Beef" in prompt
        assert "Replace" in prompt or "substitute" in prompt.lower() or "SUBSTITUTION" in prompt

    def test_contains_recipe_title(self):
        prompt = build_substitution_prompt(
            recipe_title="Test Recipe",
            recipe_ingredients=[],
            recipe_steps=[],
            original_ingredient="Salt",
            replacement_ingredient="Sea Salt",
        )
        assert "Test Recipe" in prompt

    def test_allergen_note_included_when_provided(self):
        prompt = build_substitution_prompt(
            recipe_title="Test",
            recipe_ingredients=[],
            recipe_steps=[],
            original_ingredient="Milk",
            replacement_ingredient="Almond Milk",
            allergen_ingredients={"peanuts", "shellfish"},
        )
        assert "ALLERGEN" in prompt
        assert "peanuts" in prompt

    def test_no_allergen_note_when_empty(self):
        prompt = build_substitution_prompt(
            recipe_title="Test",
            recipe_ingredients=[],
            recipe_steps=[],
            original_ingredient="Milk",
            replacement_ingredient="Oat Milk",
            allergen_ingredients=None,
        )
        assert "ALLERGEN" not in prompt

    def test_contains_json_schema_hint(self):
        prompt = build_substitution_prompt(
            recipe_title="Test",
            recipe_ingredients=[],
            recipe_steps=[],
            original_ingredient="A",
            replacement_ingredient="B",
        )
        assert "ingredients" in prompt
        assert "steps" in prompt


# --- build_quick_suggestion_prompt ---


class TestBuildQuickSuggestionPrompt:
    def test_contains_inventory_items(self):
        inventory = [
            {"name": "Chicken Breast", "quantity": 500, "unit": "g"},
            {"name": "Rice", "quantity": 1000, "unit": "g"},
        ]
        prompt = build_quick_suggestion_prompt(
            inventory_items=inventory,
            expiring_items=[],
            max_results=3,
        )
        assert "Chicken Breast" in prompt
        assert "Rice" in prompt
        assert "CURRENT INVENTORY" in prompt

    def test_contains_expiring_items(self):
        expiring = [{"name": "Milk", "quantity": 500, "unit": "ml", "expiry": "2026-03-05"}]
        prompt = build_quick_suggestion_prompt(
            inventory_items=[],
            expiring_items=expiring,
            max_results=3,
        )
        assert "Milk" in prompt
        assert "EXPIRING SOON" in prompt

    def test_contains_max_results(self):
        prompt = build_quick_suggestion_prompt(
            inventory_items=[],
            expiring_items=[],
            max_results=7,
        )
        assert "7" in prompt

    def test_allergen_restriction_included(self):
        prompt = build_quick_suggestion_prompt(
            inventory_items=[],
            expiring_items=[],
            max_results=3,
            allergen_ingredients={"peanuts", "gluten"},
        )
        assert "ALLERGEN RESTRICTION" in prompt
        assert "peanuts" in prompt
        assert "gluten" in prompt

    def test_no_allergen_note_when_none(self):
        prompt = build_quick_suggestion_prompt(
            inventory_items=[],
            expiring_items=[],
            max_results=3,
            allergen_ingredients=None,
        )
        assert "ALLERGEN" not in prompt

    def test_empty_inventory_message(self):
        prompt = build_quick_suggestion_prompt(
            inventory_items=[],
            expiring_items=[],
            max_results=3,
        )
        assert "No inventory items available" in prompt
