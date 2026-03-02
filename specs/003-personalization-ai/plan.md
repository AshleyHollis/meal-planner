# Implementation Plan: Personalization AI

**Branch**: `003-personalization-ai` | **Date**: 2026-03-02 | **Spec**: `specs/003-personalization-ai/spec.md`
**Input**: Feature specification from `/specs/003-personalization-ai/spec.md`

## Summary

Add personalization features that improve AI meal plan quality: per-member food preferences with hard allergen blocking (US1), meal history & favorites for repetition avoidance (US2), recipe ratings & feedback for quality refinement (US3), and cuisine type requests for thematic plans (US4). Implementation adds 3 new DB models, 1 new column, 10 new API endpoints, extended worker prompt/validation logic, and 3 new frontend pages/components.

## Technical Context

**Language/Version**: Python 3.12 (backend/workers), TypeScript 5 (frontend)
**Primary Dependencies**: FastAPI + SQLAlchemy 2.0 async + Pydantic v2 (API), Next.js 16 + React 19 + Tailwind CSS 4 (web), Python workers polling Azure Queue
**Storage**: Azure SQL (prod) / SQL Server 2025 (local), Alembic migrations
**Testing**: pytest (API: 73 tests, Workers: 29 tests), Vitest (frontend: 37 tests), Playwright (E2E: 36 tests)
**Target Platform**: Azure cloud (prod), .NET Aspire local dev orchestrator
**Project Type**: Full-stack web application (API + worker + SPA)
**Performance Goals**: Preference CRUD <200ms p95; prompt construction overhead <500ms
**Constraints**: Zero allergen violations (100% hard-block compliance); no recipe from lookback window reappears unless favorited; ≥70% cuisine match when specified
**Scale/Scope**: Household-scoped multi-member; 3 new tables, 1 new column, 10 new endpoints, 3 new/modified frontend pages

## Constitution Check

_GATE: Passes._

This feature adds 3 new models (MemberPreference, RecipeFavorite, MealSlotRating) and 1 column (Recipe.cuisine_type) — well within complexity norms established by the existing 13-table schema. All new models follow existing patterns (UNIQUEIDENTIFIER PK, TimestampMixin, household/member scoping). No new infrastructure dependencies. No new service boundaries. Worker changes extend existing prompt builder and validator — no architectural shifts. Frontend changes add pages within the existing app router structure. Consistent with the project's established approach.

## New Models Design

### MemberPreference (new table: `MemberPreferences`)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `UUID` (UNIQUEIDENTIFIER) | PK, default `uuid4()` |
| `household_member_id` | `UUID` | FK → `HouseholdMembers.id`, NOT NULL |
| `preference_type` | `String(30)` | NOT NULL, one of: `dietary_restriction`, `allergy`, `dislike`, `like` |
| `value` | `String(200)` | NOT NULL, human-readable value (e.g., "vegetarian", "peanut", "cilantro") |
| `ingredient_id` | `UUID` | FK → `Ingredients.id`, NULLABLE — set for ingredient-level prefs (allergy/dislike/like) |
| `notes` | `String(500)` | NULLABLE, optional context |
| `created_at` | `DateTime` | NOT NULL, default `sysutcdatetime()` |
| `updated_at` | `DateTime` | NOT NULL, default `sysutcdatetime()`, onupdate |

**Constraints**: `UNIQUE(household_member_id, preference_type, value)` — prevents duplicate preferences.
**Indexes**: `ix_member_prefs_member` on `household_member_id`.
**Relationships**: `household_member` → `HouseholdMember`, `ingredient` → `Ingredient` (nullable).

**Valid `preference_type` values**:
- `dietary_restriction`: value is one of `vegetarian`, `vegan`, `halal`, `kosher`, `gluten-free`, `dairy-free`, `keto`, `paleo`
- `allergy`: value is ingredient name, `ingredient_id` should be set — **HARD BLOCK** in AI generation
- `dislike`: value is ingredient name, `ingredient_id` should be set — soft avoidance
- `like`: value is ingredient name, `ingredient_id` should be set — positive bias

