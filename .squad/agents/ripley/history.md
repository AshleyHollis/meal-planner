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

