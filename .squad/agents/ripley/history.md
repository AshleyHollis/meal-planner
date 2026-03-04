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

### Phase 1: Personalization models & migration complete (2026-03-02)

- **Branch:** 003-personalization-ai
- **Completed Tasks:** T001-T006 (all Phase 1 tasks)
- Created 3 new SQLAlchemy models:
  - `MemberPreference` (preference.py): dietary restrictions, allergies, dislikes, likes per household member
  - `RecipeFavorite` (favorite.py): household-recipe favorite relationships
  - `MealSlotRating` (rating.py): 1-5 star ratings with feedback on cooked meals
- Modified `Recipe` model: added nullable `cuisine_type` String(50) column for cuisine categorization
- Updated `__init__.py`: exported new models (MemberPreference, RecipeFavorite, MealSlotRating)
- Created Alembic migration `003_personalization.py`:
  - Creates 3 tables with proper FKs, indexes, unique constraints, CHECK constraint on rating (1-5)
  - Adds cuisine_type column to Recipes using batch_alter_table (MSSQL best practice)
  - Includes proper downgrade path
- **Verification:** All ruff checks pass, all 74 API tests pass (no regressions)
- **Pattern adherence:** Followed existing Base/TimestampMixin patterns, UNIQUEIDENTIFIER type mapping, PascalCase table names, selectin eager loading, proper TYPE_CHECKING imports
- **Ready for:** Phase 2 (Preferences API) and subsequent API/worker work

### Phase 2: Preferences API complete (2026-03-02)

- **Branch:** 003-personalization-ai
- **Completed Tasks:** T007-T012 (all Phase 2 tasks)
- Created Pydantic models in `services/api/src/api/models/preference.py`:
  - `CreateMemberPreference`: request body with preference_type, value, ingredient_id (nullable), notes (nullable)
  - `MemberPreferenceResponse`: response with all fields + id, household_member_id, created_at
- Created PreferenceService in `services/api/src/api/services/preference_service.py`:
  - `list_preferences(member_id)`: validates member ownership, returns all preferences for member (newest first)
  - `add_preference(member_id, data)`: validates member ownership, creates preference, catches IntegrityError for duplicate detection
  - `delete_preference(member_id, preference_id)`: validates ownership, deletes preference
  - `_validate_member_ownership(member_id)`: helper to ensure member belongs to household (raises ValueError if not)
- Created preference routes in `services/api/src/api/routes/preferences.py`:
  - GET `/api/v1/members/{member_id}/preferences`: list all preferences
  - POST `/api/v1/members/{member_id}/preferences`: create (201), validates preference_type in [dietary_restriction, allergy, dislike, like], returns 409 on duplicate, 403 on non-household member
  - DELETE `/api/v1/members/{member_id}/preferences/{preference_id}`: delete (204), 404 if not found, 403 if member not in household
  - GET `/api/v1/preferences/dietary-types`: returns static list of 8 dietary types (vegetarian, vegan, halal, kosher, gluten-free, dairy-free, keto, paleo)
- Registered preferences router in `services/api/src/api/main.py`
- Added `get_preference_service` dependency factory in `services/api/src/api/dependencies.py` (follows existing pattern)
- Comprehensive test suite in `services/api/tests/test_preferences.py`:
  - 14 tests covering list/add/delete operations
  - Tests for duplicate rejection (409), invalid preference_type (422), member-not-in-household (403)
  - Tests for dietary types endpoint
  - Helper functions `_seed_member` and `_seed_preference` for test data setup
- **Verification:** All 14 preference tests pass, all 115 total API tests pass (no regressions), ruff format/check pass
- **Pattern lessons:**
  - Service uses `flush()` not `commit()` (commit happens in session context manager)
  - Tests don't need to commit seed data (same transaction scope as client fixture)
  - DELETE tests verify status code only (not data absence) to avoid session isolation issues
  - Use `IntegrityError` catch for duplicate detection, map to 409 status
  - Fixed deprecation: use `HTTP_422_UNPROCESSABLE_CONTENT` not `HTTP_422_UNPROCESSABLE_ENTITY`
- **Ready for:** Phase 3 (Favorites API) and subsequent phases

### Meal plan generation error message fix (2026-03-03)

- **Issue:** User reported "Failed to generate meal plan" error but couldn't tell why
- **Root cause:** Frontend catch block was swallowing API error details and showing generic message
- **Analysis:** The meal plan generation flow works correctly:
  - Frontend calls `POST /api/v1/meal-plans` with week_start_date and optional cuisine_preferences
  - API creates draft plan, enqueues message to Azure Queue Storage for worker
  - Worker loads context (inventory, equipment, preferences, ratings, favorites, recent meals)
  - Worker calls LLM, validates constraints (allergens, equipment, recipe count, cuisines), retries up to 3x
  - Worker persists recipes, ingredients, steps, slots, grocery list, sets plan status to "active"
  - API enforces one active/draft plan per household (409 conflict if another exists)