### RecipeFavorite (new table: `RecipeFavorites`)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `UUID` (UNIQUEIDENTIFIER) | PK, default `uuid4()` |
| `household_id` | `UUID` | FK → `Households.id`, NOT NULL |
| `recipe_id` | `UUID` | FK → `Recipes.id`, NOT NULL |
| `created_at` | `DateTime` | NOT NULL, default `sysutcdatetime()` |

**Constraints**: `UNIQUE(household_id, recipe_id)` — one favorite record per recipe per household.
**Indexes**: `ix_recipe_favorites_household` on `household_id`.

### MealSlotRating (new table: `MealSlotRatings`)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `UUID` (UNIQUEIDENTIFIER) | PK, default `uuid4()` |
| `meal_slot_id` | `UUID` | FK → `MealSlots.id`, NOT NULL |
| `rated_by` | `UUID` | FK → `HouseholdMembers.id`, NOT NULL |
| `rating` | `Integer` | NOT NULL, CHECK 1–5 |
| `feedback` | `String(500)` | NULLABLE |
| `created_at` | `DateTime` | NOT NULL, default `sysutcdatetime()` |

**Constraints**: `UNIQUE(meal_slot_id, rated_by)` — one rating per member per slot.
**Indexes**: `ix_meal_slot_ratings_slot` on `meal_slot_id`.

### Recipe.cuisine_type (new column on existing `Recipes` table)

| Column | Type | Constraints |
|--------|------|-------------|
| `cuisine_type` | `String(50)` | NULLABLE, added to existing Recipe model |

Predefined values: `mexican`, `italian`, `asian`, `indian`, `mediterranean`, `american`, `comfort_food`. Free-text also accepted.

### CreateMealPlan extension (modify existing Pydantic model)

Add optional field to `CreateMealPlan`:
```python
cuisine_preferences: list[str] | None = None
```

This is per-request, not persisted on the MealPlan row. Passed through the queue message to the worker.

## API Endpoints

### Preferences — `/api/v1/members/{member_id}/preferences`

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `GET` | `/api/v1/members/{member_id}/preferences` | List all preferences for a member | — | `list[MemberPreferenceResponse]` |
| `POST` | `/api/v1/members/{member_id}/preferences` | Add a preference | `CreateMemberPreference` | `MemberPreferenceResponse` (201) |
| `DELETE` | `/api/v1/members/{member_id}/preferences/{preference_id}` | Remove a preference | — | 204 No Content |

