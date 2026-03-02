# Agent Handoff: Meal Planner MVP - E2E Test Seeding

## Branch & PR

- **Branch**: `001-meal-planner-mvp`
- **PR**: #1 (against `master`)
- **Repo**: `AshleyHollis/meal-planner`

## Current Task

**Get all 36 E2E tests passing** (currently 24 passed, 12 skipped, 0 failed).

The last pipeline run was `22566812328` — check `gh run view 22566812328` for details.

## What's Working

- Auth0 login flow (auth.setup.ts gets storage state)
- Seed-data setup: gets access token, finds 5 ingredients, adds 5 inventory items via API
- Database migrations: 14 tables created, 107 seeded ingredients (alembic version 002)
- API auth middleware: JWT validation with JWKS fetch (using urllib, not httpx)
- All CI checks pass (lint, test, security scan, build)

## What's Still Broken (12 Skipped Tests)

### Problem 1: Inventory GET returns data via API but browser gets CORS error (5 tests)

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
