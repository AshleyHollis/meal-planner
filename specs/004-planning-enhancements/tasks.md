# Tasks: Planning Enhancements

**Input**: Design documents from `/specs/004-planning-enhancements/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Included — project has ~258 passing tests; maintaining quality is critical.

**Organization**: Tasks grouped by user story and implementation phase for independent delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths in every description

---

## Phase 1: RecurringMealTemplate Model & Migration (Foundation)

**Purpose**: Create SQLAlchemy model and Alembic migration for RecurringMealTemplate — foundation for US4 recurring meals.

- [ ] T001 [US4] Create RecurringMealTemplate SQLAlchemy model in `services/shared/shared/db/models/recurring_meal.py` — UUID PK, household_id FK (Households), day (Integer CHECK 0-6), meal_type (String(20)), recipe_id FK (Recipes, nullable), recipe_title (String(300), nullable), is_active (Boolean, default True), TimestampMixin. UNIQUE(household_id, day, meal_type). Index on household_id. Relationship: `recipe` → Recipe (nullable, lazy="selectin").
- [ ] T002 [US4] Export RecurringMealTemplate in `services/shared/shared/db/models/__init__.py` — add import and __all__ entry.
- [ ] T003 [US4] Create Alembic migration `services/shared/alembic/versions/005_planning_enhancements.py` — create RecurringMealTemplates table with all columns, FKs, unique constraint on (household_id, day, meal_type), CHECK on day (0-6), index on household_id. Downgrade drops the table.

### V1 — Model & Migration Checkpoint

- [ ] V001 Run shared lint: `cd services/shared && uv run ruff check shared/ && uv run ruff format --check shared/`
- [ ] V002 Run API tests to verify no regressions: `cd services/api && uv run pytest tests/ -v`

---

## Phase 2: Substitution API (US1 — Ingredient Substitution) 🎯 MVP

**Goal**: API endpoint that accepts an ingredient swap request, calls the AI, returns an updated recipe with modified steps and grocery list changes.

**Independent Test**: Select a recipe ingredient, request a swap, verify the new recipe has updated quantities/steps and grocery list reflects the change.

### Pydantic Models

- [ ] T004 [P] [US1] Create Pydantic request/response models in `services/api/src/api/models/substitution.py` — `SubstitutionRequest` (original_ingredient_name: str, replacement_ingredient_name: str), `GroceryChangeItem` (ingredient_name, action: Literal["added","removed","updated"], quantity, unit), `SubstitutionResponse` (new_recipe: RecipeResponse imported from meal_plan models, allergen_warnings: list[str], grocery_changes: list[GroceryChangeItem]).

### Service Layer

- [ ] T005 [US1] Create SubstitutionService in `services/api/src/api/services/substitution_service.py` — `substitute_ingredient(plan_id, slot_id, request)` method: (1) load recipe from slot, validate original_ingredient exists; (2) check allergens via MemberPreference query — if replacement matches any household allergy, add warning; (3) build substitution prompt (call to worker prompts.py function); (4) call LLM via _call_llm pattern from meal_plan_service.py; (5) parse response into new Recipe with source_recipe_id=original; (6) persist new recipe + ingredients + steps; (7) update MealSlot.recipe_id; (8) recalculate grocery list differences; (9) return SubstitutionResponse.

### Prompt Builder

- [ ] T006 [US1] Add `build_substitution_prompt()` function in `services/workers/meal_plan_generator/prompts.py` — accepts recipe_title, recipe_ingredients (list[dict]), recipe_steps (list[dict]), original_ingredient, replacement_ingredient, allergen_ingredients (optional set[str]). Returns a prompt instructing the AI to: replace the ingredient, adjust quantities, update cooking steps, respect allergens, return JSON matching GeneratedRecipe schema.

### Routes

- [ ] T007 [US1] Create substitution route in `services/api/src/api/routes/substitution.py` — `POST /api/v1/meal-plans/{plan_id}/slots/{slot_id}/substitute` accepting SubstitutionRequest body, returning SubstitutionResponse. Validate slot exists and belongs to household.
- [ ] T008 [US1] Register substitution router in `services/api/src/api/routes/__init__.py`.
- [ ] T009 [US1] Add `get_substitution_service` dependency factory in `services/api/src/api/middleware/dependencies.py`.

### Tests

- [ ] T010 [US1] Write substitution endpoint tests in `services/api/tests/test_substitution.py` — test successful substitution (new recipe created with source_recipe_id), ingredient not found 400, allergen warning included, grocery changes returned, slot updated to new recipe.
- [ ] T011 [P] [US1] Write substitution prompt tests in `services/workers/tests/test_prompts.py` — test build_substitution_prompt output contains ingredient swap instruction, allergen constraints, recipe context.

### V2 — Substitution API Checkpoint

- [ ] V003 Run API lint: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/`
- [ ] V004 Run API tests: `cd services/api && uv run pytest tests/ -v`
- [ ] V005 Run worker lint + tests: `cd services/workers && uv run ruff check meal_plan_generator/ && uv run pytest tests/ -v`

