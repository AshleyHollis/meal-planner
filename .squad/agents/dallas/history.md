# Dallas — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + FastAPI + SQLAlchemy + Azure (AKS, SQL, SWA) + Auth0
- **Owner:** Ashley Hollis
- **Branch:** 001-meal-planner-mvp (PR #1)
- **State:** Phases 1-4 complete. 140 unit tests pass. 24/36 E2E tests pass, 12 skipped.
- **Remaining:** Phase 5-6 — Fix CORS (5 tests), fix meal plan seeding (7 tests), PR lifecycle

### 2026-03-04: Quality Fix Sprint — Complete Audit & Team Execution

- **Trigger:** Ashley reported "Generate Plan" failing on dashboard. Overall app quality too low. Directive: production quality builds, comprehensive E2E coverage.
- **Method:** Comprehensive source code + live preview testing. Spawned Dallas, Kane, Ripley, Lambert for distributed fixes.
- **Audit findings:** 16 issues (P0-P3) across frontend, backend, and test layers.

**P0 — Critical (FIXED):**
- Dashboard Generate Plan fails with 409 because it doesn't auto-complete existing draft/active plans before calling createMealPlan(). Meal plan page has working implementation.
- **Fix (Kane):** Dashboard now calls listMealPlans() before createMealPlan(), auto-completes existing plans, matches meal plan page logic (f1d988a)

**P1 — High (ADDRESSED):**
- Inconsistencies between dashboard and meal plan page (no duplicated functions, unified error handling, draft plan detection)
- Dashboard shows generic error message; meal plan page shows API detail
- **Pattern for future fixes:** Use Inventory page error model: show detail + Retry button

**P2 — Medium (IN PROGRESS):**
- Quick Suggestions "Cook This" button is fake (no API call) — misleading to users
- Hardcoded currency formats and CURRENT_MEMBER_ID placeholder
- Products page silent delete failure (empty catch block)
- Desktop sidebar missing Home/Dashboard link

**P3 — Low (DOCUMENTED):**
- Code duplication (DAY_LABELS in 3 places, getNextMonday in 2 places)
- No E2E coverage for dashboard Generate (THIS WAS THE GAP)
- No ErrorBoundary wrappers on pages
- Missing page-specific browser tab titles
- Unused WeeklyPlanView component

**Team Execution:**
- **Kane (Frontend):** Fixed dashboard Generate (P0), working on P1-P2 refactors
- **Ripley (Backend):** Fixed 2 worker robustness bugs (scalar_one_or_none pattern) — prevents double failures when plan deleted during generation
- **Lambert (Testing):** Added 23 E2E tests across 2 new files, closed all 6 coverage gaps, achieved 100% flow coverage
- **Dallas (Audit):** Documented all 16 issues with priority, rationale, and assignments for future work

**Quality Standard Directives Captured:**
1. Error handling: Always extract and display API error detail (never generic messages)
2. DRY: Extract shared utilities (dates, currency, labels) to @/lib/
3. Parity: Dashboard and dedicated page must use same logic for shared actions
4. E2E coverage: Every user-facing action (button click + API call) must have E2E test
5. No fake actions: If a button says "Cook This", it must actually do that
6. Toast vs inline: Toast for transient confirmations; inline for blocking errors

**Cross-Agent Outcomes:**
- ✅ P0 blocker fixed (Dashboard Generate working)
- ✅ Worker resilience improved (scalar_one_or_none pattern established)
- ✅ E2E gaps closed (33/33 flows covered, 100% coverage)
- ✅ Quality standards documented for future work
- **Next phase:** P1-P2 cleanup, establish linting rules, enforce quality gates

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

### 2026-03-04: Phase 1 UX Overhaul Code Review

Full code review of commit `ad0dfa8` (16 files, 845 insertions). Verdict: **APPROVED with minor fixes**.

**DELETE endpoint (meal_plans.py):** Solid. Auth enforced via `get_meal_plan_service` dependency injection (household-scoped). All edge cases covered: 404 for nonexistent/other household, 409 for active/draft status. Only failed/completed plans deletable. Cascade deletes slots. 6 tests cover all paths.

**Navigation restructure (layout.tsx):** Clean implementation. Desktop sidebar with section grouping, 5-item mobile bottom nav with "More" slide-up sheet pattern. Active detection correctly uses exact match for "/" and startsWith for others. Backdrop dismiss + stopPropagation on panel. Safe-area-inset handling for mobile.

**Skeleton + EmptyState components:** Well-designed, reusable. Skeleton has 3 variants (text/circular/rectangular) with sensible defaults. EmptyState supports icon/title/description + optional action (link or callback).

**Fixes applied (commit ba39aca):**

1. Removed dead `useState` import from `MealHistoryList.tsx`
2. Fixed `EmptyState` double-button edge case — `onAction` now takes precedence over `actionHref`

**Notes for future:**

- Meal plan list page only exposes delete for `failed` plans in UI, but API supports `completed` too. Intentional scope reduction for MVP.
- `EmptyState` icon prop uses emoji strings (not React components) — keep consistent.

### 2026-03-04: Quality Audit — Dashboard Generate Plan Failure

**Root cause of Generate Plan failure on dashboard:** State mismatch. API rejects `POST /api/v1/meal-plans` with 409 if any `draft` or `active` plan exists. Dashboard's `getActiveMealPlan()` only finds `active` plans (not `draft`). When a `draft` plan exists (worker never completed), dashboard shows "Plan Your Week" but clicking Generate gets 409.

The meal plan page (`/meal-plan`) has the correct pattern: it lists ALL plans, finds any `active`/`draft`, and auto-completes them before creating. Dashboard was never updated with this logic (Decision 13 only applied to the meal plan page).

**Key inconsistencies found:**

- Dashboard `handleGenerate()` — no auto-complete, generic error message, missing `meal_types` param
- `getNextMonday()` duplicated in 2 files instead of shared `@/lib/date-utils.ts`
- `DAY_LABELS` duplicated in 3 places
- Quick Suggestions "Cook This" button is fake — shows success toast but makes no API call
- Error handling inconsistent across pages (some show detail + retry, some show generic text)
- No E2E test covers the dashboard Generate flow — that's why this shipped

**Full audit written to:** `.squad/decisions/inbox/dallas-quality-audit.md`

**Key learning:** When the same user action (Generate Plan) exists on 2+ pages, extract it to a shared hook or utility. Otherwise the copy without tests WILL drift.
