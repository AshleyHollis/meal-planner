# Tasks: Personalization AI

**Input**: Design documents from `/specs/003-personalization-ai/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Included — project has 139 passing tests; maintaining quality is critical.

**Organization**: Tasks grouped by user story and implementation phase for independent delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths in every description

---

## Phase 1: Models & Migration (Foundation)

**Purpose**: Create SQLAlchemy models and Alembic migration — foundation for all API work.

**⚠️ CRITICAL**: No API or worker work can begin until this phase is complete.

- [ ] T001 [P] Create MemberPreference SQLAlchemy model in `services/shared/shared/db/models/preference.py` — UUID PK, household_member_id FK, preference_type (dietary_restriction|allergy|dislike|like), value, ingredient_id FK (nullable), notes, timestamps. UNIQUE(household_member_id, preference_type, value). Index on household_member_id.
- [ ] T002 [P] Create RecipeFavorite SQLAlchemy model in `services/shared/shared/db/models/favorite.py` — UUID PK, household_id FK, recipe_id FK, created_at. UNIQUE(household_id, recipe_id). Index on household_id.
- [ ] T003 [P] Create MealSlotRating SQLAlchemy model in `services/shared/shared/db/models/rating.py` — UUID PK, meal_slot_id FK, rated_by FK (HouseholdMember), rating (Integer CHECK 1-5), feedback (String 500 nullable), created_at. UNIQUE(meal_slot_id, rated_by). Index on meal_slot_id.
- [ ] T004 Add `cuisine_type` column (String 50, nullable) to Recipe model in `services/shared/shared/db/models/recipe.py`
- [ ] T005 Export new models (MemberPreference, RecipeFavorite, MealSlotRating) in `services/shared/shared/db/models/__init__.py`
- [ ] T006 Create Alembic migration `services/shared/alembic/versions/003_personalization.py` — create MemberPreferences, RecipeFavorites, MealSlotRatings tables; add cuisine_type column to Recipes. Downgrade drops all three tables and the column.

### V1 — Models & Migration Checkpoint

- [ ] V001 Run shared lint: `cd services/shared && uv run ruff check shared/ && uv run ruff format --check shared/`
- [ ] V002 Run API tests to verify no regressions: `cd services/api && uv run pytest tests/ -v`

---

## Phase 2: Preferences API (US1 — Food Preferences) 🎯 MVP

**Goal**: CRUD endpoints for per-member dietary restrictions, allergies, dislikes, and likes.

**Independent Test**: Create members with preferences, verify API returns correct data, generate plan and confirm prompt includes preferences.

### Pydantic Models

- [ ] T007 [P] [US1] Create Pydantic request/response models in `services/api/src/api/models/preference.py` — `CreateMemberPreference` (preference_type, value, ingredient_id, notes) and `MemberPreferenceResponse` (all fields + id, created_at)

### Service Layer

- [ ] T008 [US1] Create PreferenceService in `services/api/src/api/services/preference_service.py` — list preferences for member, add preference (validate member belongs to household, enforce unique constraint), delete preference by ID

### Routes

- [ ] T009 [US1] Create preference routes in `services/api/src/api/routes/preferences.py` — `GET /api/v1/members/{member_id}/preferences`, `POST /api/v1/members/{member_id}/preferences` (201), `DELETE /api/v1/members/{member_id}/preferences/{preference_id}` (204), `GET /api/v1/preferences/dietary-types`
- [ ] T010 [US1] Register preferences router in `services/api/src/api/routes/__init__.py`
- [ ] T011 [US1] Add `get_preference_service` dependency factory in `services/api/src/api/middleware/dependencies.py`

### Tests

- [ ] T012 [US1] Write preference endpoint tests in `services/api/tests/test_preferences.py` — test list/add/delete preferences, dietary types endpoint, duplicate rejection, invalid preference_type, member-not-in-household 403

### V2 — Preferences API Checkpoint

- [ ] V003 Run API lint: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/`
- [ ] V004 Run API tests: `cd services/api && uv run pytest tests/ -v`

---

## Phase 3: Favorites API (US2 — Meal History & Favorites)

**Goal**: Toggle favorite on recipes, list household favorites.

**Independent Test**: Favorite a recipe, list favorites, verify idempotent toggle.

### Pydantic Models

- [ ] T013 [P] [US2] Create Pydantic response model in `services/api/src/api/models/favorite.py` — `RecipeFavoriteResponse` (id, recipe_id, recipe_title, created_at)

### Service Layer