---

## Phase 3: Quick Suggestions API (US2 — What Can I Make Right Now?)

**Goal**: Synchronous endpoint that queries inventory and returns AI-generated recipe suggestions using on-hand ingredients.

**Independent Test**: Add inventory items, call quick-suggestions, verify returned recipes primarily use on-hand ingredients.

### Pydantic Models

- [ ] T012 [P] [US2] Create Pydantic response models in `services/api/src/api/models/quick_suggestion.py` — `SuggestionIngredient` (name, quantity, unit, on_hand: bool), `QuickSuggestion` (title, description, prep_time_min, cook_time_min, servings, ingredients: list[SuggestionIngredient]), `QuickSuggestionsResponse` (suggestions: list[QuickSuggestion], message: str | None).

### Worker Schema

- [ ] T013 [P] [US2] Add `QuickSuggestionPlan` schema in `services/workers/meal_plan_generator/schemas.py` — Pydantic model for parsing LLM suggestion response: `suggestions: list[GeneratedRecipe]`.

### Prompt Builder

- [ ] T014 [US2] Add `build_quick_suggestion_prompt()` function in `services/workers/meal_plan_generator/prompts.py` — accepts inventory, expiring items, max_results (default 5), member_preferences (optional), allergen_ingredients (optional). Returns prompt instructing AI to suggest max_results recipes using primarily on-hand ingredients, prioritizing expiring items, respecting allergies. Include JSON schema for structured output.

### Service Layer

- [ ] T015 [US2] Create QuickSuggestionService in `services/api/src/api/services/quick_suggestion_service.py` — `get_suggestions(max_results)` method: (1) load household inventory with ingredients; (2) identify expiring items (sorted soonest first); (3) load member preferences + allergens; (4) build suggestion prompt; (5) call LLM synchronously via _call_llm pattern; (6) parse response; (7) flag each ingredient as on_hand by matching against inventory; (8) handle empty inventory case with message. Return QuickSuggestionsResponse.

### Routes

- [ ] T016 [US2] Create quick suggestions route in `services/api/src/api/routes/quick_suggestions.py` — `GET /api/v1/quick-suggestions` with optional query param `max_results` (default 5, max 10). Returns QuickSuggestionsResponse.
- [ ] T017 [US2] Register quick_suggestions router in `services/api/src/api/routes/__init__.py`.
- [ ] T018 [US2] Add `get_quick_suggestion_service` dependency factory in `services/api/src/api/middleware/dependencies.py`.

### Tests

- [ ] T019 [US2] Write quick suggestion endpoint tests in `services/api/tests/test_quick_suggestions.py` — test suggestions returned with on_hand flags, empty inventory returns message, max_results parameter respected, expiring items prioritized in prompt.
- [ ] T020 [P] [US2] Write quick suggestion prompt tests in `services/workers/tests/test_prompts.py` — test build_quick_suggestion_prompt output contains inventory items, expiring priority instruction, allergen constraints.

### V3 — Quick Suggestions API Checkpoint

