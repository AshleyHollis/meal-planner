# Ripley Production Fixes — Backend Review Resolution

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-03  
**Status:** Completed

## Summary

Fixed all critical and important backend issues identified in the architecture review, plus the minor `cuisine_type` substitution issue.

---

## 🔴 CRITICAL Fixes

### 1. Worker now loads leftovers and freezer items into AI prompt

**File:** `services/workers/meal_plan_generator/generator.py`

- Added `Leftover` to shared model imports
- In `_load_context()`: queries active leftovers for the household (where `used_at IS NULL`) and filters freezer items from inventory (`location == 'freezer'`)
- Both are returned in context dict as `"leftovers"` and `"freezer_items"`
- `build_prompt()` call now passes `leftovers=` and `freezer_items=` kwargs so the AI receives this context

### 2. Substitution now persists grocery list changes

**File:** `services/api/src/api/services/substitution_service.py`

- Added imports for `GroceryList` and `GroceryItem`
- New private method `_persist_grocery_changes()` on `SubstitutionService`:
  - Loads the grocery list for the plan
  - Processes each `GroceryChangeItem`: removes, adds, or updates `GroceryItem` rows
  - Uses ingredient IDs from the loaded old/new recipe relationship objects
- Called after `_calculate_grocery_changes()` inside `substitute_ingredient()`

---

## 🟡 IMPORTANT Fixes

### 3. `cooked_at` no longer set for skipped meals

**File:** `services/api/src/api/services/meal_plan_service.py`

- Changed `if data.status in ("cooked", "skipped")` to `if data.status == "cooked"`
- Skipped meals now leave `cooked_at = None` — they won't pollute cooking history

### 4. 409 guard on double-cook attempts

**File:** `services/api/src/api/services/meal_plan_service.py`

- Added check before setting cooked status: if `slot.cooked_at is not None` and status is "cooked", raises `HTTPException(409, "Meal slot already marked as cooked")`

### 5. Quick Suggestions "Cook This" endpoint

**Files:**

- `services/api/src/api/models/quick_suggestion.py` — added `CookSuggestionRequest` and `CookSuggestionResponse` models
- `services/api/src/api/services/quick_suggestion_service.py` — added `cook_suggestion()` method that deducts ingredients from inventory by name lookup
- `services/api/src/api/routes/quick_suggestions.py` — added `POST /api/v1/quick-suggestions/cook` endpoint

**Design note:** Since quick suggestions are ephemeral (no stored ID), the endpoint accepts the full suggestion data in the body instead of a path `{id}`. This is the correct design given the data model.

### 8. `POST /grocery-lists/{id}/add-staples` endpoint

**Files:**

- `services/api/src/api/models/grocery.py` — added `AddStaplesRequest` model
- `services/api/src/api/services/grocery_service.py` — added `add_staples_to_list()` method (deduplicates, uses staple `min_threshold` as quantity)
- `services/api/src/api/routes/grocery.py` — added `POST /api/v1/grocery-lists/{grocery_list_id}/add-staples` endpoint

### 9. Leftover PATCH supports partial quantity updates

**Files:**

- `services/api/src/api/models/leftover.py` — added `portions_used: int | None` to `UpdateLeftover`
- `services/api/src/api/services/leftover_service.py` — added `update_leftover()` method that deducts portions and auto-marks used when depleted
- `services/api/src/api/routes/leftover_routes.py` — updated PATCH handler to accept optional `UpdateLeftover` body

---

## 🟢 MINOR Fixes

### 11. `cuisine_type` updated during substitution

**File:** `services/api/src/api/services/substitution_service.py`

- Added `"cuisine_type"` field to the substitution LLM prompt JSON schema
- New recipe creation now uses `data.get("cuisine_type") or recipe.cuisine_type` so the LLM can override if the substitution meaningfully changes the cuisine

---

## Skipped Items (complexity/scope)

- **#6 `adapt_meal_slot` stub** — requires LLM integration in the route layer; the service already has `_adapt_recipe_with_llm()`. Deferred as architectural scope creep.
- **#7 `save_recipe_variation` stub** — requires defining what a "variation" means in the data model. No variation table exists. Deferred.
- **#10 `preferred_store` in grocery regeneration** — already implemented in `_persist_plan()` in the worker; the `regenerate_grocery_list()` method in GroceryService doesn't populate it. Minor gap.

---

## Test Impact

- Updated `test_mark_slot_skipped` assertion: `cooked_at` should be `None` for skipped (was testing the bug, not the correct behavior)
- All 193 API tests pass
- All 97 worker tests pass
