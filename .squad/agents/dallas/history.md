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

**CORS (5 tests):** The `nullslast()` 500 error was the root cause of CORS failures. Starlette's `ServerErrorMiddleware` catches unhandled exceptions *outside* the CORS middleware chain, returning bare 500 responses without `Access-Control-Allow-Origin`. Fix the 500, fix the CORS. No defensive CORS config needed — the regex already matches. Decision: wait for pipeline verification.

**Meal plan (7 tests):** Worker requires Azure OpenAI — not available in preview. Tests skip gracefully. Accepted for MVP. Follow-up: test seeding endpoint post-MVP.

**pre-commit.ci:** The `identify` library uses `ts` not `typescript` as the type tag for TypeScript files. Fix already committed (`ec2626f`).

**Key insight:** When debugging CORS in Starlette/FastAPI, always check whether the underlying request returns a successful response first. A 500 that bypasses error handlers also bypasses CORSMiddleware, making it look like a CORS config problem when it's actually an application error.