- [ ] V006 Run API lint: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/`
- [ ] V007 Run API tests: `cd services/api && uv run pytest tests/ -v`
- [ ] V008 Run worker lint + tests: `cd services/workers && uv run ruff check meal_plan_generator/ && uv run pytest tests/ -v`

---

## Phase 4: Multi-Meal-Type Planning (US3)

**Goal**: Extend plan creation to support breakfast/lunch/dinner, with meal-type-appropriate AI generation and correct slot creation.

### API Model Change

- [ ] T021 [US3] Add `meal_types: list[str] | None = None` field to `CreateMealPlan` in `services/api/src/api/models/meal_plan.py`. Add validation: allowed values are "breakfast", "lunch", "dinner".
- [ ] T022 [US3] Modify `MealPlanService.create_plan()` in `services/api/src/api/services/meal_plan_service.py` to include `meal_types` in queue message (default `["dinner"]` when None).

### Worker Prompt Changes

- [ ] T023 [US3] Modify `SYSTEM_PROMPT` in `services/workers/meal_plan_generator/prompts.py` to accept meal_types parameter — template the prompt to describe meal types (e.g., "7-day breakfast and dinner plan") and instruct AI to label each recipe with its meal_type. Add `format_meal_types()` helper function.
- [ ] T024 [US3] Extend `build_prompt()` in `services/workers/meal_plan_generator/prompts.py` to accept `meal_types: list[str] | None = None` kwarg, pass to system prompt formatter.

### Worker Schema Changes

- [ ] T025 [US3] Add `meal_type: str | None = None` field to `GeneratedRecipe` in `services/workers/meal_plan_generator/schemas.py` if not already present (check: it may exist from 003 — verify before modifying).

### Worker Generator Changes

- [ ] T026 [US3] Modify `generate_meal_plan()` in `services/workers/meal_plan_generator/generator.py` to read `meal_types` from queue message (default `["dinner"]`), pass through to `build_prompt()` and `_persist_plan()`.
- [ ] T027 [US3] Modify `_persist_plan()` in `services/workers/meal_plan_generator/generator.py` to create MealSlot records with correct `meal_type` values. When multiple meal types requested: group recipes by their `meal_type` field from AI response. For each day (0-6) and each meal_type, create a slot. Handle mismatch gracefully (if AI doesn't label meal_type, infer from recipe index order).

### Worker Validator Changes

- [ ] T028 [US3] Extend `validate_constraints()` in `services/workers/meal_plan_generator/validator.py` to accept `meal_types: list[str] | None = None`. When specified, verify total recipe count is approximately `len(meal_types) * 7` (within ±2 tolerance). Verify recipe meal_type labels match requested types when present.

### Tests

- [ ] T029 [US3] Write/extend meal plan creation tests in `services/api/tests/test_meal_plans.py` — test meal_types passthrough in queue message, default to ["dinner"], invalid meal_type rejected.
- [ ] T030 [P] [US3] Write multi-meal prompt tests in `services/workers/tests/test_prompts.py` — test format_meal_types helper, verify prompt describes all requested meal types.
- [ ] T031 [US3] Write multi-meal validator tests in `services/workers/tests/test_validator.py` — test recipe count validation for single meal type, multiple meal types, tolerance.
- [ ] T032 [US3] Write generator tests in `services/workers/tests/test_generator.py` — test slot creation with multiple meal types, correct meal_type assignment per slot.

### V4 — Multi-Meal Checkpoint

- [ ] V009 Run API lint + tests: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && uv run pytest tests/ -v`
- [ ] V010 Run worker lint + tests: `cd services/workers && uv run ruff check meal_plan_generator/ && uv run ruff format --check meal_plan_generator/ && uv run pytest tests/ -v`

---

## Phase 5: Recurring Meals API (US4)

**Goal**: CRUD endpoints for managing recurring meal templates that pre-populate into new plans.

**Independent Test**: Create a recurring template, list templates, verify CRUD operations and unique constraint enforcement.

### Pydantic Models

- [ ] T033 [P] [US4] Create Pydantic models in `services/api/src/api/models/recurring_meal.py` — `CreateRecurringMealTemplate` (day: int Field(ge=0, le=6), meal_type: str, recipe_id: UUID | None, recipe_title: str | None), `UpdateRecurringMealTemplate` (all fields optional), `RecurringMealTemplateResponse` (all fields + id, household_id, is_active, created_at). Add validation: at least one of recipe_id or recipe_title must be provided.

### Service Layer