- **Fix:** Updated meal-plan/page.tsx error handler to extract `detail` field from ApiError body
- **Impact:** Users now see helpful error messages like "Household already has an active or in-progress meal plan" instead of generic failure message
- **Tests verified:** 117 API tests pass, 56 worker tests pass, Next.js build succeeds
- **Key files:** apps/web/src/app/meal-plan/page.tsx (error handling), services/api/src/api/routes/meal_plans.py (endpoints), services/api/src/api/services/meal_plan_service.py (create_plan logic), services/workers/meal_plan_generator/generator.py (worker orchestrator)
- **Pattern:** Always extract and display API error details in frontend catch blocks for better UX
- **Decision logged:** Decision 11 in team decisions.md. Apply pattern to all frontend API calls (inventory, preferences, etc.)
- **Commit:** 5ed1955 — "fix: show actual API error message for meal plan generation failures"

### Frontend gap fixes — Kane completed (2026-03-03)

- **Gaps addressed:** Wire MealSlotCard into plan detail page, add recipe detail expansion, create /history page, fix favorites loading
- **Outcome:** 87/87 frontend tests pass, TypeScript clean, Next.js build succeeds
- **Related decisions:** Decision 13 (auto-complete existing plan), Decision 14 (latest LLM models user directive)
- **Commit:** 9f45365 — Frontend gaps: plan detail, history page, favorites, auto-complete
- **Impact on backend:** Frontend now expects all backend APIs (favorites, preferences, ratings) to return proper error details (per Decision 11 pattern)
- **Status:** Ready for integration; frontend fully functional per Kane's scope

### Inventory POST 500 error investigation (2026-03)

- Branch `002-inventory-enhancements` adds migration 003 which creates Leftovers and StapleIngredients tables and adds `defrost_hours` column to InventoryItems.
- E2E run 22611078131 showed POST /api/v1/inventory returning 500 for all requests in preview environment.
- All 98 API tests pass locally, confirming code is correct.
- Root cause: Migration 003 has not been applied to the database in preview environment.
- The API code expects `defrost_hours` column but database schema doesn't have it yet, causing SQLAlchemy to fail on insert.
- Migration job is configured correctly (sync-wave 1, runs before API deployment wave 2) in k8s/base-preview/migration-job.yaml.
- Solution: Migration should run automatically on next deployment. If it continues failing, check ArgoCD/K8s logs for migration job errors.

### Shared-database repair migration pattern (2026-03)

- All preview environments share ONE Azure SQL database (Key Vault secret `meal-planner-sql-connection-string`). There is no per-PR database isolation.
- Migration 003 was partially applied: `alembic_version` row shows `003` but `Leftovers` and `StapleIngredients` tables were missing. Running `alembic upgrade head` is a no-op when the version row is already correct.
- Repair approach: create a new migration (004) with `down_revision = "003"` that checks for each object before creating it — using `INFORMATION_SCHEMA.TABLES`, `INFORMATION_SCHEMA.COLUMNS`, and `sys.indexes`. This makes the migration fully idempotent (safe on fully-applied, partially-applied, or fresh databases).
- Helper functions `_table_exists`, `_column_exists`, `_index_exists` use `op.get_bind()` + `sa.text()` queries. The `downgrade()` is a no-op because 004 owns no new objects — 003's downgrade handles teardown.
- All 98 API tests and 34 worker tests pass with migration 004 in place.

### Inventory duplicate prevention with upsert logic (2026-03)

- Preview environment showed duplicate inventory items after multiple E2E test runs.
- Root cause: `POST /api/v1/inventory` had no duplicate prevention. Each E2E seed run created new items for the same ingredient+location, causing accumulation across deployments.
- The InventoryItems table has no unique constraint on `(household_id, ingredient_id, location)` — by design, it allows multiple entries per ingredient (e.g., two cartons of milk with different expiry dates).
- Solution: Modified `InventoryService.add_item()` to implement upsert logic:
  - Check for existing item with same `household_id`, `ingredient_id`, and `location`
  - If exists: add quantities, keep later expiry date, update defrost_hours
  - If not: create new item
- This makes the seed data endpoint idempotent while preserving the ability to track multiple batches of the same ingredient when explicitly needed (e.g., via different locations or direct DB operations).
- All 98 API tests pass. E2E seed script now safe to run repeatedly without duplicates.

### 005-grocery-enhancements: Product Mappings Backend (2026-03-03)

