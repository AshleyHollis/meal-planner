# Decision: Updated Validator Test Suite for Relaxed Recipe Count

**Date:** 2025-01-XX  
**Agent:** Ripley (Backend Dev)  
**Status:** Implemented

## Context

The meal plan validator (`services/workers/meal_plan_generator/validator.py`) was previously updated to accept "at least 5 recipes" instead of the stricter "exactly 7 recipes" constraint. However, the test suite in `services/workers/tests/test_validator.py` was not updated to reflect this change, causing 3 tests to fail and blocking CI.

## Decision

Updated the `TestRecipeCount` class tests to align with the new validator logic:

1. **`test_too_few_recipes`**: Changed from testing 5 recipes (which is now valid) to testing 4 recipes, and updated the expected error message to "Expected at least 5 recipes, got 4"

2. **`test_too_many_recipes`**: Changed the assertion to verify that 9 recipes produces NO recipe count error, since there is no upper bound anymore

3. **`test_zero_recipes`**: Updated the expected error message from "Expected 7 recipes, got 0" to "Expected at least 5 recipes, got 0"

4. Updated the class docstring comment from "Exactly 7 recipes required" to "At least 5 recipes required"

## Rationale

- **Consistency**: Tests must reflect the actual validator behavior to provide meaningful validation
- **Flexibility**: The relaxed constraint (≥5 instead of =7) allows the AI to generate meal plans with varying numbers of recipes based on available inventory
- **Test Coverage**: The updated tests still validate the minimum threshold while acknowledging there's no maximum

## Impact

- All 29 worker tests now pass
- CI is unblocked
- Test suite accurately reflects current validator constraints
- No changes to production code were needed, only test updates

## Files Modified

- `services/workers/tests/test_validator.py` (lines 11, 16-29)
