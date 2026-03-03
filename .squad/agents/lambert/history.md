# Lambert — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + FastAPI + SQLAlchemy + Azure (AKS, SQL, SWA) + Auth0
- **Owner:** Ashley Hollis
- **Branch:** 003-personalization-ai
- **State:** 40 E2E test files total (smoke, inventory, meal-plan, grocery, preferences, favorites, ratings, cuisine)
- **New Tests:** Phase 10 E2E tests covering personalization features (preferences CRUD, favorites toggle, recipe ratings, cuisine selection)
- **Playwright config:** 3-project chain: auth-setup → seed-data → chromium
- **Status:** TypeScript compiles, lint passes (4 pre-existing warnings in layout.tsx)

## Learnings

### Phase 10 E2E Test Implementation (T073-T077)

**Completed Tasks:**

- **T073**: Created `apps/web/e2e/preferences.spec.ts` — Tests preferences page CRUD flow (add dietary restrictions, allergies, dislikes; verify grouping; delete preferences)
- **T074**: Created `apps/web/e2e/favorites.spec.ts` — Tests favoriting recipes from meal plans and managing favorites page
- **T075**: Created `apps/web/e2e/ratings.spec.ts` — Tests rating cooked meal slots with stars and feedback, verifies persistence
- **T076**: Created `apps/web/e2e/cuisine.spec.ts` — Tests cuisine selector UI and verifies cuisine_preferences in request
- **T077**: Verified existing tests still compile (regression check via TypeScript compilation)

**Pattern Consistency:**

All new E2E tests follow the exact patterns established in existing specs:
- Use `test.describe()` blocks for organization
- Use `test.use({ storageState: 'playwright/.auth/user.json' })` for authenticated tests
- Use role-based selectors (`getByRole`, `getByText`, `getByLabel`)
- Include `.skip()` guards for `USE_EXTERNAL_SERVER` dependency
- Handle loading spinners, empty states, and error states gracefully
- Use `timeout: 30_000` for page loads, `timeout: 10_000` for element visibility
- Structure: Page Load tests → UI tests → Backend-dependent tests

**TypeScript Fix:**

- `selectOption()` in Playwright doesn't accept regex in label field
- Changed from `{ label: /pattern/i }` to direct value string (e.g., `"dietary_restriction"`)
- This matches how other selects work in inventory.spec.ts and meal-plan.spec.ts

**Test Dependencies:**

- **preferences.spec.ts**: Requires backend API + preferences endpoints (Phase 2)
- **favorites.spec.ts**: Requires active meal plan with recipes (Phase 3 + seeded plan)
- **ratings.spec.ts**: Requires cooked meal slots (Phase 4 + plan generation)
- **cuisine.spec.ts**: Can test UI without backend; request validation requires API (Phase 5)

**Verification Done:**
- `npx tsc --noEmit` passes (0 errors)
- `npm run lint` passes (4 pre-existing warnings unrelated to new tests)
- All test files compile and are ready for execution against deployed environment

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