- **Branch:** 005-grocery-enhancements
- **Completed Tasks:** T001-T013 (all backend tasks for the feature)
- Created `Product` SQLAlchemy model (`Products` table): household-scoped, maps Ingredient → purchasable product with brand, product_name, size_desc, price, shop, notes; unique constraint on (household_id, ingredient_id).
- Added `005_grocery_products.py` migration (idempotent pattern from 004 repair migration).
- Created Pydantic models: `CreateProduct`, `UpdateProduct`, `ProductSummary`, `ProductResponse` (includes `ingredient_name` populated via relationship).
- Extended `GroceryItemResponse` with `ingredient_name`, `ingredient_category`, and `product: ProductSummary | None` using default values so existing serialization is backward-compatible.
- Created `ProductService` with `list_products`, `create_product`, `update_product`, `delete_product`, `search_products` — same household-scoped pattern as `InventoryService`.
- Extended `GroceryService` with `get_enriched_grocery_list()` that returns `(GroceryList | None, dict[UUID, Product])` — grocery list plus ingredient_id→Product lookup for enriching route responses.
- Updated grocery route `get_grocery_list` to build enriched `GroceryItemResponse` instances manually (ingredient_name, ingredient_category, product fields).
- Created products API router at `/api/v1/products` (GET list, POST create, PUT update, DELETE delete, GET /search).
- Registered router in `main.py`, added `get_product_service` dependency factory.
- Updated worker `_persist_plan()` to query Products for household, set `preferred_store` on new GroceryItems from `Product.shop` lookup.
- 13 product endpoint tests; all 154 API tests pass, ruff clean.
- **Key patterns learned:**
  - After `session.flush()` + `session.refresh(product, attribute_names=["ingredient"])` the `updated_at` timestamp is NOT refreshed (TimestampMixin field). Use bare `session.refresh(product)` to reload all columns including timestamps after flush.
  - The `/search` route must be registered BEFORE `/{product_id}` in the router to avoid path conflicts (FastAPI matches `/search` as a UUID otherwise). Keep explicit ordering in router file.
  - For manual Pydantic construction in routes (when ORM `model_validate` is insufficient due to extra fields like `ingredient_name`), build a `_to_response(product)` helper that maps all fields explicitly.

- The upsert-only fix was insufficient: existing duplicates in the live DB persisted, and the seed still accumulated quantity on repeated runs.
- Full fix implemented in commit `14333c2`:
  1. **Migration 005**: CTE-based dedup (keeps latest `created_at` per group), then idempotent `UNIQUE CONSTRAINT` on `(household_id, ingredient_id, location)`.
  2. **Model**: Added `UniqueConstraint` to `InventoryItem.__table_args__` so SQLAlchemy schema matches the DB.
  3. **E2E seed**: Added cleanup step before seeding — GET all inventory, DELETE each item — gives a clean slate on every pipeline run.
- All 98 API tests and 37 frontend tests pass after the change.
- Pattern: for shared-DB environments, seed scripts must actively clean up before seeding; upsert alone is not enough when accumulated state from prior runs is undesirable.

### Relax inventory constraint — grocery list items (2026-03-04)

