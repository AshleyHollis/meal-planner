---
tasks: 002-inventory-enhancements
spec: 002-inventory-enhancements
created: 2026-03-02
status: ready
---

# Tasks: Inventory Enhancements

---

## Phase 1: Schema Changes (Alembic Migration)

### Task 1.1 — Create Alembic Migration `003_inventory_enhancements`

**Do**:

1. Create a new Alembic migration file.
2. Add `defrost_hours` (Integer, nullable) column to `inventory_items` table.
3. Create `leftovers` table with columns: `id` (UNIQUEIDENTIFIER PK), `meal_slot_id` (UNIQUEIDENTIFIER FK), `recipe_id` (UNIQUEIDENTIFIER FK), `household_id` (UNIQUEIDENTIFIER FK), `portions` (Integer, CHECK > 0), `storage_location` (String(20)), `expiry_date` (Date), `used_at` (DateTime nullable), `created_at` (DateTime, server_default sysutcdatetime()).
4. Create `staple_ingredients` table with columns: `id` (UNIQUEIDENTIFIER PK), `household_id` (UNIQUEIDENTIFIER FK), `ingredient_id` (UNIQUEIDENTIFIER FK), `min_threshold` (Float, CHECK > 0), `unit` (String(20)), `created_at` (DateTime, server_default sysutcdatetime()). Add unique constraint on `(household_id, ingredient_id)`.
5. Add foreign key constraints and indexes on `leftovers.meal_slot_id`, `leftovers.household_id`, `staple_ingredients.household_id`, `staple_ingredients.ingredient_id`.

**Files**:

- `services/shared/alembic/versions/003_inventory_enhancements.py`

**Done when**: Migration applies (`alembic upgrade head`) and rolls back (`alembic downgrade -1`) cleanly.

**Verify**:

```bash
cd services/shared && alembic upgrade head && alembic downgrade -1 && alembic upgrade head
```

**Commit**: `feat(db): add migration 003 for leftovers, staple_ingredients tables and defrost_hours column`

---

### Task 1.2 — Add SQLAlchemy Models for Leftover and StapleIngredient

**Do**:

1. Add `Leftover` model class with all columns, relationships to MealSlot, Recipe, Household.
2. Add `StapleIngredient` model class with all columns, relationships to Household, Ingredient.
3. Add `defrost_hours` column to existing `InventoryItem` model.
4. Update `InventoryItem.location` and `Ingredient.default_storage` comments/docs to note "freezer" is a valid value.
5. Register both new models in the models `__init__.py` if using an `__all__` export.

**Files**:

- `services/shared/shared/db/models/leftover.py` (new)
- `services/shared/shared/db/models/staple_ingredient.py` (new)
- `services/shared/shared/db/models/inventory_item.py` (edit — add `defrost_hours`)
- `services/shared/shared/db/models/__init__.py` (edit — register new models)

**Done when**: `python -c "from shared.db.models import Leftover, StapleIngredient"` succeeds.

**Verify**:

```bash
cd services/shared && python -c "from shared.db.models import Leftover, StapleIngredient; print('OK')"
```

**Commit**: `feat(models): add Leftover, StapleIngredient models and defrost_hours to InventoryItem`

---

## Phase 2: US-1 — Auto-Deduct Inventory on Cook

### Task 2.1 — Add `deduct_for_recipe` to InventoryService

**Do**:

1. Add method `deduct_for_recipe(recipe_id: UUID) -> list[DeductionResult]` to `InventoryService`.
2. Query `RecipeIngredient` for the recipe. For each ingredient, find matching `InventoryItem` by `ingredient_id` and `household_id`.
3. If units match, subtract `min(recipe_qty, inventory_qty)` from inventory. If units don't match, skip and flag `unit_mismatch=True`.
4. Clamp inventory quantity to 0 (never negative).
5. Return a list of `DeductionResult` dataclass/Pydantic model: `ingredient_id, ingredient_name, requested, deducted, remaining, unit_mismatch`.

**Files**:

- `services/api/src/api/services/inventory_service.py` (edit)
- `services/api/src/api/models/inventory.py` (edit — add `DeductionResult` response model)

**Done when**: `InventoryService.deduct_for_recipe()` exists and returns typed results.

**Verify**:

```bash
cd services/api && ruff check src/api/services/inventory_service.py src/api/models/inventory.py
```

**Commit**: `feat(api): add deduct_for_recipe to InventoryService`

---

### Task 2.2 — Hook Auto-Deduct into `update_slot_status`

**Do**:

1. In `MealPlanService.update_slot_status`, after setting status to "cooked," call `InventoryService.deduct_for_recipe(slot.recipe_id)`.
2. Only deduct when transitioning TO "cooked" (not when already cooked — return 409 for re-cook attempts).
3. Include `deductions` list in the response.
4. When status is "skipped," skip deduction entirely.

**Files**:

- `services/api/src/api/services/meal_plan_service.py` (edit)
- `services/api/src/api/models/meal_plan.py` (edit — extend `UpdateSlotStatusResponse` with optional `deductions` field)

**Done when**: Marking a slot "cooked" triggers inventory deduction and returns deduction details.

**Verify**:

```bash
cd services/api && ruff check src/api/services/meal_plan_service.py src/api/models/meal_plan.py
```

**Commit**: `feat(api): hook auto-deduct into update_slot_status on cook`

---

### Task 2.3 — Update Pydantic Literals for Location

**Do**:

1. Find all Pydantic models with `Literal["fridge", "pantry"]` for location fields.
2. Update to `Literal["fridge", "pantry", "freezer"]`.
3. Update `CreateInventoryItem`, `UpdateInventoryItem`, `InventoryItemResponse`, and any other relevant models.

**Files**:

- `services/api/src/api/models/inventory.py` (edit)

**Done when**: All location Literal types include "freezer".

**Verify**:

```bash
cd services/api && ruff check src/api/models/inventory.py
```

**Commit**: `feat(api): add freezer to location Literal types`

---

## Phase 3: US-2 — Record Leftover Portions

### Task 3.1 — Add Leftover Pydantic Models

**Do**:

1. Create Pydantic models: `CreateLeftover` (portions: int ≥ 1, storage_location: Literal, expiry_date: date), `LeftoverResponse` (all fields + computed `is_expired` bool), `UpdateLeftover` (used_at: datetime optional).

**Files**:

- `services/api/src/api/models/leftover.py` (new)
- `services/api/src/api/models/__init__.py` (edit — export new models)

**Done when**: Models importable and validate correctly.

**Verify**:

```bash
cd services/api && ruff check src/api/models/leftover.py
```

**Commit**: `feat(api): add Leftover Pydantic models`

---

### Task 3.2 — Add LeftoverService

**Do**:

1. Create `LeftoverService(session, household_id)` with methods: `create_leftover(slot_id, data)`, `list_leftovers(include_used=False)`, `mark_used(leftover_id)`.
2. `create_leftover` validates that the slot exists and has status "cooked" (else raise 400).
3. `list_leftovers` returns active leftovers (used_at IS NULL) by default; flag includes used.
4. `mark_used` sets `used_at = utcnow()`.

**Files**:

- `services/api/src/api/services/leftover_service.py` (new)
- `services/api/src/api/services/__init__.py` (edit — export)

**Done when**: Service methods exist and are importable.

**Verify**:

```bash
cd services/api && ruff check src/api/services/leftover_service.py
```

**Commit**: `feat(api): add LeftoverService for CRUD operations`

---

### Task 3.3 — Add Leftover API Routes

**Do**:

1. Add `POST /api/v1/meal-plans/{plan_id}/slots/{slot_id}/leftovers` — create leftover.
2. Add `GET /api/v1/leftovers` — list household leftovers (query param `include_used`).
3. Add `PATCH /api/v1/leftovers/{leftover_id}` — mark as used.
4. Wire routes to LeftoverService.

**Files**:

- `services/api/src/api/routes/leftover_routes.py` (new)
- `services/api/src/api/routes/__init__.py` (edit — register router)
- `services/api/src/api/main.py` (edit — include router if not auto-discovered)

**Done when**: Routes respond correctly (testable via Swagger UI or curl).

**Verify**:

```bash
cd services/api && ruff check src/api/routes/leftover_routes.py
```

**Commit**: `feat(api): add leftover API routes`

---

### Task 3.4 — Include Leftovers in Worker Prompt

**Do**:

1. In `build_prompt()` in `services/workers/meal_plan_generator/prompts.py`, query active leftovers (used_at IS NULL, expiry_date >= today).
2. Add a "Leftovers to use first" section in the prompt, listing recipe title, portions remaining, expiry date, and storage location.
3. Order by expiry_date ascending (most urgent first).

**Files**:

- `services/workers/meal_plan_generator/prompts.py` (edit)

**Done when**: Generated prompts include leftover section when leftovers exist.

**Verify**:

```bash
cd services/workers && ruff check meal_plan_generator/prompts.py
```

**Commit**: `feat(worker): include leftovers in meal plan generation prompt`

---

### Task 3.5 — Add Leftover Frontend Components

**Do**:

