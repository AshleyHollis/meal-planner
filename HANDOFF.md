# Agent Handoff: Meal Planner — Phase 2 UX Overhaul

## Branch & PR

- **Branch**: `005-grocery-enhancements`
- **PR**: #5 (against `master`)
- **Repo**: `AshleyHollis/meal-planner`
- **Team**: Dallas (Lead), Ripley (Backend), Kane (Frontend), Parker (DevOps), Lambert (Tester)

## Current Status

✅ **Code work complete** — all 5 agent commits merged to branch  
⚠️ **CI blocked** — 4 frontend test assertion mismatches (see "Blocking Issues" below)

## What Was Built (Phase 2)

### UX & Navigation (Dallas, commit ba39aca)
- Fixed MealHistoryList dead import
- Fixed EmptyState double-button edge case
- Skeleton loaders for async states
- Mobile-first navigation: 5 tabs + "More" slide-up menu (secondary menu items)
- Status filter tabs on meal plans (All, Active, Completed, Failed, Draft)
- Delete failed meal plans with 2-level confirmation dialog
- Card-based layouts with visual status indicators

### Backend API (Ripley, commit 5742a7d)
- **GET /api/v1/meal-plans** filtering & sorting
  - Query params: `status`, `sort` (created_at|week_start_date), `order` (asc|desc)
  - Defaults preserved for backward compatibility
- **GET /api/v1/meal-plans/stats** — new stats endpoint
  - `plans_by_status: dict[str, int]` — count per status value
  - `total_meals_cooked: int` — all cooked MealSlots across all plans
  - `items_expiring_soon: int` — inventory items expiring ≤ 7 days
- **GroceryListResponse** enhancements
  - `total_price: float | None` — sum of product prices
  - `store_totals: dict[str, float]` — per-store price breakdown
- All 193 API tests pass

### Frontend Components (Kane, commit 6b60450)
- **Toast notification system** (ToastProvider + useToast hook)
  - Positioned above mobile nav (`bottom-24`) and desktop (`bottom-6`)
  - Auto-dismiss at 3.5s
  - Pure Tailwind + React state (no external library)
- **Meal plan generation progress indicator** (3-step animated)
- **Relative date formatting utility** (e.g., "2d ago", "1h left")
- **Card hover/active effects** for visual feedback
- **Mobile touch-friendly grocery checkboxes** (44px targets, WCAG 2.1 AA)
- Build clean, no errors

### E2E Test Coverage (Lambert, commit 3c3f8c1)
- **26 new E2E tests** for Phase 1 UX overhaul
  - Navigation: 2 tests for mobile "More" menu (open, close, navigation)
  - Meal plans: 24 tests across 4 suites
    - Status filter tabs: All, Active, Completed, Failed, Draft filtering
    - Delete failed plans: button visibility, confirmation, cancel flow
    - Empty state: display when no plans exist
- All tests follow squad conventions (test.skip, getByRole, proper timeouts)
- TypeScript compiles clean
- No breaking changes to existing test files

## Current Blocking Issue

**CI run #22651713954 failed** — Frontend Quality tests have text mismatch assertions:

| File | Test | Expected | Actual | Line |
|------|------|----------|--------|------|
| `MealHistoryList.test.tsx` | No data state | "No meal history yet" | "No Meals Yet" | 51 |
| `ExpiryBadge.test.tsx` | Expiry text (7d) | "Expires in 7d" | "7d left" | 39 |
| `ExpiryBadge.test.tsx` | Expiry text (2d) | "Expires in 2d" | "2d left" | 46 |
| `ExpiryBadge.test.tsx` | Expiry text (0d) | "Expires in 0d" | "0d left" | 53 |

**Root Cause:** Component UI text was updated (Phase 2 work) but test assertions were not synchronized.

**Impact:** Pipeline correctly halts preview deployment. No infrastructure issues.

**Solution:** Update test expectations to match component rendering.

## What's Working

- Auth0 login flow and session state
- API filtering, sorting, and stats endpoints
- Toast notifications and progress indicators
- Mobile navigation restructure
- E2E test infrastructure
- 193 API tests (Ripley)
- Build and TypeScript compilation (Kane, Lambert)

## What's Blocked

- Preview deployment: CI blocked by test assertion failures (see "Current Blocking Issue")

## Next Steps

1. **Fix test assertions** to match component UI text (4 failing tests)
2. **Push corrected tests** to trigger CI run #2
3. **Preview deployment** auto-runs on CI success
4. **E2E tests** execute against live preview environment
5. **Merge PR #5** once E2E tests pass

