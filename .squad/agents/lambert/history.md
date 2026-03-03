# Lambert — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + FastAPI + SQLAlchemy + Azure (AKS, SQL, SWA) + Auth0
- **Owner:** Ashley Hollis
- **Branch:** 002-inventory-enhancements (enhanced inventory features)
- **State:** E2E test suite hardened and expanded. Tests now fail on real errors instead of hiding them as skips.
- **Test files:** smoke.spec.ts, inventory.spec.ts (expanded), meal-plan.spec.ts (expanded), grocery.spec.ts
- **Playwright config:** 3-project chain: auth-setup → seed-data → chromium

## Learnings

### Session 2026-03-02: E2E Test Suite Hardening (Branch 002)

**Problem:** Tests were hiding real bugs by skipping on errors instead of failing. Preview environment showed 500 errors but tests reported "27 passed, 9 skipped, 0 failed".

**Fixes Applied:**

1. **seed-data.setup.ts**: Changed from warning-and-return to hard failures using `expect()` assertions
   - Access token failures now fail the setup (was: console.warn + return)
   - No ingredients found now fails the setup (was: console.warn + return)
   - Meal plan creation failures now fail the setup (was: console.warn + return)
   - Result: Tests depending on seed-data will now show as FAILED instead of SKIPPED when backend is broken

2. **inventory.spec.ts**: Changed defensive skip logic to throw errors on API failures
   - "Failed to load inventory" now throws error instead of skipping (2 test locations)
   - Added freezer location to form test (was missing from location selector test)
   - Added 3 new test suites for new features:
     - Freezer Storage: tests freezer location option, defrost hours field visibility
     - Staples Feature: tests staples management UI presence
   - Result: Real API failures surface as test failures, not hidden skips

3. **meal-plan.spec.ts**: Added 2 new test suites for new features
   - Leftover Recording: tests "Record Leftovers" button, form fields (portions, storage location, expiry)
   - Auto-Deduct Inventory: tests deduction information display after marking meal as cooked
   - Result: Coverage for P5, P14, P15 features

**Test Coverage Summary:**
- inventory.spec.ts: Added 5 new tests (freezer, staples, defrost hours)
- meal-plan.spec.ts: Added 3 new tests (leftovers, auto-deduct)
- Total: 8 new E2E tests for branch 002 features

**Key Learnings:**
- Setup failures should fail loudly (use `expect()` assertions) not silently skip
- Distinguish between legitimate skips (feature flag not set) vs bugs (API returns error)
- Test actual user journeys (add→verify, cook→verify deduct) not just "does page load"
- New features need E2E coverage BEFORE merge, not after bugs are found

**File Paths:**
- E2E tests: `apps/web/e2e/`
- Seed data setup: `apps/web/e2e/seed-data.setup.ts`
- Inventory tests: `apps/web/e2e/inventory.spec.ts`
- Meal plan tests: `apps/web/e2e/meal-plan.spec.ts`

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