- [ ] T034 [US4] Create RecurringMealService in `services/api/src/api/services/recurring_meal_service.py` — list (household-scoped, active first), create (enforce unique constraint, validate at least one of recipe_id/recipe_title), update (partial), delete (204). Handle IntegrityError→409 for duplicate day/meal_type.

### Routes

- [ ] T035 [US4] Create recurring meal routes in `services/api/src/api/routes/recurring_meals.py` — `GET /api/v1/recurring-meals`, `POST /api/v1/recurring-meals` (201), `PATCH /api/v1/recurring-meals/{template_id}`, `DELETE /api/v1/recurring-meals/{template_id}` (204).
- [ ] T036 [US4] Register recurring_meals router in `services/api/src/api/routes/__init__.py`.
- [ ] T037 [US4] Add `get_recurring_meal_service` dependency factory in `services/api/src/api/middleware/dependencies.py`.

### Worker Integration

- [ ] T038 [US4] Extend `_load_context()` in `services/workers/meal_plan_generator/generator.py` to load active RecurringMealTemplates for the household. Return in context dict as `recurring_templates`.
- [ ] T039 [US4] Extend `_persist_plan()` in `services/workers/meal_plan_generator/generator.py` to pre-fill MealSlots from recurring templates before creating AI-generated slots. For templates with recipe_id: create slot with that recipe directly. For templates with only recipe_title: include as constraint in prompt, let AI generate.
- [ ] T040 [US4] Add `format_recurring_constraints()` function in `services/workers/meal_plan_generator/prompts.py` — formats pre-filled slots as prompt constraints (e.g., "Tuesday dinner is already set to 'Chicken Tacos' — generate recipes for the remaining slots."). Integrate into `build_prompt()`.

### Tests

- [ ] T041 [US4] Write recurring meal endpoint tests in `services/api/tests/test_recurring_meals.py` — test CRUD operations, duplicate day/meal_type 409, recipe_id or recipe_title required, list returns active first, delete returns 204.
- [ ] T042 [US4] Write generator tests for recurring pre-fill in `services/workers/tests/test_generator.py` — test pre-filled slots created from templates, remaining slots from AI, recipe_title-only templates included in prompt.
- [ ] T043 [P] [US4] Write recurring constraint prompt tests in `services/workers/tests/test_prompts.py` — test format_recurring_constraints output.

### V5 — Recurring Meals Checkpoint