1. Add `LeftoverForm` component — form to record portions, storage location, expiry after cooking.
2. Add `LeftoverList` component — displays active leftovers with expiry badges.
3. Integrate `LeftoverForm` into `MealSlotCard` — show form after slot is marked cooked.
4. Add `LeftoverList` to inventory page or a new `/leftovers` page.
5. Add TypeScript interfaces for Leftover types in `types/index.ts`.
6. Add API client methods in `services/api.ts`.

**Files**:

- `apps/web/src/components/leftover/LeftoverForm.tsx` (new)
- `apps/web/src/components/leftover/LeftoverList.tsx` (new)
- `apps/web/src/components/meal-plan/MealSlotCard.tsx` (edit)
- `apps/web/src/types/index.ts` (edit)
- `apps/web/src/services/api.ts` (edit)

**Done when**: Leftover form renders in MealSlotCard after cooking; leftover list displays items.

**Verify**:

```bash
cd apps/web && npx tsc --noEmit
```

**Commit**: `feat(web): add leftover recording UI components`

---

## Phase 4: US-3 — Staple Ingredients with Thresholds

### Task 4.1 — Add Staple Pydantic Models

**Do**:

1. Create `CreateStaple` (ingredient_id, min_threshold > 0, unit), `StapleResponse`, `StapleSuggestion` (ingredient_id, ingredient_name, current_qty, min_threshold, quantity_needed, unit).

**Files**:

- `services/api/src/api/models/staple.py` (new)
- `services/api/src/api/models/__init__.py` (edit — export)

**Done when**: Models importable and validate threshold > 0.

**Verify**:

```bash
cd services/api && ruff check src/api/models/staple.py
```

**Commit**: `feat(api): add Staple Pydantic models`

---

### Task 4.2 — Add StapleService

**Do**:

1. Create `StapleService(session, household_id)` with methods: `add_staple(data)`, `remove_staple(staple_id)`, `list_staples()`, `get_suggestions(grocery_list_id=None)`, `add_staples_to_grocery_list(grocery_list_id)`.
2. `get_suggestions` computes `max(0, min_threshold - COALESCE(current_qty, 0))` per staple. If `grocery_list_id` provided, excludes ingredients already on that grocery list.
3. `add_staples_to_grocery_list` creates GroceryItem records for each suggestion.

**Files**:

- `services/api/src/api/services/staple_service.py` (new)
- `services/api/src/api/services/__init__.py` (edit — export)

**Done when**: Service computes correct shortfall quantities.

**Verify**:

```bash
cd services/api && ruff check src/api/services/staple_service.py
```

**Commit**: `feat(api): add StapleService with threshold suggestions`

---

### Task 4.3 — Add Staple API Routes

**Do**:

1. Add `POST /api/v1/staples` — create staple.
2. Add `GET /api/v1/staples` — list household staples.
3. Add `DELETE /api/v1/staples/{staple_id}` — remove staple.
4. Add `GET /api/v1/grocery-lists/staple-suggestions` — get suggestions (optional `grocery_list_id` query param).
5. Add `POST /api/v1/grocery-lists/{grocery_list_id}/add-staples` — add suggestions to grocery list.

**Files**:

- `services/api/src/api/routes/staple_routes.py` (new)
- `services/api/src/api/routes/__init__.py` (edit — register router)
- `services/api/src/api/main.py` (edit — include router if needed)

**Done when**: All routes return correct responses.

**Verify**:

```bash
cd services/api && ruff check src/api/routes/staple_routes.py
```

**Commit**: `feat(api): add staple ingredient API routes`

---

### Task 4.4 — Add Staple Frontend Components

**Do**:

1. Add `StapleManager` component — list staples, add/remove, show current vs threshold.
2. Add `StapleSuggestions` component — show shortfall items with "Add to grocery list" button.
3. Integrate `StapleSuggestions` into grocery list page.
4. Add TypeScript interfaces for Staple types in `types/index.ts`.
5. Add API client methods in `services/api.ts`.

**Files**:

- `apps/web/src/components/staples/StapleManager.tsx` (new)
- `apps/web/src/components/staples/StapleSuggestions.tsx` (new)
- `apps/web/src/components/grocery/GroceryList.tsx` (edit)
- `apps/web/src/types/index.ts` (edit)
- `apps/web/src/services/api.ts` (edit)

**Done when**: Staple management UI renders; suggestions integrate into grocery page.

**Verify**:

```bash
cd apps/web && npx tsc --noEmit
```

**Commit**: `feat(web): add staple ingredients UI components`

---

## Phase 5: US-4 — Freezer Storage Location

