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

### Complete Skip Map (12 Tests)

**Inventory (5 skipped)** — All blocked by `USE_EXTERNAL_SERVER=false`:
| Test | Skip Root Cause | To Unblock |
|------|-----------------|-----------|
| ingredient search triggers autocomplete | `!process.env.USE_EXTERNAL_SERVER` (line 86) | Need backend API + ingredient lookup working |
| can add item via search/submit | Suite-level skip, "Add Item Flow" (line 142) | Need backend API for search & create |
| can click Edit button | Suite-level skip, "Edit and Remove" (line 184) | Need backend API, inventory must have items |
| can click Remove button | Suite-level skip, "Edit and Remove" (line 184) | Need backend API, inventory must have items |
| expiry badges display | Suite-level skip, "Expiry Badges" (line 248) | Need backend API + seeded inventory with expiry dates |

**Meal Plan (4 skipped)** — All blocked by `USE_EXTERNAL_SERVER=false`:
| Test | Skip Root Cause | To Unblock |
|------|-----------------|-----------|
| plan list items show status badges | `!process.env.USE_EXTERNAL_SERVER` (line 64) | Need backend API + at least one meal plan |
| plan detail page shows weekly view | Suite-level skip, "Plan Detail Page" (line 91) | Need completed meal plan (status != draft) |
| plan detail page has back navigation | Suite-level skip, "Plan Detail Page" (line 91) | Need at least one meal plan |
| clicking Generate New Plan navigates | Suite-level skip, "Generate Plan" (line 184) | Need worker to complete plan generation (Azure OpenAI) |

**Grocery (6 skipped)** — All blocked by suite-level `USE_EXTERNAL_SERVER=false` (line 22):
| Test | Skip Root Cause | To Unblock |
|------|-----------------|-----------|
| grocery list page loads with heading | Entire suite skipped (line 22) | Need backend API + active meal plan + grocery list |
| grocery list shows back to meal plan link | Entire suite skipped (line 22) | Need active meal plan |
| grocery list shows items or empty state | Entire suite skipped (line 22) | Need active meal plan |
| can check and uncheck a grocery item | Entire suite skipped (line 22) | Need active meal plan with items |
| complete shopping button appears | Entire suite skipped (line 22) | Need items to be checkable |
| clicking complete shopping opens dialog | Entire suite skipped (line 22) | Need items to interact with |

**Test Chain Dependency**: auth.setup → seed-data.setup → chromium tests (playwright.config.ts lines 50-74)

### Seed Data Analysis (seed-data.setup.ts)

**What Gets Seeded**:

1. Looks up 5 ingredients by name: chicken breast, jasmine rice, broccoli, olive oil, garlic
2. Adds 5 inventory items with varied expiry dates:
   - Item 1: expired 2 days ago
   - Item 2: expires in 3 days
   - Item 3: expires in 14 days
   - Item 4: no expiry
   - Item 5: expires in 30 days
3. Creates ONE meal plan with `week_start_date = next Monday`
4. **WAITS UP TO 120 SECONDS** for meal plan status to change from draft (lines 166-191)

**Meal Plan Problem**:

- Created meal plan enters `draft` status initially (line 158)
- Seed-data polls every 5 seconds checking if status changed from draft (lines 166-178)
- Expects status to become `active` (meaning worker completed) or `failed` (LLM unavailable)
- **Currently**: Meal plan stays in draft → polls timeout after 120s → seed-data logs warning, returns early
- If worker completes: logs meal slots count (line 182)
- If worker fails (LLM not configured): logs failure reason (line 184)

**Could Be Extended?** YES — Seed data could:

- Create the meal plan with hardcoded completed status directly (skip worker)
- OR create meal slots + grocery list via seed SQL INSERT
- BUT current design requires worker to complete to test real flows

### Problem Map Summary

**Problem 1: CORS/API Unavailable (5 tests)**

- Inventory tests need `USE_EXTERNAL_SERVER=true` + working browser→API connection
- Tests skip immediately when flag is false (form tests work, but search/create need API)

**Problem 2: Meal Plan Generation Timeout (7 tests)**

- Meal plan tests + all grocery tests require completed meal plan
- Worker must transition plan from draft → active
- Requires Azure OpenAI configured in K8s preview environment
- OR pre-seeding a completed plan via direct DB insert
