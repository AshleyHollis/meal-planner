# Ripley — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + FastAPI + SQLAlchemy + Azure (AKS, SQL, SWA) + Auth0
- **Owner:** Ashley Hollis
- **Branch:** 001-meal-planner-mvp (PR #1)
- **State:** Phases 1-4 complete. 140 unit tests pass. 24/36 E2E tests pass, 12 skipped.
- **Key files:** services/api/src/api/main.py (CORS), services/api/src/api/middleware/auth.py, services/api/src/api/services/inventory_service.py
- **Previous fixes:** NEWID() defaults, httpx→urllib, catch-all exception handler, nullslast()→CASE, bandit B310 nosec

## Learnings

### pre-commit.ci `identify` library compat (2025-07)

- pre-commit.ci pins an older `identify` library that doesn't recognize the `typescript` type tag.
- Use `ts` instead of `typescript` in `types_or` lists. Same for `tsx` (already short form). The `ts` alias works everywhere.

### CORS middleware ordering verified (2025-07)

- Starlette middleware stack: `ServerErrorMiddleware → CORSMiddleware → ExceptionMiddleware → Router`.
- `CORSMiddleware` wraps exception handlers, so CORS headers are added even on 500 responses returned by `internal_exception_handler`.
- The CORS regex `r"https://.*\.(azurestaticapps\.net|meal-planner\.apps\.ashleyhollis\.com)"` correctly matches Azure SWA preview origins like `agreeable-plant-04ffe2700-pr1.eastasia.6.azurestaticapps.net`.
- The previous CORS failures in E2E were caused by the `nullslast()` 500 — now that it's fixed, CORS should work. The middleware config itself is correct.

### Validator test suite updated for relaxed recipe count (2025-07)

- The validator logic was changed to accept "at least 5 recipes" (no upper bound) instead of "exactly 7 recipes".
- Fixed 3 failing tests in `services/workers/tests/test_validator.py`:
  - `test_too_few_recipes`: Changed from 5 recipes (expecting error) to 4 recipes (still expecting error with updated message "Expected at least 5 recipes, got 4")
  - `test_too_many_recipes`: Changed assertion to verify 9 recipes produces NO recipe count error (since there's no upper bound)
  - `test_zero_recipes`: Updated expected error message from "Expected 7 recipes, got 0" to "Expected at least 5 recipes, got 0"
- Updated class comment from "Exactly 7 recipes required" to "At least 5 recipes required"
- All 29 worker tests now pass. CI should be unblocked.

### Inventory POST 500 error investigation (2026-03)

- Branch `002-inventory-enhancements` adds migration 003 which creates Leftovers and StapleIngredients tables and adds `defrost_hours` column to InventoryItems.
- E2E run 22611078131 showed POST /api/v1/inventory returning 500 for all requests in preview environment.
- All 98 API tests pass locally, confirming code is correct.
- Root cause: Migration 003 has not been applied to the database in preview environment.
- The API code expects `defrost_hours` column but database schema doesn't have it yet, causing SQLAlchemy to fail on insert.
- Migration job is configured correctly (sync-wave 1, runs before API deployment wave 2) in k8s/base-preview/migration-job.yaml.
- Solution: Migration should run automatically on next deployment. If it continues failing, check ArgoCD/K8s logs for migration job errors.
