# Implementation Plan: Planning Enhancements

**Branch**: `004-planning-enhancements` | **Date**: 2026-03-03 | **Spec**: `specs/004-planning-enhancements/spec.md`
**Input**: Feature specification from `/specs/004-planning-enhancements/spec.md`

## Summary

Enhance meal planning capabilities with four features: AI-powered ingredient substitution that updates recipes, steps, and grocery lists (US1); "What can I make right now?" quick suggestions from current inventory (US2); multi-meal-type planning for breakfast/lunch/dinner (US3); and recurring meal slots that pre-populate into new weekly plans (US4). Implementation adds 1 new DB model, 6 new API endpoints, extended worker prompt/validation logic, a new worker suggestion module, and 4 new frontend components/pages.

## Technical Context

**Language/Version**: Python 3.12 (backend/workers), TypeScript 5 (frontend)
**Primary Dependencies**: FastAPI + SQLAlchemy 2.0 async + Pydantic v2 (API), Next.js 16 + React 19 + Tailwind CSS 4 (web), Python workers polling Azure Queue
**Storage**: Azure SQL (prod) / SQL Server 2025 (local), Alembic migrations
**Testing**: pytest (API: ~115 tests, Workers: ~56 tests), Vitest (frontend: ~87 tests), Playwright (E2E: ~36 tests)
**Target Platform**: Azure cloud (prod), .NET Aspire local dev orchestrator
**Project Type**: Full-stack web application (API + worker + SPA)
**Performance Goals**: Substitution <10s p95; quick suggestions <8s p95; CRUD <200ms p95
**Constraints**: Must maintain backward compatibility — default `meal_types=["dinner"]` preserves current behavior; `source_recipe_id` lineage for all substitutions; allergen check on substitutions
**Scale/Scope**: Household-scoped; 1 new table, 6 new endpoints, worker prompt extensions, 4 new frontend components

## Constitution Check

_GATE: Passes._

This feature adds 1 new model (RecurringMealTemplate) — well within complexity norms for the existing 16-table schema. US1 (substitution) and US2 (quick suggestions) use the existing LLM client and prompt builder pattern. US3 (multi-meal) requires only prompt and slot-creation changes — the MealSlot model already supports `meal_type` with the correct unique constraint. US4 (recurring) is the only feature requiring a new table. No new infrastructure dependencies. No new service boundaries. Frontend changes add components within the existing app router structure.

## New Models Design

### RecurringMealTemplate (new table: `RecurringMealTemplates`)

| Column         | Type                      | Constraints                                      |
| -------------- | ------------------------- | ------------------------------------------------ |
| `id`           | `UUID` (UNIQUEIDENTIFIER) | PK, default `uuid4()`                            |
| `household_id` | `UUID`                    | FK → `Households.id`, NOT NULL                   |
| `day`          | `Integer`                 | NOT NULL, CHECK 0-6 (Mon=0 through Sun=6)        |
| `meal_type`    | `String(20)`              | NOT NULL, e.g., "breakfast", "lunch", "dinner"   |
| `recipe_id`    | `UUID`                    | FK → `Recipes.id`, NULLABLE                      |
| `recipe_title` | `String(300)`             | NULLABLE — free-text hint when recipe_id is NULL |
| `is_active`    | `Boolean`                 | NOT NULL, default `True`                         |
| `created_at`   | `DateTime`                | NOT NULL, default `sysutcdatetime()`             |
| `updated_at`   | `DateTime`                | NOT NULL, default `sysutcdatetime()`, onupdate   |

**Constraints**: `UNIQUE(household_id, day, meal_type)` — one template per day/meal-type per household.
**Indexes**: `ix_recurring_templates_household` on `household_id`.
**Relationships**: `recipe` → `Recipe` (nullable, lazy="selectin").

**Logic**: When `recipe_id` is set, the system uses that exact recipe for the slot. When only `recipe_title` is set (no recipe_id), the AI uses the title as a hint when generating. At least one of `recipe_id` or `recipe_title` must be non-null (application-level validation).

### CreateMealPlan extension (modify existing Pydantic model)

Add optional field to `CreateMealPlan` in `services/api/src/api/models/meal_plan.py`:

```python
meal_types: list[str] | None = None  # default ["dinner"] in service layer
```

This is per-request, not persisted on the MealPlan row. Passed through the queue message to the worker.