## Key Files (Phase 2 Changes)

| File | Purpose | Agent |
|------|---------|-------|
| `apps/web/src/components/ui/Toast.tsx` | Toast provider and hook | Kane |
| `apps/web/src/app/layout.tsx` | ToastProvider mount point | Kane |
| `apps/web/src/components/MealPlanProgress.tsx` | 3-step progress indicator | Kane |
| `apps/web/src/utils/relativeDates.ts` | Relative date formatting | Kane |
| `apps/web/src/__tests__/MealHistoryList.test.tsx` | ⚠️ Text mismatch (line 51) | Needs fix |
| `apps/web/src/__tests__/ExpiryBadge.test.tsx` | ⚠️ Text mismatches (lines 39, 46, 53) | Needs fix |
| `apps/web/e2e/smoke.spec.ts` | Navigation E2E tests (+2) | Lambert |
| `apps/web/e2e/meal-plan.spec.ts` | Meal plan E2E tests (+24) | Lambert |
| `services/api/src/api/routes/meal_plans.py` | Filtering & stats endpoints | Ripley |
| `services/api/src/api/models/responses.py` | GroceryListResponse updates | Ripley |

## Team Notes

- **Dallas (Code Review):** Approved Phase 1, fixed 2 minor issues, commit ba39aca
- **Ripley (Backend):** All 193 API tests passing, filtering/stats/grocery totals working, commit 5742a7d
- **Kane (Frontend):** Toast system, progress indicator, relative dates, touch targets, clean build, commit 6b60450
- **Parker (DevOps):** Found CI test failures, no infra issues, pipeline functioning correctly
- **Lambert (Tester):** 26 new E2E tests ready for CI, TypeScript clean, commit 3c3f8c1

## Previous Session Context (MVP)

**Files**: `apps/web/e2e/inventory.spec.ts` — Edit, Remove, Expiry Badge, Autocomplete, Add Item tests

The `nullslast()` fix (`eddc914`) fixed the 500 on `GET /api/v1/inventory`. But the browser still can't reach the API due to CORS. The diagnostic output from run `22566414169` showed:

