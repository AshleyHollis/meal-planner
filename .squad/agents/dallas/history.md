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

### 2026-03-02: PR #1 Description Finalized

Updated PR #1 body with final AC checklist (8 items, all checked), updated test plan (CI + pre-commit.ci checked, E2E summary added), and Known Limitations section (3 items). Used `gh pr edit --body-file` via temp file for clean markdown. PR is now review-ready with full traceability.

### 2026-03-02: 003-personalization-ai Spec Created

Wrote `specs/003-personalization-ai/spec.md` covering 4 user stories (P6→US1, P7→US2, P17→US3, P22→US4). Key decisions:

- **MemberPreference as single polymorphic model** — one table with a `type` discriminator (allergy/dislike/like/dietary_restriction) rather than 4 separate tables. Keeps the schema simple and the preference CRUD unified.
- **Ratings on MealSlot, not Recipe** — same recipe can be rated differently depending on when/how it was cooked. Context-specific feedback is more useful for AI tuning.
- **Allergies are hard blocks, dislikes are soft** — this distinction is critical for safety. The spec explicitly separates the two with different AI prompt handling.
- **History from existing MealSlot data** — no new history model needed. Cooked meals already have timestamps. Only new model is RecipeFavorite (boolean existence).
- **Cuisine preferences are per-plan, not persistent** — avoids stale preferences. Each generation starts fresh.
- **Conflict resolution order**: relax history first, then dislikes, never relax allergies. This is the fallback when constraints over-eliminate recipes.