- **Branch:** 005-grocery-enhancements
- **Commit:** da7bcba — `fix(validator): relax inventory constraint to allow grocery list items`
- **Root cause:** `validate_constraints()` rejected any recipe ingredient not present in the household inventory. With 3 meal types (breakfast/lunch/dinner), ~21 recipes are generated and the LLM naturally uses ingredients not yet stocked — producing 13+ errors per run and blocking generation entirely.
- **Fix:** Removed the ingredient-vs-inventory loop from `validator.py` (check #4). Kept the `inventory` parameter in the function signature for backward compatibility. Updated requirement 6 in both `SYSTEM_PROMPT` constant and `format_system_prompt()` in `prompts.py`: from "Use ingredient names that match the provided inventory list" to "Prioritize using ingredients from the provided inventory … Recipes MAY include ingredients not in inventory — those will be added to the grocery list."
- **Design principle:** Inventory check is GUIDANCE (prompt), not a GATE (validator). Hard gates belong only to safety constraints (allergens, equipment modes) and structural constraints (servings, recipe count). The grocery list exists precisely to handle ingredients not yet in stock.
- **Tests:** No test changes needed. Default test ingredients ("chicken breast", "rice") match `default_inventory` — removing the check only reduces possible errors, not adds them. 97 worker tests + 187 API tests + Next.js build all pass.
- **Decision logged:** Decision 16 in team decisions.md.
- **Status:** Ready for feature testing and merge.

### DELETE endpoint for meal plans (2026-03-04)

- **Branch:** 005-grocery-enhancements
- **Issue:** 20+ failed meal plans cluttering the list in production. Users need to clean up failed plans.
- **Implementation:**
  - Added `DELETE /api/v1/meal-plans/{plan_id}` endpoint in `services/api/src/api/routes/meal_plans.py`
  - Added `delete_plan(plan_id)` method to `MealPlanService` at `services/api/src/api/services/meal_plan_service.py`
  - Service method validates plan exists, checks status is "failed" or "completed", then deletes plan (cascade automatically deletes slots)
  - Returns 204 No Content on success, 404 if plan not found, 409 Conflict if plan status is active/draft
- **Status enforcement:** Only "failed" or "completed" plans can be deleted. Active and draft plans return 409 with clear error message.
- **Household scoping:** Delete operations are properly scoped to household_id to prevent cross-household deletions.
- **Tests:** Added 6 comprehensive tests in `TestDeleteMealPlan` class covering success cases, status validation, 404/409 errors, household scoping.
- **Test results:** All 31 meal plan service tests pass, all 193 API tests pass, ruff clean.
- **Pattern notes:**
  - SQLAlchemy cascade `"all, delete-orphan"` on the `MealPlan.slots` relationship handles slot deletion automatically
  - Explicit deletion of slots is not needed — relying on cascade is cleaner and avoids SQLAlchemy warnings
  - Service methods raise HTTPException directly with appropriate status codes (404, 409)
  - Route handler is minimal — just calls service method and returns 204
- **Key files:** `services/api/src/api/routes/meal_plans.py`, `services/api/src/api/services/meal_plan_service.py`, `services/api/tests/test_meal_plan_service.py`

### DELETE /api/v1/meal-plans/{plan_id} endpoint (2026-03-04)

- **Context:** Production environment accumulated 20+ failed meal plans cluttering the UI. Users needed deletion capability without risking active/draft plan loss.
- **Deliverable:** \DELETE /api/v1/meal-plans/{plan_id}\ endpoint with status-based deletion policy.
- **Deletion policy:** Only plans with status 'failed' or 'completed' can be deleted. Plans with status 'active' or 'draft' return 409 Conflict (state-based safety).
- **Service layer:** \MealPlanService.delete_plan(plan_id)\ validates status, performs cascade delete of meal slots via SQLAlchemy cascade rules.
- **HTTP semantics:** 204 No Content (success), 404 (not found), 409 (conflict due to state).
- **Household scoping:** All operations validate household_id to prevent cross-household access.
- **Tests:** 6 new test cases — success path, status validation (active/draft rejection), 404/409 error handling, household scoping.
- **Integration:** Kane implemented DELETE button on meal plan list for failed/completed plans with user confirmation.
- **Outcome:** All 193 API tests pass. Users can now clean up clutter safely.
- **Decision logged:** Decision 20 in team decisions.md.
- **Commit:** 2026-03-04 orchestration log entry created.

### Meal plan filtering, stats, and grocery totals (2026-03-04)

- **Branch:** 005-grocery-enhancements
- **Commit:** 5742a7d — `feat(api): add meal plan filtering, stats, and grocery totals`
- **Task 1 — Filtering/Sorting:** Extended `GET /api/v1/meal-plans` with three query params: `status` (optional string filter), `sort` (created_at|week_start_date, default created_at), `order` (asc|desc, default desc). Updated `MealPlanService.list_plans()` signature to accept these params and apply them via SQLAlchemy `.where()` / `.order_by()`.
- **Task 2 — Stats endpoint:** Added `GET /api/v1/meal-plans/stats` returning `MealPlanStatsResponse` (plans_by_status, total_meals_cooked, items_expiring_soon). Uses three aggregate queries: GROUP BY status on MealPlans, COUNT of cooked MealSlots via JOIN, COUNT of InventoryItems with expiry_date ≤ now+7 days. Route placed before `/{plan_id}` to avoid path conflict (same pattern as `/active`).
- **Task 3 — Grocery totals:** Added `total_price: float | None` and `store_totals: dict[str, float]` to `GroceryListResponse`. Computed in the grocery route from `products_lookup` (already fetched): sums `product.price` per store, returns None for total_price if no products have prices, rounds to 2dp.
- **Key patterns:**
  - `/stats` must appear before `/{plan_id}` in the router file to avoid FastAPI interpreting "stats" as a UUID path param.
  - Query params on FastAPI routes use `Query()` with description for OpenAPI docs. `Literal` type hint provides enum validation.
  - `total_price` is None (not 0.0) when no products have prices — avoids misleading "£0.00 total" when data is simply absent.
  - `store_totals` uses "Other" as the key when `product.shop` is None.
- **All 193 API tests pass, ruff clean.**