```
[diag] Console logs: [error] Access to fetch at 'https://api-pr-1.meal-planner.apps.ashleyhollis.com/api/v1/inventory'
from origin 'https://agreeable-plant-04ffe2700-pr1.eastasia.6.azurestaticapps.net' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Puzzle**: The CORS regex in `services/api/src/api/main.py:71` (`r"https://.*\.(azurestaticapps\.net|meal-planner\.apps\.ashleyhollis\.com)"`) DOES match the SWA origin (verified with Python `re.fullmatch`). Yet the browser reports no CORS header on the response.

**Theory**: The 500 error from `nullslast()` was preventing the CORS middleware from adding headers (the error may have been raised in a way that bypassed middleware). Now that the 500 is fixed, CORS may work on the next run. **CHECK THE LATEST PIPELINE RUN FIRST** — the `nullslast()` fix (`eddc914`) was just deployed and may have fixed both the 500 AND the CORS issue.

If CORS is still broken after the 500 fix, investigate:

- Whether the API pod has the latest image (check the verify-k8s-deployment logs for the image tag)
- Whether Starlette's CORSMiddleware adds headers on error responses
- Check API pod logs during E2E tests for the actual request/response

### Problem 2: Meal plan stays in draft — worker not processing (7 tests)

**Files**: `apps/web/e2e/meal-plan.spec.ts` (4 tests), `apps/web/e2e/grocery.spec.ts` (6 tests — but some overlap)

The seed-data creates a meal plan but it stays in `draft` status because the worker pod doesn't process it. The worker needs Azure OpenAI to generate recipes. The 409 "already has an active or in-progress meal plan" on subsequent runs is expected (previous run's plan persists in DB).

**Options**:

1. Configure Azure OpenAI for the preview environment (check `k8s/overlays/preview/` and Key Vault secrets)
2. Pre-seed a completed meal plan with slots directly via SQL/API (skip the worker)
3. Accept that meal-plan and grocery tests skip in preview (worker requires LLM)

Check if Azure OpenAI secrets exist: `az keyvault secret list --vault-name kv-ytsumm-prd --query "[?starts_with(name, 'meal-planner-openai')]"` or check `infra/terraform/key-vault-secrets.tf`.

Also check if the worker deployment exists in preview: `kubectl get deployments -n preview-pr-1 | grep worker`.

## Key Files

| File                                                     | Purpose                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `services/api/src/api/middleware/auth.py`                | JWT auth — uses urllib for JWKS fetch, catch-all exception handler            |
| `services/api/src/api/services/inventory_service.py`     | Inventory CRUD — fixed nullslast() to CASE expression                         |
| `services/api/src/api/main.py:67-75`                     | CORS middleware configuration                                                 |
| `services/api/src/api/errors.py`                         | Error handlers (500 returns generic JSON, no detail)                          |
| `apps/web/e2e/seed-data.setup.ts`                        | E2E data seeding (ingredients, inventory, meal plan)                          |
| `apps/web/e2e/inventory.spec.ts`                         | Inventory E2E tests (5 skip on empty/error state)                             |
| `apps/web/e2e/meal-plan.spec.ts`                         | Meal plan E2E tests (4 skip on empty/error state)                             |
| `apps/web/e2e/grocery.spec.ts`                           | Grocery E2E tests (6 skip — all need active meal plan)                        |
| `apps/web/e2e/smoke.spec.ts`                             | Smoke tests (10 tests, all pass, no skip conditions)                          |
| `apps/web/playwright.config.ts`                          | 3-project chain: auth-setup → seed-data → chromium                            |
| `apps/web/src/services/runtimeConfig.ts`                 | API URL resolution (runtime-config.js → NEXT_PUBLIC_API_URL → localhost:8000) |
| `apps/web/src/services/api.ts`                           | Frontend API client — getAccessToken() + fetchApi() with Bearer               |
| `services/shared/alembic/versions/001_initial_schema.py` | Migration with NEWID() defaults on all UUID PKs                               |
| `services/shared/alembic/versions/002_seed_data.py`      | Seeds 107 ingredients                                                         |
| `.github/workflows/verify-k8s-deployment.yml`            | Has DB diagnostic step (kubectl exec for table check, async query test)       |
| `k8s/base/migration-job.yaml`                            | Alembic migration job (ArgoCD Sync hook)                                      |

## Test Count Breakdown (36 total)

| File               | Total | Always Pass | May Skip                                      |
| ------------------ | ----- | ----------- | --------------------------------------------- |
| smoke.spec.ts      | 10    | 10          | 0                                             |
| inventory.spec.ts  | 11    | 6           | 5 (need working API from browser)             |
| meal-plan.spec.ts  | 7     | 3           | 4 (need existing meal plan data)              |
| grocery.spec.ts    | 6     | 0           | 6 (all need active meal plan w/ grocery list) |
| auth.setup.ts      | 1     | 1           | 0                                             |
| seed-data.setup.ts | 1     | 1           | 0                                             |

## Architecture Notes

- **Frontend**: Next.js on Azure Static Web Apps (SWA), Auth0 v4 middleware
- **API**: FastAPI on K8s (AKS), served via Envoy Gateway HTTPRoute at `api-pr-1.meal-planner.apps.ashleyhollis.com`
- **Worker**: Python worker on K8s, reads Azure Storage Queue, calls Azure OpenAI
- **Database**: Azure SQL Server (`mssql+aioodbc://` for async, `mssql+pyodbc://` for Alembic)
- **Auth**: Auth0 — SWA handles login/session, API validates JWT with JWKS
- **Deploy**: GitHub Actions → CI builds images → Preview Deployment (Terraform + ArgoCD + SWA deploy) → E2E tests
- **Kustomize**: `k8s/overlays/preview/kustomization.yaml` uses `resources: - ../../base` (NOT base-preview)

## Previous Fixes in This Session (for context)

1. `NEWID()` defaults on all UUID PKs — migration 002 couldn't insert without explicit IDs
2. `httpx.AsyncClient` → `urllib.request` — httpx broken in Docker image
3. Catch-all exception handler in auth middleware — prevented unhandled 500s
4. `nullslast()` → CASE expression — SQL Server doesn't support NULLS LAST syntax
5. Bandit B310 nosec suppression — false positive on urllib.request.urlopen

## User Preferences (from MEMORY.md)

- **Be proactive**: Don't ask permission for obvious next steps. Just do it.
- **Pipeline philosophy**: All steps run automatically. Monitor pipeline, fix failures, push again until green.
- **Definition of done**: Task is NEVER complete until pipeline deploys AND E2E tests pass.
- **Self-sufficient**: Never stop to ask the user to do something you can do yourself.