- [ ] T014 [US2] Create FavoriteService in `services/api/src/api/services/favorite_service.py` — add favorite (idempotent), remove favorite, list household favorites (join with Recipe for title)

### Routes

- [ ] T015 [US2] Create favorite routes in `services/api/src/api/routes/favorites.py` — `POST /api/v1/recipes/{recipe_id}/favorite` (201, idempotent), `DELETE /api/v1/recipes/{recipe_id}/favorite` (204), `GET /api/v1/favorites`
- [ ] T016 [US2] Register favorites router in `services/api/src/api/routes/__init__.py`
- [ ] T017 [US2] Add `get_favorite_service` dependency factory in `services/api/src/api/middleware/dependencies.py`

### Tests

- [ ] T018 [US2] Write favorite endpoint tests in `services/api/tests/test_favorites.py` — test add/remove/list favorites, idempotent add, recipe-not-found 404

### V3 — Favorites API Checkpoint

- [ ] V005 Run API lint: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/`
- [ ] V006 Run API tests: `cd services/api && uv run pytest tests/ -v`

---

## Phase 4: Ratings API (US3 — Recipe Ratings & Feedback)

**Goal**: Submit and retrieve star ratings + text feedback on cooked meal slots.

**Independent Test**: Mark slot as cooked, submit 1-5 star rating with feedback, retrieve rating.

### Pydantic Models

- [ ] T019 [P] [US3] Create Pydantic models in `services/api/src/api/models/rating.py` — `CreateMealSlotRating` (rating: int 1-5, feedback: str max 500 nullable) and `MealSlotRatingResponse` (all fields + id, rated_by, created_at)

### Service Layer

- [ ] T020 [US3] Create RatingService in `services/api/src/api/services/rating_service.py` — submit rating (validate slot belongs to household plan, slot status="cooked"), get rating for slot/member

### Routes

- [ ] T021 [US3] Create rating routes in `services/api/src/api/routes/ratings.py` — `POST /api/v1/meal-plans/{plan_id}/slots/{slot_id}/rating` (201, validate cooked), `GET /api/v1/meal-plans/{plan_id}/slots/{slot_id}/rating`
- [ ] T022 [US3] Register ratings router in `services/api/src/api/routes/__init__.py`
- [ ] T023 [US3] Add `get_rating_service` dependency factory in `services/api/src/api/middleware/dependencies.py`

### Tests

- [ ] T024 [US3] Write rating endpoint tests in `services/api/tests/test_ratings.py` — test submit/get rating, reject rating on non-cooked slot, rating out of range, feedback too long, duplicate rating

### V4 — Ratings API Checkpoint

- [ ] V007 Run API lint: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/`
- [ ] V008 Run API tests: `cd services/api && uv run pytest tests/ -v`

---

## Phase 5: Meal History API (US2 — Meal History)

**Goal**: Paginated endpoint returning cooked meal history for a household.

**Independent Test**: Mark meals as cooked, query history, verify chronological order and pagination.

### Pydantic Models

- [ ] T025 [P] [US2] Create Pydantic response model in `services/api/src/api/models/meal_history.py` — `MealHistoryItem` (slot_id, recipe_id, recipe_title, cooked_at, day, meal_type, rating nullable, cuisine_type nullable)

### Service Layer

- [ ] T026 [US2] Create MealHistoryService in `services/api/src/api/services/meal_history_service.py` — query MealSlots with status="cooked" joined with Recipe, sorted by cooked_at DESC, paginated (default page_size=20), include rating if exists

### Routes

- [ ] T027 [US2] Create meal history route in `services/api/src/api/routes/meal_history.py` — `GET /api/v1/meal-history` with query params page, page_size
- [ ] T028 [US2] Register meal_history router in `services/api/src/api/routes/__init__.py`
- [ ] T029 [US2] Add `get_meal_history_service` dependency factory in `services/api/src/api/middleware/dependencies.py`

### Cuisine Preferences Passthrough (US4)

- [ ] T030 [US4] Add `cuisine_preferences: list[str] | None = None` field to `CreateMealPlan` in `services/api/src/api/models/meal_plan.py`
- [ ] T031 [US4] Modify `MealPlanService.create()` in `services/api/src/api/services/meal_plan_service.py` to pass `cuisine_preferences` through queue message

### Tests

- [ ] T032 [US2] Write meal history endpoint tests in `services/api/tests/test_meal_history.py` — test paginated results, empty history, sort order, rating inclusion
- [ ] T033 [US4] Add test for cuisine_preferences passthrough in `services/api/tests/test_meal_plans.py` — verify cuisine_preferences is included in queue message

