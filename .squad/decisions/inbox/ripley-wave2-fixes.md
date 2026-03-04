# Wave 2 Backend Fixes — Summary

**Author:** Ripley  
**Branch:** 005-grocery-enhancements  
**Date:** 2026-03-04

## Changes Made

### 1. `adapt_meal_slot` — fully implemented

- Added `MealPlanService.adapt_slot(plan_id, slot_id, effort_level)` async method.
- Loads the MealSlot (household-scoped), builds a recipe dict from ORM, and calls
  the existing synchronous `adapt_recipe()` static method via `asyncio.to_thread()`
  to avoid blocking the event loop.
- Returns `{plan_id, slot_id, recipe_id, title, effort_level, adapted_steps}`.
- Route returns 404 if slot not found or has no recipe.

### 2. `save_recipe_variation` — fully implemented

- Added `SaveVariationRequest` Pydantic model with optional `title` and `notes`.
- Added `MealPlanService.save_variation(recipe_id, data)` async method.
- Creates a new `Recipe` row with `source_recipe_id` pointing to the original
  (the standard lineage pattern already in the schema). Copies all `RecipeIngredient`
  and `RecipeStep` rows. Default title: `"{original} (variation)"`.
- Route returns 201 Created with `{recipe_id, variation_id, title, status}`.
- Returns 404 if recipe not found or does not belong to the household.

### 3. `preferred_store` in `regenerate_grocery_list`

- Added Products lookup (same query as worker `_persist_plan()`) between steps 4 and 5
  in `GroceryService.regenerate_grocery_list()`.
- `GroceryItem.preferred_store` is now populated from `Product.shop` on regeneration,
  consistent with initial plan generation in the worker.

## Decisions

- Variations are stored as first-class recipe rows (not a separate table) using
  `source_recipe_id` for lineage. Simple and schema-compatible.
- LLM adaptation is run via `asyncio.to_thread()` — keeps the route async without
  adding a new async LLM client. Acceptable for <10s calls.
- No migration needed (no schema changes for any of these fixes).

## Test Results

- 193/193 API tests pass, ruff clean.