### Substitution Request/Response (new Pydantic models)

```python
class SubstitutionRequest(BaseModel):
    original_ingredient_name: str
    replacement_ingredient_name: str


class SubstitutionResponse(BaseModel):
    new_recipe: RecipeResponse
    allergen_warnings: list[str] = []
    grocery_changes: list[GroceryChangeItem] = []


class GroceryChangeItem(BaseModel):
    ingredient_name: str
    action: Literal["added", "removed", "updated"]
    quantity: float
    unit: str
```

### Quick Suggestion Response (new Pydantic models)

```python
class QuickSuggestion(BaseModel):
    title: str
    description: str
    prep_time_min: int
    cook_time_min: int
    servings: int = 2
    ingredients: list[SuggestionIngredient]


class SuggestionIngredient(BaseModel):
    name: str
    quantity: float
    unit: str
    on_hand: bool  # whether this ingredient is in the user's inventory


class QuickSuggestionsResponse(BaseModel):
    suggestions: list[QuickSuggestion]
    message: str | None = None  # e.g., "Not enough inventory for suggestions"
```

## API Endpoints

### Ingredient Substitution — `/api/v1/meal-plans/{plan_id}/slots/{slot_id}/substitute`

| Method | Path                                                      | Description                          | Request Body          | Response               |
| ------ | --------------------------------------------------------- | ------------------------------------ | --------------------- | ---------------------- |
| `POST` | `/api/v1/meal-plans/{plan_id}/slots/{slot_id}/substitute` | Substitute an ingredient in a recipe | `SubstitutionRequest` | `SubstitutionResponse` |

**Logic**:

1. Load recipe from slot, validate `original_ingredient_name` exists.
2. Build substitution prompt with full recipe context + allergy constraints.
3. Call LLM synchronously (like adapt_recipe pattern in meal_plan_service.py).
4. Parse response into new Recipe, create with `source_recipe_id = original.id`.
5. Update MealSlot.recipe_id to new recipe.
6. Recalculate grocery list for the plan.
7. Return new recipe + allergen warnings + grocery changes.

**Service**: Extension of `MealPlanService` or new `SubstitutionService(session, household_id)`.

### What Can I Make — `/api/v1/quick-suggestions`

| Method | Path                        | Description                           | Query Params              | Response                   |
| ------ | --------------------------- | ------------------------------------- | ------------------------- | -------------------------- |
| `GET`  | `/api/v1/quick-suggestions` | Get recipe suggestions from inventory | `max_results` (default 5) | `QuickSuggestionsResponse` |

**Logic**:

1. Load household inventory (with ingredients and expiry dates).
2. Build suggestion prompt — "suggest recipes using these ingredients, prioritize expiring items."
3. Call LLM synchronously via existing `_call_llm()` pattern.
4. Parse response, flag each ingredient as on_hand or not.
5. Return suggestions with on_hand flags.

**Service**: New `QuickSuggestionService(session, household_id)`.

### Recurring Templates — `/api/v1/recurring-meals`

| Method   | Path                           | Description              | Request Body                  | Response                              |
| -------- | ------------------------------ | ------------------------ | ----------------------------- | ------------------------------------- |
| `GET`    | `/api/v1/recurring-meals`      | List household templates | —                             | `list[RecurringMealTemplateResponse]` |
| `POST`   | `/api/v1/recurring-meals`      | Create a template        | `CreateRecurringMealTemplate` | `RecurringMealTemplateResponse` (201) |
| `PATCH`  | `/api/v1/recurring-meals/{id}` | Update a template        | `UpdateRecurringMealTemplate` | `RecurringMealTemplateResponse`       |
| `DELETE` | `/api/v1/recurring-meals/{id}` | Delete a template        | —                             | 204 No Content                        |

**Service**: `RecurringMealService(session, household_id)` — CRUD with unique constraint enforcement.

### Pydantic Models (new in `services/api/src/api/models/`)

**`substitution.py`**:

- `SubstitutionRequest`: `original_ingredient_name: str`, `replacement_ingredient_name: str`
- `SubstitutionResponse`: `new_recipe: RecipeResponse`, `allergen_warnings: list[str]`, `grocery_changes: list[GroceryChangeItem]`
- `GroceryChangeItem`: `ingredient_name: str`, `action: str`, `quantity: float`, `unit: str`