**Static reference endpoint**:

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/api/v1/preferences/dietary-types` | List available dietary restriction enum values | `list[str]` |

**Service**: `PreferenceService(session, household_id)` — validates member belongs to household, enforces unique constraint.

### Favorites — `/api/v1/recipes/{recipe_id}/favorite`

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `POST` | `/api/v1/recipes/{recipe_id}/favorite` | Mark recipe as favorite (idempotent) | — | `RecipeFavoriteResponse` (201) |
| `DELETE` | `/api/v1/recipes/{recipe_id}/favorite` | Remove favorite | — | 204 No Content |
| `GET` | `/api/v1/favorites` | List household favorites | — | `list[RecipeFavoriteResponse]` |

**Service**: `FavoriteService(session, household_id)` — scoped to household, idempotent toggle.

### Ratings — `/api/v1/meal-plans/{plan_id}/slots/{slot_id}/rating`

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `POST` | `/api/v1/meal-plans/{plan_id}/slots/{slot_id}/rating` | Submit rating (1–5 + optional feedback) | `CreateMealSlotRating` | `MealSlotRatingResponse` (201) |
| `GET` | `/api/v1/meal-plans/{plan_id}/slots/{slot_id}/rating` | Get rating for a slot | — | `MealSlotRatingResponse \| null` |

**Validation**: Slot must have `status="cooked"` before rating. Rating 1–5, feedback max 500 chars.
**Service**: `RatingService(session, household_id)` — validates slot belongs to household's plan.

### Meal History — `/api/v1/meal-history`

| Method | Path | Description | Query Params | Response |
|--------|------|-------------|--------------|----------|
| `GET` | `/api/v1/meal-history` | Paginated cooked meal history | `page`, `page_size` (default 20) | `PaginatedResponse[MealHistoryItem]` |

Returns MealSlot records with `status="cooked"`, joined with recipe data, sorted by `cooked_at DESC`.

### Pydantic Models (new in `services/api/src/api/models/`)

**`preference.py`**:
- `CreateMemberPreference`: `preference_type: str`, `value: str`, `ingredient_id: UUID | None`, `notes: str | None`
- `MemberPreferenceResponse`: all fields + `id`, `created_at`

**`favorite.py`**:
- `RecipeFavoriteResponse`: `id`, `recipe_id`, `recipe_title`, `created_at`

**`rating.py`**:
- `CreateMealSlotRating`: `rating: int` (Field ge=1, le=5), `feedback: str | None` (max 500)
- `MealSlotRatingResponse`: all fields + `id`, `rated_by`, `created_at`

**`meal_history.py`**:
- `MealHistoryItem`: `slot_id`, `recipe_title`, `recipe_id`, `cooked_at`, `day`, `meal_type`, `rating: int | None`

## Worker Prompt Changes

### Prompt Builder (`prompts.py`)

Extend `build_prompt()` signature to accept personalization context:

```python
def build_prompt(
    inventory: list[InventoryItem],
    equipment: list[Equipment],
    expiring: list[InventoryItem],
    *,
    member_preferences: list[MemberPreference] | None = None,
    recent_meals: list[str] | None = None,
    favorites: list[str] | None = None,
    rating_insights: dict[str, Any] | None = None,
    cuisine_preferences: list[str] | None = None,
) -> str:
```

**New prompt sections appended after existing sections**:

1. **MEMBER PREFERENCES** — Lists each member's dietary restrictions (FILTER), allergies (HARD BLOCK — never include), dislikes (minimize), and likes (prefer).
2. **RECENT MEALS** — Recipe titles from the lookback window (default 3 weeks). Instruction: "Do NOT repeat these recipes."
3. **FAVORITES** — Favorite recipe titles. Instruction: "Consider including ~1 of these favorites if not recently cooked."
4. **RATING INSIGHTS** — Low-rated recipes to avoid (avg ≤2 stars), high-rated recipes to prefer (avg ≥4 stars), feedback keywords for flavor tuning.
5. **CUISINE PREFERENCE** — Requested cuisine type(s). Instruction: "At least 70% of recipes should match this cuisine."

New formatter functions: `format_preferences()`, `format_recent_meals()`, `format_favorites()`, `format_rating_insights()`, `format_cuisine_preferences()`.

### Generator (`generator.py`)

Extend `_load_context()` to also load:
- Member preferences for the household (query `MemberPreferences` joined through `HouseholdMembers`)
- Recent cooked meals within lookback window (query `MealSlots` where `status="cooked"` and `cooked_at >= now - 21 days`)
- Household favorites (query `RecipeFavorites` joined with `Recipes`)
- Rating summaries (query `MealSlotRatings` aggregated by recipe)

Pass `cuisine_preferences` from queue message through to `build_prompt()`.

### Validator (`validator.py`)

Extend `validate_constraints()` signature:

```python
def validate_constraints(
    plan: GeneratedMealPlan,
    inventory: list[str],
    equipment: dict[str, list[str]],
    *,
    allergen_ingredients: set[str] | None = None,
    recent_meal_titles: set[str] | None = None,
    cuisine_preferences: list[str] | None = None,
) -> list[str]:
```

**New validation checks**:
1. **Allergen check**: No recipe contains an ingredient matching any household member's allergy. Hard failure.
2. **Repetition check**: No recipe title matches a recently cooked recipe (case-insensitive).
3. **Cuisine match**: When cuisine preferences specified, ≥70% of recipes must match the requested cuisine type(s).

### Worker Schema (`schemas.py`)

Add `cuisine_type: str | None = None` to `GeneratedRecipe` schema so the LLM can tag each recipe.

## Frontend Changes

### New Pages

**`/preferences`** — Member preference management:
- List current member's preferences grouped by type
- Add/remove dietary restrictions from predefined list
- Add/remove ingredient-level allergies, dislikes, likes with autocomplete
- Each preference shows type badge + value + optional notes

**`/history`** — Meal history timeline:
- Paginated list of cooked meals sorted by date descending
- Each entry: date, recipe title, rating (if exists), cuisine tag
- Infinite scroll or page-based pagination

### Modified Components

**`MealSlotCard`**:
- After slot status = "cooked", show star rating UI (1–5 clickable stars)
- Optional feedback textarea (max 500 chars)
- Submit rating via `POST /api/v1/meal-plans/{planId}/slots/{slotId}/rating`
- Show existing rating if already submitted
- Favorite toggle heart icon on the recipe

**`CreateMealPlan` flow** (existing plan creation UI):
- Add optional cuisine selector: multi-select dropdown with predefined types + free-text input
- Pass `cuisine_preferences` in request body

**`WeeklyPlanView`**:
- Show cuisine type tag on each meal slot card (if recipe has `cuisine_type`)
- Favorite toggle (heart icon) on each recipe

### New TypeScript Types (`apps/web/src/types/index.ts`)

```typescript
export type PreferenceType = "dietary_restriction" | "allergy" | "dislike" | "like";
export type CuisineType = "mexican" | "italian" | "asian" | "indian" | "mediterranean" | "american" | "comfort_food";