### Task 5.1 — Update InventoryService for Freezer and Defrost

**Do**:

1. Update `add_item` to accept `defrost_hours` (optional int) when location is "freezer".
2. Update `update_item` to accept `location` and `defrost_hours`.
3. Add method `get_defrost_reminders(upcoming_days=7)` — queries freezer items that are ingredients in planned MealSlots within the upcoming window, calculates `move_by = meal_date - timedelta(hours=defrost_hours)`.
4. Validate: `defrost_hours` only allowed when location is "freezer."

**Files**:

- `services/api/src/api/services/inventory_service.py` (edit)
- `services/api/src/api/models/inventory.py` (edit — add `defrost_hours` to Create/Update models, add `DefrostReminder` response model)

**Done when**: Defrost reminders compute correctly for freezer items.

**Verify**:

```bash
cd services/api && ruff check src/api/services/inventory_service.py src/api/models/inventory.py
```

**Commit**: `feat(api): add freezer defrost tracking to InventoryService`

---

### Task 5.2 — Add Defrost Reminder Route

**Do**:

1. Add `GET /api/v1/inventory/defrost-reminders` route — returns list of `DefrostReminder`.
2. Query param `days_ahead` (default 7).

**Files**:

- `services/api/src/api/routes/inventory_routes.py` (edit)

**Done when**: Route returns defrost reminders for upcoming meals.

**Verify**:

```bash
cd services/api && ruff check src/api/routes/inventory_routes.py
```

**Commit**: `feat(api): add defrost reminders endpoint`

---

### Task 5.3 — Update Worker Prompt for Freezer Items

**Do**:

1. In `build_prompt()`, include freezer inventory items in a "Freezer items (need defrosting)" section.
2. Include `defrost_hours` so the AI knows lead time.
3. Keep existing fridge/pantry sections unchanged.

**Files**:

- `services/workers/meal_plan_generator/prompts.py` (edit)

**Done when**: Prompts include freezer section when freezer items exist.

**Verify**:

```bash
cd services/workers && ruff check meal_plan_generator/prompts.py
```

**Commit**: `feat(worker): include freezer items in meal plan prompt`

---

### Task 5.4 — Add Freezer Frontend Support

**Do**:

1. Update `AddItemForm` to show "freezer" as a location option and conditionally show `defrost_hours` input.
2. Update `InventoryList` to show freezer items with a snowflake icon and defrost hours.
3. Add `DefrostReminders` component — shows upcoming defrost deadlines.
4. Add defrost reminders to meal plan page sidebar or dashboard.
5. Update TypeScript interfaces and API client for defrost fields.

**Files**:

- `apps/web/src/components/inventory/AddItemForm.tsx` (edit)
- `apps/web/src/components/inventory/InventoryList.tsx` (edit)
- `apps/web/src/components/inventory/DefrostReminders.tsx` (new)
- `apps/web/src/components/meal-plan/WeeklyPlanView.tsx` (edit)
- `apps/web/src/types/index.ts` (edit)
- `apps/web/src/services/api.ts` (edit)

**Done when**: Freezer location is selectable; defrost reminders display on meal plan page.

**Verify**:

```bash
cd apps/web && npx tsc --noEmit
```

**Commit**: `feat(web): add freezer storage and defrost reminder UI`

---

## Phase 6: Tests

### Task 6.1 — API Tests for US-1 (Auto-Deduct)

**Do**:

1. Test happy path: mark slot cooked → inventory quantities decrease correctly.
2. Test insufficient stock: inventory clamps to zero, response includes correct deductions.
3. Test missing inventory item: slot still marked cooked, deduction shows 0.
4. Test re-cook 409: marking already-cooked slot returns 409.
5. Test skip: marking slot skipped does not deduct.
6. Test unit mismatch: recipe unit ≠ inventory unit → skip with warning.

**Files**:

- `services/api/tests/test_auto_deduct.py` (new)

**Done when**: All 6 test cases pass.

**Verify**:

```bash
cd services/api && python -m pytest tests/test_auto_deduct.py -v
```

**Commit**: `test(api): add auto-deduct inventory tests`

---

### Task 6.2 — API Tests for US-2 (Leftovers)

**Do**:

1. Test create leftover after cooked slot.
2. Test create leftover on non-cooked slot → 400.
3. Test list leftovers (active only, including used).
4. Test mark leftover as used.
5. Test expired leftover flag.

**Files**:

- `services/api/tests/test_leftovers.py` (new)

**Done when**: All 5 test cases pass.

**Verify**:

```bash
cd services/api && python -m pytest tests/test_leftovers.py -v
```

