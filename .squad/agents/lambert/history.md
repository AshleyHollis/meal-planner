# Lambert — History

## Project Context
- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + FastAPI + SQLAlchemy + Azure (AKS, SQL, SWA) + Auth0
- **Owner:** Ashley Hollis
- **Branch:** 001-meal-planner-mvp (PR #1)
- **State:** 36 E2E tests total. 24 pass, 12 skipped, 0 failed.
- **Test files:** smoke.spec.ts (10 pass), inventory.spec.ts (6 pass/5 skip), meal-plan.spec.ts (3 pass/4 skip), grocery.spec.ts (0 pass/6 skip)
- **Playwright config:** 3-project chain: auth-setup → seed-data → chromium
- **Problem 1:** CORS blocks browser→API (5 inventory tests skip)
- **Problem 2:** Meal plan stuck in draft, worker needs Azure OpenAI (7 tests skip)

## Learnings