**`quick_suggestion.py`**:

- `QuickSuggestion`: `title`, `description`, `prep_time_min`, `cook_time_min`, `servings`, `ingredients: list[SuggestionIngredient]`
- `SuggestionIngredient`: `name`, `quantity`, `unit`, `on_hand: bool`
- `QuickSuggestionsResponse`: `suggestions: list[QuickSuggestion]`, `message: str | None`

**`recurring_meal.py`**:

- `CreateRecurringMealTemplate`: `day: int` (0-6), `meal_type: str`, `recipe_id: UUID | None`, `recipe_title: str | None`
- `UpdateRecurringMealTemplate`: all fields optional
- `RecurringMealTemplateResponse`: all fields + `id`, `is_active`, `created_at`

**`meal_plan.py`** (modify existing):

- Add `meal_types: list[str] | None = None` to `CreateMealPlan`

## Worker Changes

### Substitution Prompt (`prompts.py`)

New function `build_substitution_prompt()`:

```python
def build_substitution_prompt(
    recipe_title: str,
    recipe_ingredients: list[dict],
    recipe_steps: list[dict],
    original_ingredient: str,
    replacement_ingredient: str,
    allergen_ingredients: set[str] | None = None,
) -> str:
```

Returns a prompt instructing the AI to:

1. Replace `original_ingredient` with `replacement_ingredient`
2. Adjust quantities for the new ingredient
3. Update all cooking steps that reference the original ingredient
4. Respect allergen constraints
5. Return JSON matching the `GeneratedRecipe` schema

### Quick Suggestion Prompt (`prompts.py`)

New function `build_quick_suggestion_prompt()`:

```python
def build_quick_suggestion_prompt(
    inventory: list[InventoryItem],
    expiring: list[InventoryItem],
    max_results: int = 5,
    member_preferences: dict | None = None,
    allergen_ingredients: set[str] | None = None,
) -> str:
```

Returns a prompt instructing the AI to suggest `max_results` recipes using primarily on-hand ingredients, prioritizing expiring items, respecting preferences/allergies.

New Pydantic schema `QuickSuggestionSchema` in `schemas.py` for parsing LLM response.

### Multi-Meal Prompt Extension (`prompts.py`)

Modify `SYSTEM_PROMPT` to be configurable by meal types:

```python
SYSTEM_PROMPT_TEMPLATE = """You are a meal planning assistant. Generate a \
7-day {meal_types_description} plan for 2 adults.
...
"""
```

When `meal_types=["breakfast", "dinner"]`, the prompt says "7-day breakfast and dinner plan" and instructs the AI to generate 14 recipes (7 breakfast + 7 dinner) with meal-type-appropriate characteristics.

### Generator (`generator.py`)

Extend `generate_meal_plan()`:

1. Read `meal_types` from queue message (default `["dinner"]`).
2. Load recurring templates for the household.
3. Pre-fill slots from recurring templates.
4. Build prompt with meal types and pre-filled constraints.
5. Parse response — create slots with correct `meal_type` per recipe.

Extend `_persist_plan()`:

1. Accept `meal_types` parameter.
2. Create MealSlot with correct `meal_type` for each recipe.
3. For multi-meal plans: iterate by meal type then by day.

### Validator (`validator.py`)

Extend `validate_constraints()`:

1. When `meal_types` specified, verify recipe count matches `len(meal_types) * 7` (±2 tolerance).
2. Verify each recipe has appropriate `cuisine_type` or `meal_type_hint` from the AI.

### Worker Schema (`schemas.py`)

Add `meal_type: str | None = None` to `GeneratedRecipe` so the AI can label each recipe with its intended meal type.

Add `QuickSuggestionPlan` schema for parsing quick suggestion responses:

```python
class QuickSuggestionPlan(BaseModel):
    suggestions: list[GeneratedRecipe]
```

## Frontend Changes

### New Pages

**`/quick-suggestions`** — What Can I Make Right Now:

- Button on dashboard "What can I make?" or dedicated page
- Shows loading state while LLM processes
- Displays 3-5 recipe cards with ingredients (flagged on-hand vs. need-to-buy)
- "Cook This" button on each card to create a tracking slot
- Empty state when inventory insufficient

### New Components

**`SubstitutionDialog.tsx`**:

- Modal/dialog triggered from recipe ingredient list
- Select ingredient to replace, type replacement ingredient name
- Shows loading state during AI processing
- Displays result with diff-style changes (removed ingredient ~~struck~~, added ingredient **bold**)
- "Apply" and "Cancel" buttons
- Allergen warning banner if applicable

**`QuickSuggestionCard.tsx`**:

- Recipe card showing title, description, prep/cook time
- Ingredient list with on-hand checkmarks
- "Cook This" action button

**`RecurringMealManager.tsx`**:

- List of recurring templates (day, meal_type, recipe title)
- Add/edit/delete template UI
- Day-of-week selector, meal type dropdown, recipe search/free-text

**`MealTypeSelector.tsx`**:

- Multi-checkbox in plan creation flow: ☑ Breakfast ☑ Lunch ☑ Dinner
- Default: only Dinner checked
- Passes `meal_types` array to `createMealPlan()`

### Modified Components

**`MealSlotCard.tsx`**:

- Add "Substitute Ingredient" button/menu on each ingredient row
- Trigger SubstitutionDialog on click
- After substitution, refresh slot data

**`WeeklyPlanView.tsx`**:

- Group slots by meal type within each day when multiple meal types present
- Show meal type label ("🌅 Breakfast", "🍽️ Lunch", "🌙 Dinner")
- Handle 1-3 rows per day depending on requested meal types

**`CreateMealPlan` flow** (existing plan creation UI):

- Add MealTypeSelector component
- Pass `meal_types` in request body

### New TypeScript Types (`apps/web/src/types/index.ts`)

```typescript
export type MealType = "breakfast" | "lunch" | "dinner";

export interface RecurringMealTemplate {
  id: string;
  household_id: string;
  day: number;
  meal_type: string;
  recipe_id: string | null;
  recipe_title: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SubstitutionRequest {
  original_ingredient_name: string;
  replacement_ingredient_name: string;
}

export interface GroceryChange {
  ingredient_name: string;
  action: "added" | "removed" | "updated";
  quantity: number;
  unit: string;
}

export interface SubstitutionResult {
  new_recipe: Recipe;
  allergen_warnings: string[];
  grocery_changes: GroceryChange[];
}

export interface QuickSuggestion {
  title: string;
  description: string;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  ingredients: SuggestionIngredient[];
}

export interface SuggestionIngredient {
  name: string;
  quantity: number;
  unit: string;
  on_hand: boolean;
}

export interface QuickSuggestionsResponse {
  suggestions: QuickSuggestion[];
  message: string | null;
}
```

### New API Client Functions (`apps/web/src/services/api.ts`)

- `substituteIngredient(planId, slotId, data)` → `fetchApi<SubstitutionResult>`
- `getQuickSuggestions(maxResults?)` → `fetchApi<QuickSuggestionsResponse>`
- `listRecurringMeals()` → `fetchApi<RecurringMealTemplate[]>`
- `createRecurringMeal(data)` → `fetchApi<RecurringMealTemplate>`
- `updateRecurringMeal(id, data)` → `fetchApi<RecurringMealTemplate>`
- `deleteRecurringMeal(id)` → `fetchApi<void>`

## Project Structure

### New & Modified Files