**Commit**: `test(api): add leftover recording tests`

---

### Task 6.3 — API Tests for US-3 (Staples)

**Do**:

1. Test add staple ingredient.
2. Test get suggestions — correct shortfall calculation.
3. Test suggestions exclude items already on grocery list.
4. Test add staples to grocery list.
5. Test remove staple — no longer in suggestions.
6. Test staple with no inventory → full threshold as needed.

**Files**:

- `services/api/tests/test_staples.py` (new)

**Done when**: All 6 test cases pass.

**Verify**:

```bash
cd services/api && python -m pytest tests/test_staples.py -v
```

**Commit**: `test(api): add staple ingredients tests`

---

### Task 6.4 — API Tests for US-4 (Freezer)

**Do**:

1. Test add item with location "freezer" and defrost_hours.
2. Test defrost reminders return correct items with move_by times.
3. Test moving item from freezer to fridge removes reminder.
4. Test defrost_hours rejected when location is not "freezer."

**Files**:

- `services/api/tests/test_freezer.py` (new)

**Done when**: All 4 test cases pass.

**Verify**:

```bash
cd services/api && python -m pytest tests/test_freezer.py -v
```

**Commit**: `test(api): add freezer storage and defrost tests`

---

### Task 6.5 — Worker Tests for Prompt Changes

**Do**:

1. Test `build_prompt()` includes leftover items when present.
2. Test `build_prompt()` includes freezer items when present.
3. Test `build_prompt()` omits sections when no leftovers/freezer items.

**Files**:

- `services/workers/tests/test_prompt_enhancements.py` (new)

**Done when**: All 3 test cases pass.

**Verify**:

```bash
cd services/workers && python -m pytest tests/test_prompt_enhancements.py -v
```

**Commit**: `test(worker): add prompt enhancement tests`

---

### Task 6.6 — Frontend Tests

**Do**:

1. Test `LeftoverForm` renders and submits correctly.
2. Test `LeftoverList` displays items with expiry status.
3. Test `StapleManager` add/remove flow.
4. Test `StapleSuggestions` displays shortfall items.
5. Test `AddItemForm` shows defrost_hours for freezer location.
6. Test `DefrostReminders` displays upcoming reminders.

**Files**:

- `apps/web/src/__tests__/leftover.test.tsx` (new)
- `apps/web/src/__tests__/staples.test.tsx` (new)
- `apps/web/src/__tests__/freezer.test.tsx` (new)

**Done when**: All frontend tests pass.

**Verify**:

```bash
cd apps/web && npx vitest run
```

**Commit**: `test(web): add frontend tests for leftovers, staples, freezer`

---

## Phase 7: Polish (Quality Gates)

### Task 7.1 — Full Python Lint Pass

**Do**:

1. Run `ruff check` across all modified Python files.
2. Fix any lint violations introduced by this feature.

**Files**: All modified `.py` files.

**Done when**: `ruff check` exits 0.

**Verify**:

```bash
cd services/api && ruff check . && cd ../../services/workers && ruff check . && cd ../../services/shared && ruff check .
```

**Commit**: `chore: fix lint issues from inventory enhancements`

---

### Task 7.2 — Full TypeScript Type-Check Pass

**Do**:

1. Run `npx tsc --noEmit` on the web app.
2. Fix any type errors introduced by this feature.

**Files**: All modified `.ts` / `.tsx` files.

**Done when**: `tsc --noEmit` exits 0.

**Verify**:

```bash
cd apps/web && npx tsc --noEmit
```

**Commit**: `chore: fix type errors from inventory enhancements`

---

### Task 7.3 — Full Test Suite Pass

**Do**:

1. Run all API tests.
2. Run all worker tests.
3. Run all frontend tests.
4. Fix any regressions.

**Files**: None (verification only).

**Done when**: All test suites pass.

**Verify**:

```bash
cd services/api && python -m pytest -v && cd ../../services/workers && python -m pytest -v && cd ../../apps/web && npx vitest run
```

**Commit**: `chore: ensure all tests pass for inventory enhancements` (only if fixes needed)

---

### Task 7.4 — Update API Documentation

**Do**:

1. Verify FastAPI auto-generates OpenAPI docs for all new routes.
2. Add docstrings to all new route handlers and service methods.
3. Verify Swagger UI at `/docs` shows new endpoints with correct request/response schemas.

**Files**: All new route and service files.

**Done when**: `/docs` accurately reflects all new endpoints.

**Verify**: Manual inspection of Swagger UI.

**Commit**: `docs(api): add docstrings for inventory enhancement endpoints`
