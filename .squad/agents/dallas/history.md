# Dallas — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + FastAPI + SQLAlchemy + Azure (AKS, SQL, SWA) + Auth0
- **Owner:** Ashley Hollis
- **Branch:** 001-meal-planner-mvp (PR #1)
- **State:** Phases 1-4 complete. 140 unit tests pass. 24/36 E2E tests pass, 12 skipped.
- **Remaining:** Phase 5-6 — Fix CORS (5 tests), fix meal plan seeding (7 tests), PR lifecycle

## Learnings

### 2026-03-02: E2E Test Analysis Decisions

**CORS (5 tests):** The `nullslast()` 500 error was the root cause of CORS failures. Starlette's `ServerErrorMiddleware` catches unhandled exceptions _outside_ the CORS middleware chain, returning bare 500 responses without `Access-Control-Allow-Origin`. Fix the 500, fix the CORS. No defensive CORS config needed — the regex already matches. Decision: wait for pipeline verification.

**Meal plan (7 tests):** Worker requires Azure OpenAI — not available in preview. Tests skip gracefully. Accepted for MVP. Follow-up: test seeding endpoint post-MVP.

**pre-commit.ci:** The `identify` library uses `ts` not `typescript` as the type tag for TypeScript files. Fix already committed (`ec2626f`).

**Key insight:** When debugging CORS in Starlette/FastAPI, always check whether the underlying request returns a successful response first. A 500 that bypasses error handlers also bypasses CORSMiddleware, making it look like a CORS config problem when it's actually an application error.

### Meal plan generation error message fix (2026-03-03)

Ripley fixed the frontend error display pattern. Users now see actual API error details (e.g., "Household already has an active or in-progress meal plan") instead of generic "Failed to generate meal plan" message. Pattern documented in Decision 11 — apply to all frontend API interactions. Commit 5ed1955.

### 2026-03-02: 003-personalization-ai Spec Created

Wrote `specs/003-personalization-ai/spec.md` covering 4 user stories (P6→US1, P7→US2, P17→US3, P22→US4). Key decisions:

- **MemberPreference as single polymorphic model** — one table with a `type` discriminator (allergy/dislike/like/dietary_restriction) rather than 4 separate tables. Keeps the schema simple and the preference CRUD unified.
- **Ratings on MealSlot, not Recipe** — same recipe can be rated differently depending on when/how it was cooked. Context-specific feedback is more useful for AI tuning.
- **Allergies are hard blocks, dislikes are soft** — this distinction is critical for safety. The spec explicitly separates the two with different AI prompt handling.
- **History from existing MealSlot data** — no new history model needed. Cooked meals already have timestamps. Only new model is RecipeFavorite (boolean existence).
- **Cuisine preferences are per-plan, not persistent** — avoids stale preferences. Each generation starts fresh.
- **Conflict resolution order**: relax history first, then dislikes, never relax allergies. This is the fallback when constraints over-eliminate recipes.

### 2026-03-03: 004-planning-enhancements Spec Created (11:21Z)

Wrote `specs/004-planning-enhancements/` artifacts (spec.md, plan.md, tasks.md) covering 4 user stories (P8→US1, P13→US2, P20→US3, P25→US4). Key decisions:

- **Only 1 new DB model (RecurringMealTemplate)** — US1 uses existing Recipe.source_recipe_id, US2 is stateless, US3 uses existing MealSlot.meal_type field. Schema is already prepared for multi-meal from the original design.
- **Substitution uses synchronous LLM call** — follows adapt_recipe() pattern in meal_plan_service.py, not the queued async pattern. Single-recipe operation, <10s target.
- **Quick suggestions are stateless** — no MealPlan/MealSlot created until user explicitly taps "Cook This". Avoids plan pollution from exploratory queries.
- **Multi-meal backward compat via default** — meal_types defaults to ["dinner"]. Worker prompt is parameterized. Zero regression for existing behavior.
- **Recurring templates use day+meal_type uniqueness** — UNIQUE(household_id, day, meal_type). Supports both exact recipe_id and free-text recipe_title hint modes.
- **Migration 005** — next Alembic migration after 004_repair_inventory_tables.py.
- **68 tasks + 26 verification checkpoints** — 9 phases, Phases 1-4 fully parallelizable.

Artifacts staged. Decision 5 committed to decisions.md. Orchestration log at 2026-03-03T1121-dallas.md.

Key file paths:

- `services/shared/shared/db/models/meal_plan.py` — MealSlot already has meal_type:String(20) with uq_slot_plan_day_type constraint
- `services/shared/shared/db/models/recipe.py` — Recipe already has source_recipe_id for lineage
- `services/workers/meal_plan_generator/generator.py:461` — Slot creation hardcodes meal_type="dinner"
- `services/api/src/api/services/meal_plan_service.py` — \_call_llm() pattern for synchronous LLM calls
- `services/workers/meal_plan_generator/prompts.py` — build_prompt() already accepts personalization kwargs