```text
services/
  shared/
    shared/db/models/
      recurring_meal.py         # NEW — RecurringMealTemplate model
      __init__.py               # MODIFIED — export RecurringMealTemplate
    alembic/versions/
      005_planning_enhancements.py # NEW — create RecurringMealTemplates table

  api/
    src/api/
      routes/
        substitution.py          # NEW — substitution endpoint
        quick_suggestions.py     # NEW — quick suggestions endpoint
        recurring_meals.py       # NEW — recurring template CRUD
        meal_plans.py            # MODIFIED — accept meal_types in create
        __init__.py              # MODIFIED — register new routers
      services/
        substitution_service.py  # NEW — SubstitutionService
        quick_suggestion_service.py # NEW — QuickSuggestionService
        recurring_meal_service.py # NEW — RecurringMealService
        meal_plan_service.py     # MODIFIED — pass meal_types to queue
      models/
        substitution.py          # NEW — substitution request/response models
        quick_suggestion.py      # NEW — suggestion response models
        recurring_meal.py        # NEW — recurring template models
        meal_plan.py             # MODIFIED — add meal_types to CreateMealPlan
      middleware/
        dependencies.py          # MODIFIED — add new service factories
    tests/
      test_substitution.py       # NEW — substitution endpoint tests
      test_quick_suggestions.py  # NEW — quick suggestion tests
      test_recurring_meals.py    # NEW — recurring template CRUD tests
      test_meal_plans.py         # MODIFIED — test meal_types passthrough

  workers/
    meal_plan_generator/
      prompts.py                 # MODIFIED — substitution + suggestion + multi-meal prompts
      generator.py               # MODIFIED — multi-meal slot creation, recurring pre-fill
      validator.py               # MODIFIED — multi-meal count check
      schemas.py                 # MODIFIED — add meal_type to GeneratedRecipe, QuickSuggestionPlan
    tests/
      test_prompts.py            # MODIFIED — test new prompt functions
      test_validator.py          # MODIFIED — test multi-meal validation
      test_generator.py          # MODIFIED — test recurring pre-fill, multi-meal slots

apps/
  web/
    src/
      app/
        quick-suggestions/
          page.tsx               # NEW — "What can I make?" page
        recurring-meals/
          page.tsx               # NEW — recurring template management page
      components/
        SubstitutionDialog.tsx   # NEW — ingredient swap modal
        QuickSuggestionCard.tsx  # NEW — suggestion result card
        RecurringMealManager.tsx # NEW — recurring template list/CRUD
        MealTypeSelector.tsx     # NEW — meal type multi-checkbox
        meal-plan/
          MealSlotCard.tsx       # MODIFIED — add substitution trigger
          WeeklyPlanView.tsx     # MODIFIED — group by meal type
      services/
        api.ts                   # MODIFIED — add new API client functions
      types/
        index.ts                 # MODIFIED — add new TypeScript interfaces
    src/__tests__/
      substitution-dialog.test.tsx    # NEW
      quick-suggestions.test.tsx      # NEW
      recurring-meals.test.tsx        # NEW
      meal-type-selector.test.tsx     # NEW
```

## Migration Strategy

### Migration 005: `005_planning_enhancements.py`

Single Alembic migration that:

1. **Creates `RecurringMealTemplates` table** with all columns, FK constraints to Households and Recipes, unique constraint on `(household_id, day, meal_type)`, CHECK constraint on `day` (0-6), and index on `household_id`.

All changes are additive (1 new table). No data migration needed. Fully backward-compatible — existing queries and code are unaffected. No existing table modifications required since MealSlot already has `meal_type: String(20)` and Recipe already has `source_recipe_id`.

**Downgrade**: Drop the `RecurringMealTemplates` table.

## Implementation Order

1. **Phase 1 — RecurringMealTemplate Model & Migration**: Create SQLAlchemy model + Alembic migration. Foundation for US4.
2. **Phase 2 — Substitution API (US1)**: Pydantic models + service + route + tests. Highest priority feature.
3. **Phase 3 — Quick Suggestions API (US2)**: Pydantic models + service + route + tests. New capability.
4. **Phase 4 — Multi-Meal-Type Planning (US3)**: Modify CreateMealPlan, worker prompt, generator, validator. Extends existing flow.
5. **Phase 5 — Recurring Meals API (US4)**: CRUD service + routes + tests. Depends on Phase 1 model.
6. **Phase 6 — Worker: Multi-Meal + Recurring Integration**: Extend generator for multi-meal slots, recurring pre-fill, validation.
7. **Phase 7 — Frontend: Substitution Dialog (US1)**: SubstitutionDialog component + MealSlotCard integration.
8. **Phase 8 — Frontend: Quick Suggestions (US2)**: QuickSuggestionCard + page + API client.
9. **Phase 9 — Frontend: Multi-Meal & Recurring (US3, US4)**: MealTypeSelector, RecurringMealManager, WeeklyPlanView grouping.
10. **Phase 10 — E2E Tests**: Playwright tests covering all four user stories.

## Complexity Tracking

No constitution violations. RecurringMealTemplate is the only new DB model (16 → 17 tables). The substitution and quick-suggestion features reuse the existing LLM client pattern (`_call_llm()` in meal_plan_service.py). Multi-meal planning leverages the existing `meal_type` field on MealSlot — no schema change. The most complex change is the worker generator extension for multi-meal slot creation and recurring pre-fill, but this follows established patterns.