export interface MemberPreference {
  id: string;
  household_member_id: string;
  preference_type: PreferenceType;
  value: string;
  ingredient_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface RecipeFavorite {
  id: string;
  household_id: string;
  recipe_id: string;
  recipe_title: string;
  created_at: string;
}

export interface MealSlotRating {
  id: string;
  meal_slot_id: string;
  rated_by: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface MealHistoryItem {
  slot_id: string;
  recipe_id: string;
  recipe_title: string;
  cooked_at: string;
  day: number;
  meal_type: string;
  rating: number | null;
  cuisine_type: string | null;
}
```

### New API Client Functions (`apps/web/src/services/api.ts`)

- `getPreferences(memberId)` → `fetchApi<MemberPreference[]>`
- `addPreference(memberId, data)` → `fetchApi<MemberPreference>`
- `removePreference(memberId, preferenceId)` → `fetchApi<void>`
- `getDietaryTypes()` → `fetchApi<string[]>`
- `toggleFavorite(recipeId)` → `fetchApi<RecipeFavorite>`
- `removeFavorite(recipeId)` → `fetchApi<void>`
- `getFavorites()` → `fetchApi<RecipeFavorite[]>`
- `submitRating(planId, slotId, data)` → `fetchApi<MealSlotRating>`
- `getRating(planId, slotId)` → `fetchApi<MealSlotRating | null>`
- `getMealHistory(page?, pageSize?)` → `fetchApi<MealHistoryItem[]>`

## Project Structure

### New & Modified Files

```text
services/
  shared/
    shared/db/models/
      preference.py          # NEW — MemberPreference model
      favorite.py            # NEW — RecipeFavorite model
      rating.py              # NEW — MealSlotRating model
      recipe.py              # MODIFIED — add cuisine_type column
      __init__.py            # MODIFIED — export new models
    alembic/versions/
      003_personalization.py # NEW — migration: 3 tables + 1 column

  api/
    src/api/
      routes/
        preferences.py       # NEW — preference CRUD endpoints
        favorites.py         # NEW — favorite toggle endpoints
        ratings.py           # NEW — rating submit/get endpoints
        meal_history.py      # NEW — meal history endpoint
        meal_plans.py        # MODIFIED — accept cuisine_preferences in create
        __init__.py          # MODIFIED — register new routers
      services/
        preference_service.py  # NEW — PreferenceService class
        favorite_service.py    # NEW — FavoriteService class
        rating_service.py      # NEW — RatingService class
        meal_history_service.py # NEW — MealHistoryService class
        meal_plan_service.py   # MODIFIED — pass cuisine_preferences to queue message
      models/
        preference.py         # NEW — Pydantic request/response models
        favorite.py           # NEW — Pydantic request/response models
        rating.py             # NEW — Pydantic request/response models
        meal_history.py       # NEW — Pydantic response models
        meal_plan.py          # MODIFIED — add cuisine_preferences to CreateMealPlan
      middleware/
        dependencies.py       # MODIFIED — add get_*_service factory functions
    tests/
      test_preferences.py     # NEW — preference endpoint tests
      test_favorites.py       # NEW — favorite endpoint tests
      test_ratings.py         # NEW — rating endpoint tests
      test_meal_history.py    # NEW — meal history endpoint tests
      test_meal_plans.py      # MODIFIED — test cuisine_preferences passthrough