- [ ] V011 Run API lint + tests: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && uv run pytest tests/ -v`
- [ ] V012 Run worker lint + tests: `cd services/workers && uv run ruff check meal_plan_generator/ && uv run ruff format --check meal_plan_generator/ && uv run pytest tests/ -v`

---

## Phase 6: Frontend — Substitution Dialog (US1)

**Goal**: Modal dialog for ingredient substitution, integrated into MealSlotCard.

### Types & API Client

- [ ] T044 [P] [US1] Add TypeScript types to `apps/web/src/types/index.ts` — `SubstitutionRequest`, `GroceryChange`, `SubstitutionResult`, `MealType`.
- [ ] T045 [P] [US1] Add API client function in `apps/web/src/services/api.ts` — `substituteIngredient(planId, slotId, data: SubstitutionRequest)` → `fetchApi<SubstitutionResult>`.

### Components

- [ ] T046 [US1] Create SubstitutionDialog component in `apps/web/src/components/SubstitutionDialog.tsx` — modal triggered with ingredient context; input for replacement ingredient name; loading state during LLM call; result display with ingredient diff and step changes; allergen warning banner; Apply/Cancel buttons; calls `substituteIngredient()` API.

### Modified Components

- [ ] T047 [US1] Modify MealSlotCard in `apps/web/src/components/meal-plan/MealSlotCard.tsx` — add "Swap" button/icon on each ingredient row in the recipe detail view. On click, open SubstitutionDialog with ingredient context. After successful substitution, refresh slot data.

### Tests

- [ ] T048 [US1] Write SubstitutionDialog tests in `apps/web/src/__tests__/substitution-dialog.test.tsx` — test render, input, loading state, result display, allergen warning, apply action.

### V6 — Frontend Substitution Checkpoint

- [ ] V013 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V014 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V015 Run frontend tests: `cd apps/web && npm test -- --run`

---

## Phase 7: Frontend — Quick Suggestions (US2)

**Goal**: "What can I make right now?" page showing AI-generated recipe suggestions from current inventory.

### Types & API Client

- [ ] T049 [P] [US2] Add TypeScript types to `apps/web/src/types/index.ts` — `QuickSuggestion`, `SuggestionIngredient`, `QuickSuggestionsResponse`.
- [ ] T050 [P] [US2] Add API client function in `apps/web/src/services/api.ts` — `getQuickSuggestions(maxResults?)` → `fetchApi<QuickSuggestionsResponse>`.

### Components

- [ ] T051 [US2] Create QuickSuggestionCard component in `apps/web/src/components/QuickSuggestionCard.tsx` — recipe card with title, description, prep/cook time, ingredient list with on-hand checkmarks (✓ for on_hand=true, ✗ for false), "Cook This" button.

### Page

- [ ] T052 [US2] Create quick suggestions page in `apps/web/src/app/quick-suggestions/page.tsx` — "What can I make right now?" heading, loading state while fetching, grid of QuickSuggestionCards, empty state message when no suggestions. "Cook This" action: creates standalone meal slot via API.

### Tests

- [ ] T053 [US2] Write quick suggestions page tests in `apps/web/src/__tests__/quick-suggestions.test.tsx` — test rendering, loading state, suggestion cards, on-hand indicators, empty state, "Cook This" interaction.

### V7 — Frontend Quick Suggestions Checkpoint

- [ ] V016 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V017 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V018 Run frontend tests: `cd apps/web && npm test -- --run`

---

## Phase 8: Frontend — Multi-Meal & Recurring (US3, US4)

**Goal**: Meal type selector in plan creation, updated weekly plan view for multiple meal types, recurring meal template management page.

### Types & API Client

- [ ] T054 [P] [US3] Add `CreateMealPlanBody` update in `apps/web/src/services/api.ts` — add `meal_types?: string[]` to existing CreateMealPlanBody interface. Modify `createMealPlan()` to pass meal_types.
- [ ] T055 [P] [US4] Add TypeScript types to `apps/web/src/types/index.ts` — `RecurringMealTemplate`.
- [ ] T056 [P] [US4] Add API client functions in `apps/web/src/services/api.ts` — `listRecurringMeals()`, `createRecurringMeal(data)`, `updateRecurringMeal(id, data)`, `deleteRecurringMeal(id)`.

### Components

- [ ] T057 [US3] Create MealTypeSelector component in `apps/web/src/components/MealTypeSelector.tsx` — multi-checkbox with options: Breakfast, Lunch, Dinner (Dinner checked by default). Returns selected `meal_types` array.
- [ ] T058 [US4] Create RecurringMealManager component in `apps/web/src/components/RecurringMealManager.tsx` — list of recurring templates with day name, meal type, recipe title; add form with day-of-week select, meal type dropdown, recipe title input; edit/delete buttons per template.

### Modified Components

- [ ] T059 [US3] Modify WeeklyPlanView in `apps/web/src/components/meal-plan/WeeklyPlanView.tsx` — group slots by meal type within each day when multiple meal types present. Show meal type label headers ("🌅 Breakfast", "🍽️ Lunch", "🌙 Dinner"). Handle 1-3 rows per day.
- [ ] T060 [US3] Integrate MealTypeSelector into meal plan creation flow (the component/page where `createMealPlan()` is called) — add MealTypeSelector before the generate button, pass selected `meal_types` in request body.

### Page

- [ ] T061 [US4] Create recurring meals page in `apps/web/src/app/recurring-meals/page.tsx` — renders RecurringMealManager component with data loading.

### Tests

- [ ] T062 [P] [US3] Write MealTypeSelector tests in `apps/web/src/__tests__/meal-type-selector.test.tsx` — test default state (dinner checked), toggle checkboxes, return value.
- [ ] T063 [P] [US4] Write RecurringMealManager tests in `apps/web/src/__tests__/recurring-meals.test.tsx` — test list display, add template, delete template, validation.

### V8 — Frontend Multi-Meal & Recurring Checkpoint

- [ ] V019 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V020 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V021 Run frontend tests: `cd apps/web && npm test -- --run`

---

## Phase 9: E2E Tests + Polish

**Goal**: End-to-end Playwright tests covering all four user stories. Final regression check.

- [ ] T064 [US1] E2E test: View recipe → substitute ingredient → verify new recipe with updated steps and grocery list changes.
- [ ] T065 [US2] E2E test: Add inventory items → navigate to quick suggestions → verify suggestion cards with on-hand indicators.
- [ ] T066 [US3] E2E test: Create meal plan with multiple meal types → verify weekly plan shows meal type grouping.
- [ ] T067 [US4] E2E test: Create recurring template → generate new plan → verify pre-filled slot.
- [ ] T068 Full regression: run all existing E2E tests to verify no regressions from planning enhancement changes.

### V9 — Final Checkpoint

- [ ] V022 Run all API tests: `cd services/api && uv run pytest tests/ -v`
- [ ] V023 Run all worker tests: `cd services/workers && uv run pytest tests/ -v`
- [ ] V024 Run all frontend tests: `cd apps/web && npm test -- --run`
- [ ] V025 Run frontend lint + type check: `cd apps/web && npm run lint && npx tsc --noEmit`
- [ ] V026 Run API + shared lint: `cd services/api && uv run ruff check src/ && cd ../../services/shared && uv run ruff check shared/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Model & Migration)**: No dependencies — start immediately. Required for Phase 5 (Recurring Meals API).
- **Phase 2 (Substitution API)**: No model dependency — uses existing Recipe/MealSlot/RecipeIngredient. Can start immediately.
- **Phase 3 (Quick Suggestions API)**: No model dependency — uses existing Inventory. Can start immediately.
- **Phase 4 (Multi-Meal Planning)**: No model dependency — MealSlot.meal_type already exists. Can start immediately.
- **Phase 5 (Recurring Meals API)**: Depends on Phase 1 (RecurringMealTemplate model).
- **Phase 6 (Frontend Substitution)**: Depends on Phase 2 (API must exist).
- **Phase 7 (Frontend Quick Suggestions)**: Depends on Phase 3 (API must exist).
- **Phase 8 (Frontend Multi-Meal & Recurring)**: Depends on Phases 4 and 5.
- **Phase 9 (E2E)**: Depends on all prior phases.