### V5 — Meal History & Cuisine Passthrough Checkpoint

- [ ] V009 Run API lint: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/`
- [ ] V010 Run API tests: `cd services/api && uv run pytest tests/ -v`

---

## Phase 6: Worker Prompt & Validation (US1-US4)

**Goal**: Extend the AI worker to consume preferences, history, favorites, ratings, and cuisine in prompt generation and validation.

### Schema

- [ ] T034 [US4] Add `cuisine_type: str | None = None` to GeneratedRecipe in `services/workers/meal_plan_generator/schemas.py`

### Prompt Builder

- [ ] T035 [US1] Add `format_preferences(member_preferences)` function in `services/workers/meal_plan_generator/prompts.py` — format dietary restrictions (FILTER), allergies (HARD BLOCK), dislikes (minimize), likes (prefer) per member
- [ ] T036 [US2] Add `format_recent_meals(recent_meals)` and `format_favorites(favorites)` functions in `services/workers/meal_plan_generator/prompts.py` — "Do NOT repeat" list and "Consider including ~1 favorite" list
- [ ] T037 [US3] Add `format_rating_insights(rating_insights)` function in `services/workers/meal_plan_generator/prompts.py` — avoid recipes rated ≤2, prefer recipes rated ≥4, include feedback keywords
- [ ] T038 [US4] Add `format_cuisine_preferences(cuisine_preferences)` function in `services/workers/meal_plan_generator/prompts.py` — "At least 70% of recipes should match this cuisine"
- [ ] T039 Extend `build_prompt()` signature in `services/workers/meal_plan_generator/prompts.py` to accept `member_preferences`, `recent_meals`, `favorites`, `rating_insights`, `cuisine_preferences` kwargs and append new sections

### Generator

- [ ] T040 Extend `_load_context()` in `services/workers/meal_plan_generator/generator.py` to load: member preferences (join MemberPreferences through HouseholdMembers), recent cooked meals (MealSlots where status="cooked" and cooked_at >= now - 21 days), household favorites (RecipeFavorites joined with Recipes), rating summaries (MealSlotRatings aggregated by recipe)
- [ ] T041 Pass `cuisine_preferences` from queue message and all loaded context to `build_prompt()` in `services/workers/meal_plan_generator/generator.py`

### Validator

- [ ] T042 [US1] Add allergen check to `validate_constraints()` in `services/workers/meal_plan_generator/validator.py` — no recipe contains any household member's allergy ingredient (hard failure)
- [ ] T043 [US2] Add repetition check to `validate_constraints()` in `services/workers/meal_plan_generator/validator.py` — no recipe title matches recently cooked recipe (case-insensitive)
- [ ] T044 [US4] Add cuisine match check to `validate_constraints()` in `services/workers/meal_plan_generator/validator.py` — when cuisine preferences specified, ≥70% of recipes match requested cuisine type(s)

### Tests

- [ ] T045 [P] [US1] Write/extend prompt formatter tests in `services/workers/tests/test_prompts.py` — test format_preferences with dietary restrictions, allergies, dislikes, likes
- [ ] T046 [P] [US2] Write/extend prompt formatter tests in `services/workers/tests/test_prompts.py` — test format_recent_meals and format_favorites
- [ ] T047 [P] [US3] Write/extend prompt formatter tests in `services/workers/tests/test_prompts.py` — test format_rating_insights
- [ ] T048 [P] [US4] Write/extend prompt formatter tests in `services/workers/tests/test_prompts.py` — test format_cuisine_preferences
- [ ] T049 [US1] Write/extend validator tests in `services/workers/tests/test_validator.py` — test allergen check (hard block), pass when no allergens
- [ ] T050 [US2] Write/extend validator tests in `services/workers/tests/test_validator.py` — test repetition check
- [ ] T051 [US4] Write/extend validator tests in `services/workers/tests/test_validator.py` — test cuisine match check (≥70%)
- [ ] T052 Extend generator tests in `services/workers/tests/test_generator.py` — test that \_load_context includes preferences, history, favorites, ratings

### V6 — Worker Checkpoint

- [ ] V011 Run worker lint: `cd services/workers && uv run ruff check meal_plan_generator/ && uv run ruff format --check meal_plan_generator/`
- [ ] V012 Run worker tests: `cd services/workers && uv run pytest tests/ -v`

---

## Phase 7: Frontend — Preferences Page (US1)

**Goal**: New `/preferences` page where members manage dietary restrictions, allergies, dislikes, and likes.

### Types & API Client

- [ ] T053 [P] [US1] Add TypeScript types to `apps/web/src/types/index.ts` — `PreferenceType`, `CuisineType`, `MemberPreference`, `RecipeFavorite`, `MealSlotRating`, `MealHistoryItem` interfaces
- [ ] T054 [P] [US1] Add API client functions in `apps/web/src/services/api.ts` — `getPreferences(memberId)`, `addPreference(memberId, data)`, `removePreference(memberId, preferenceId)`, `getDietaryTypes()`

### Components

- [ ] T055 [US1] Create PreferenceList component in `apps/web/src/components/PreferenceList.tsx` — grouped display by type, add/remove UI, dietary restriction dropdown, ingredient text input for allergies/dislikes/likes

### Page

- [ ] T056 [US1] Create preferences page in `apps/web/src/app/preferences/page.tsx` — load current member preferences, render PreferenceList, handle add/remove actions

### Tests

- [ ] T057 [US1] Write preference page tests in `apps/web/src/__tests__/preferences.test.tsx` — test rendering, add preference, remove preference, type grouping

### V7 — Frontend Preferences Checkpoint

- [ ] V013 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V014 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V015 Run frontend tests: `cd apps/web && npm test -- --run`

---

## Phase 8: Frontend — Ratings & Favorites (US2, US3)

**Goal**: Star rating UI on cooked meal slots, favorite toggle on recipes, cuisine tags on weekly plan view.

### API Client

- [ ] T058 [P] [US2] Add API client functions in `apps/web/src/services/api.ts` — `toggleFavorite(recipeId)`, `removeFavorite(recipeId)`, `getFavorites()`
- [ ] T059 [P] [US3] Add API client functions in `apps/web/src/services/api.ts` — `submitRating(planId, slotId, data)`, `getRating(planId, slotId)`

### Components

- [ ] T060 [P] [US3] Create StarRating component in `apps/web/src/components/StarRating.tsx` — 1-5 clickable stars, optional feedback textarea (max 500 chars), submit handler, display existing rating
- [ ] T061 [P] [US2] Create FavoriteToggle component in `apps/web/src/components/FavoriteToggle.tsx` — heart icon toggle, optimistic UI update, call toggleFavorite/removeFavorite

### Modified Components

- [ ] T062 [US3] Modify MealSlotCard in `apps/web/src/components/MealSlotCard.tsx` — when slot status="cooked", show StarRating component; show existing rating if submitted; add FavoriteToggle on recipe
- [ ] T063 [US2] Modify WeeklyPlanView in `apps/web/src/components/WeeklyPlanView.tsx` — show cuisine_type tag on each meal slot card, add FavoriteToggle heart icon on each recipe

### Tests

- [ ] T064 [P] [US3] Write star rating component tests in `apps/web/src/__tests__/star-rating.test.tsx` — test click interaction, feedback input, submit, display existing rating
- [ ] T065 [P] [US2] Write favorite toggle tests (inline in star-rating or separate) — test toggle on/off, optimistic update

### V8 — Frontend Ratings & Favorites Checkpoint

- [ ] V016 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V017 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V018 Run frontend tests: `cd apps/web && npm test -- --run`

---

## Phase 9: Frontend — History & Cuisine (US2, US4)

**Goal**: Meal history page showing cooked meals, cuisine selector in plan creation flow.

### API Client

- [ ] T066 [P] [US2] Add API client function in `apps/web/src/services/api.ts` — `getMealHistory(page?, pageSize?)`

### Components

- [ ] T067 [P] [US2] Create MealHistoryList component in `apps/web/src/components/MealHistoryList.tsx` — paginated list of cooked meals sorted by date DESC, show date, recipe title, rating, cuisine tag
- [ ] T068 [P] [US4] Create CuisineSelector component in `apps/web/src/components/CuisineSelector.tsx` — multi-select dropdown with predefined types (Mexican, Italian, Asian, Indian, Mediterranean, American, Comfort Food) + free-text input

### Pages

- [ ] T069 [US2] Create history page in `apps/web/src/app/history/page.tsx` — load meal history, render MealHistoryList with pagination
- [ ] T070 [US4] Integrate CuisineSelector into existing meal plan creation flow — pass `cuisine_preferences` in create request body

### Tests

- [ ] T071 [P] [US2] Write history page tests in `apps/web/src/__tests__/history.test.tsx` — test rendering, pagination, empty state
- [ ] T072 [P] [US4] Write cuisine selector tests in `apps/web/src/__tests__/cuisine-selector.test.tsx` — test multi-select, free-text, clear

### V9 — Frontend History & Cuisine Checkpoint

- [ ] V019 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V020 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V021 Run frontend tests: `cd apps/web && npm test -- --run`

---

## Phase 10: E2E Tests + Polish

**Goal**: End-to-end Playwright tests covering full personalization flows. Final regression check.

- [ ] T073 [US1] E2E test: Set preferences → generate plan → verify plan respects allergies and dietary restrictions
- [ ] T074 [US2] E2E test: Favorite recipes → generate plan → verify favorite included; cook meals → verify history page
- [ ] T075 [US3] E2E test: Cook meal → rate 1-5 stars with feedback → verify rating persists and displays
- [ ] T076 [US4] E2E test: Select cuisine → generate plan → verify ≥70% cuisine match
- [ ] T077 Full regression: run all existing E2E tests to verify no regressions from personalization changes

### V10 — Final Checkpoint

- [ ] V022 Run all API tests: `cd services/api && uv run pytest tests/ -v`
- [ ] V023 Run all worker tests: `cd services/workers && uv run pytest tests/ -v`
- [ ] V024 Run all frontend tests: `cd apps/web && npm test -- --run`
- [ ] V025 Run frontend lint + type check: `cd apps/web && npm run lint && npx tsc --noEmit`
- [ ] V026 Run API + shared lint: `cd services/api && uv run ruff check src/ && cd ../../services/shared && uv run ruff check shared/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Models & Migration)**: No dependencies — start immediately. BLOCKS all subsequent phases.
- **Phase 2 (Preferences API)**: Depends on Phase 1.
- **Phase 3 (Favorites API)**: Depends on Phase 1. Can run in parallel with Phase 2.
- **Phase 4 (Ratings API)**: Depends on Phase 1. Can run in parallel with Phases 2-3.
- **Phase 5 (Meal History API)**: Depends on Phase 1. Can run in parallel with Phases 2-4.
- **Phase 6 (Worker)**: Depends on Phase 1 models. Can start after Phase 1; independent of API phases.
- **Phase 7 (Frontend Preferences)**: Depends on Phase 2 (API must exist).
- **Phase 8 (Frontend Ratings & Favorites)**: Depends on Phases 3 and 4.
- **Phase 9 (Frontend History & Cuisine)**: Depends on Phase 5.
- **Phase 10 (E2E)**: Depends on all prior phases.