  workers/
    meal_plan_generator/
      prompts.py              # MODIFIED — new prompt sections + formatters
      generator.py            # MODIFIED — load preferences/history/favorites/ratings context
      validator.py            # MODIFIED — allergen, repetition, cuisine checks
      schemas.py              # MODIFIED — add cuisine_type to GeneratedRecipe
    tests/
      test_prompts.py         # NEW/MODIFIED — test new prompt formatters
      test_validator.py       # NEW/MODIFIED — test new validation checks
      test_generator.py       # MODIFIED — test extended context loading

apps/
  web/
    src/
      app/
        preferences/
          page.tsx            # NEW — preference management page
        history/
          page.tsx            # NEW — meal history page
      components/
        StarRating.tsx        # NEW — reusable 1-5 star rating component
        CuisineSelector.tsx   # NEW — multi-select cuisine picker
        FavoriteToggle.tsx    # NEW — heart icon favorite toggle
        PreferenceList.tsx    # NEW — preference list with add/remove
        MealHistoryList.tsx   # NEW — paginated meal history list
        MealSlotCard.tsx      # MODIFIED — add rating UI + favorite toggle
        WeeklyPlanView.tsx    # MODIFIED — show cuisine tags
      services/
        api.ts                # MODIFIED — add new API client functions
      types/
        index.ts              # MODIFIED — add new TypeScript interfaces
    src/__tests__/
      preferences.test.tsx    # NEW — preference page tests
      history.test.tsx        # NEW — history page tests
      star-rating.test.tsx    # NEW — star rating component tests
      cuisine-selector.test.tsx # NEW — cuisine selector tests
```

## Migration Strategy

### Migration 003: `003_personalization.py`

Single Alembic migration that:

1. **Creates `MemberPreferences` table** with all columns, FK constraints, unique constraint on `(household_member_id, preference_type, value)`, and index on `household_member_id`.

2. **Creates `RecipeFavorites` table** with all columns, FK constraints, unique constraint on `(household_id, recipe_id)`, and index on `household_id`.

3. **Creates `MealSlotRatings` table** with all columns, FK constraints, CHECK constraint on `rating` (1–5), unique constraint on `(meal_slot_id, rated_by)`, and index on `meal_slot_id`.

4. **Adds `cuisine_type` column** to existing `Recipes` table — `String(50)`, nullable, no default.

All changes are additive (new tables + nullable column). No data migration needed. Fully backward-compatible — existing queries and code are unaffected until new features are wired up.

**Downgrade**: Drop the 3 tables and the `cuisine_type` column.

## Implementation Order

1. **Phase 1 — Models & Migration**: Create SQLAlchemy models + Alembic migration. Foundation for everything.
2. **Phase 2 — Preferences API (US1)**: Service + routes + tests. Highest-impact personalization.
3. **Phase 3 — Favorites API (US2)**: Service + routes + tests. Builds on existing recipe/meal data.
4. **Phase 4 — Ratings API (US3)**: Service + routes + tests. Depends on cooked meal slots.
5. **Phase 5 — Meal History API (US2)**: Service + route + tests. Query-only, low risk.
6. **Phase 6 — Worker Prompt & Validation**: Extend prompt builder, validator, generator. The AI integration.
7. **Phase 7 — Frontend: Preferences Page**: New page + components + API client.
8. **Phase 8 — Frontend: Ratings & Favorites**: MealSlotCard rating UI, favorite toggle, cuisine tags.
9. **Phase 9 — Frontend: History & Cuisine**: History page, cuisine selector in plan creation.
10. **Phase 10 — E2E Tests**: Playwright tests covering full flows.

## Complexity Tracking

No constitution violations. All changes follow established patterns. No new infrastructure, no new service boundaries, no new package managers. 3 new models + 1 column is well within the existing schema's complexity trajectory (13 → 16 tables).