### Parallel Opportunities

```
Start
  │
  ├──► Phase 1 (Model) ──────────────────► Phase 5 (Recurring API) ──┐
  ├──► Phase 2 (Substitution API) ──► Phase 6 (Frontend Substitution) ├─► Phase 8 (Frontend Multi/Recurring) ──► Phase 9 (E2E)
  ├──► Phase 3 (Quick Suggestions API) ──► Phase 7 (Frontend Quick)   │
  └──► Phase 4 (Multi-Meal Planning) ────────────────────────────────┘
```

Phases 1-4 can all proceed in parallel (different files, no conflicts). Phase 5 waits only on Phase 1. Frontend phases wait on their respective backend APIs.

### Within Each Phase

- Pydantic models before services
- Services before routes
- Routes before tests (tests validate the full stack)
- Prompt functions before service methods that call them
- Implementation before checkpoint verification

---

## Task Summary

| Phase                                    | Tasks     | Tests      | Checkpoints |
| ---------------------------------------- | --------- | ---------- | ----------- |
| 1. Model & Migration (US4)               | T001–T003 | —          | V001–V002   |
| 2. Substitution API (US1)                | T004–T011 | T010–T011  | V003–V005   |
| 3. Quick Suggestions API (US2)           | T012–T020 | T019–T020  | V006–V008   |
| 4. Multi-Meal Planning (US3)             | T021–T032 | T029–T032  | V009–V010   |
| 5. Recurring Meals API (US4)             | T033–T043 | T041–T043  | V011–V012   |
| 6. Frontend Substitution (US1)           | T044–T048 | T048       | V013–V015   |
| 7. Frontend Quick Suggestions (US2)      | T049–T053 | T053       | V016–V018   |
| 8. Frontend Multi-Meal & Recurring (US3,US4) | T054–T063 | T062–T063 | V019–V021   |
| 9. E2E + Polish                          | T064–T068 | T064–T068  | V022–V026   |

**Total: 68 tasks + 26 verification checkpoints = 94 items**