### Parallel Opportunities

```
Phase 1 (foundation)
  │
  ├──► Phase 2 (Preferences API) ──► Phase 7 (Frontend Preferences)
  ├──► Phase 3 (Favorites API)   ─┬► Phase 8 (Frontend Ratings & Favorites)
  ├──► Phase 4 (Ratings API)     ─┘
  ├──► Phase 5 (Meal History)    ──► Phase 9 (Frontend History & Cuisine)
  └──► Phase 6 (Worker)
                                        └──► Phase 10 (E2E + Polish)
```

Phases 2-6 can all proceed in parallel after Phase 1 completes (different files, no conflicts).

### Within Each Phase

- Pydantic models before services
- Services before routes
- Routes before tests (tests validate the full stack)
- Implementation before checkpoint verification

---

## Task Summary

| Phase                                    | Tasks     | Tests     | Checkpoints |
| ---------------------------------------- | --------- | --------- | ----------- |
| 1. Models & Migration                    | T001–T006 | —         | V001–V002   |
| 2. Preferences API (US1)                 | T007–T012 | T012      | V003–V004   |
| 3. Favorites API (US2)                   | T013–T018 | T018      | V005–V006   |
| 4. Ratings API (US3)                     | T019–T024 | T024      | V007–V008   |
| 5. Meal History API (US2, US4)           | T025–T033 | T032–T033 | V009–V010   |
| 6. Worker (US1-US4)                      | T034–T052 | T045–T052 | V011–V012   |
| 7. Frontend Preferences (US1)            | T053–T057 | T057      | V013–V015   |
| 8. Frontend Ratings & Favs (US2, US3)    | T058–T065 | T064–T065 | V016–V018   |
| 9. Frontend History & Cuisine (US2, US4) | T066–T072 | T071–T072 | V019–V021   |
| 10. E2E + Polish                         | T073–T077 | T073–T077 | V022–V026   |

**Total: 77 tasks + 26 verification checkpoints = 103 items**
