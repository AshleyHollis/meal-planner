"""Tests for enhanced build_prompt with leftovers and freezer items."""

from unittest.mock import MagicMock, patch

from meal_plan_generator.prompts import build_prompt, format_freezer_items, format_leftovers


@patch("meal_plan_generator.prompts._get_schema_json", return_value="{}")
def test_build_prompt_includes_leftovers(mock_schema):
    """Prompt should include leftovers section when leftovers provided."""

    # Mock leftover objects with dict-like access
    leftover1 = MagicMock()
    leftover1.recipe_title = "Roast chicken"
    leftover1.portions = 2
    leftover1.storage_location = "fridge"
    leftover1.expiry_date = None

    leftover2 = MagicMock()
    leftover2.recipe_title = "Pasta"
    leftover2.portions = 1
    leftover2.storage_location = "fridge"
    leftover2.expiry_date = None

    prompt = build_prompt(
        inventory=[], equipment=[], expiring=[], leftovers=[leftover1, leftover2], freezer_items=[]
    )

    assert "LEFTOVERS TO USE FIRST" in prompt
    assert "Roast chicken" in prompt
    assert "2 portions" in prompt


@patch("meal_plan_generator.prompts._get_schema_json", return_value="{}")
def test_build_prompt_includes_freezer(mock_schema):
    """Prompt should include freezer section when freezer items provided."""

    # Mock freezer item
    item1 = MagicMock()
    item1.quantity = 1000.0
    item1.unit = "g"
    item1.defrost_hours = 12
    item1.ingredient = MagicMock(name="Chicken Breast")

    item2 = MagicMock()
    item2.quantity = 500.0
    item2.unit = "g"
    item2.defrost_hours = 8
    item2.ingredient = MagicMock(name="Ground Beef")

    prompt = build_prompt(
        inventory=[], equipment=[], expiring=[], leftovers=[], freezer_items=[item1, item2]
    )

    assert "FREEZER ITEMS" in prompt
    assert "Chicken Breast" in prompt
    assert "1000.0 g" in prompt
    assert "12h" in prompt


@patch("meal_plan_generator.prompts._get_schema_json", return_value="{}")
def test_build_prompt_omits_sections_when_empty(mock_schema):
    """Prompt should not include leftover/freezer sections when empty."""
    prompt = build_prompt(inventory=[], equipment=[], expiring=[], leftovers=[], freezer_items=[])

    assert "LEFTOVERS TO USE FIRST" not in prompt
    assert "FREEZER ITEMS" not in prompt


def test_format_leftovers_handles_empty():
    """format_leftovers should return message when list is empty."""
    result = format_leftovers([])

    assert result == "No leftovers available."


def test_format_freezer_items_handles_empty():
    """format_freezer_items should return message when list is empty."""
    result = format_freezer_items([])

    assert result == "No items in freezer requiring defrosting."
