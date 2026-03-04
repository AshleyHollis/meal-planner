# Team Decisions

> Shared decision log. All agents read this before starting work. Scribe merges from inbox.

## Session 2026-03-02T0848 Pre-commit Fix

**Resolved:** 3 decisions (CORS, meal plan skip, pre-commit.ci)

### Decision 1: CORS Middleware Config is Correct — No Changes Needed

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-02  
**Status:** Verified

CORS middleware ordering is correct. The `nullslast()` 500 error was the blocker; now fixed in commit `eddc914`. Monitor next pipeline run to confirm E2E CORS tests pass.

### Decision 2: E2E Test Approach for Skipped Tests

**Author:** Dallas (Lead)  
**Date:** 2026-03-02  
**Status:** Decided

**CORS/500 problem (5 tests):** `nullslast()` fix resolves. No defensive CORS config needed.

**Meal plan draft problem (7 tests):** Accept skip in preview for MVP. Azure OpenAI not configured in preview — seeding complexity outweighs MVP value. Tests have graceful skip logic. Post-MVP: add `POST /api/v1/test/seed-meal-plan` endpoint for full coverage.

**Pre-commit.ci blocker:** Changed `typescript` → `ts` in `.pre-commit-config.yaml` line 14.

**Expected outcome:** 29 pass, 7 skip, 0 fail. PR status ✅.

### Decision 3: Extend Seed Data to Unblock Meal Plan Tests

**Author:** Lambert (Tester)  
**Date:** 2026-03-02  
**Status:** Superseded by Decision 2

Proposed pre-seeding completed meal plan. Dallas's analysis determined this unnecessary for MVP; accept graceful skips instead. Can revisit post-MVP with test endpoint approach.

## Session 2026-03-03T0609 Frontend Gaps Closed

**Resolved:** 2 decisions (Auto-complete plan on generate, LLM model directive)

### Decision 13: Auto-complete Existing Plan Before Generating New One

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-03  
**Status:** Implemented

## Context

The API enforces a constraint: only one active or draft meal plan per household. When the user clicks "Generate New Plan" while one already exists, the API returns 409 Conflict. Previously, the frontend displayed this as an error message (Decision 11 improved the error display), but the user still had to manually complete the old plan.

## Decision

The frontend now auto-completes any existing active/draft plan before creating a new one. In `handleGenerate`:

1. Check `plans` state for any plan with status "active" or "draft"
2. If found, call `updatePlanStatus(planId, { status: "completed" })`
3. Then proceed with `createMealPlan(...)` as normal

## Rationale

- Users expect "Generate New Plan" to just work — they shouldn't need to understand the one-active-plan constraint
- The old plan is implicitly superseded by the new one, so marking it "completed" is semantically correct
- This is a frontend-only change; no backend modifications needed

## Outcome

- 87/87 frontend tests pass
- TypeScript compiles clean
- Commit `9f45365` on branch `003-personalization-ai`

### Decision 14: User Directive — Latest LLM Models

**Author:** Ashley Hollis (via Copilot)  
**Date:** 2026-03-03  
**Status:** Active (Squad coordination)

The team should always use the latest LLM models. Specifically: `claude-opus-4.6` for Lead, `claude-sonnet-4.6` for Devs, `claude-haiku-4.5` for Ops/Test/Scribe. The user's Layer 1 override supersedes the Squad coordinator's default model selection table.

**Rationale:** User request — captured for team memory.

**Outcome:** Applied to squad spawn manifest starting 2026-03-03T060858Z.

## Session 2026-03-02T0923 UI/UX Improvements

**Resolved:** 4 decisions (responsive layout, meal images, store branding, UI/UX architecture)

### Decision 4: Responsive Layout Architecture — Phase 1 (Desktop Expansion)

---

## Session 2026-03-02T0923 UI/UX Improvements

**Resolved:** 4 decisions (user directive, layout architecture, meal images/store branding, responsive implementation, validator tests)

### Decision 4: User Directive — UI/UX Improvement

**Author:** Ashley Hollis (via Copilot)  
**Date:** 2026-03-02  
**Status:** Captured

The meal planner needs visual richness: meal photos, store branding in grocery lists, and a proper desktop layout instead of a stretched mobile app. Responsive design preferred over separate mobile/desktop versions.

### Decision 5: UI/UX Architecture — Responsive Layout, Meal Images, Store Branding

**Author:** Dallas (Lead)  
**Date:** 2026-03-02  
**Status:** Decided

**Strategy:** Single responsive codebase (Tailwind `lg:` breakpoints at 1024px), not two versions.

**Breakpoint strategy:**

- **Mobile (<1024px):** Bottom nav, single column, `max-w-2xl` content (existing layout)
- **Desktop (≥1024px):** Sidebar nav (240px fixed left), multi-column grids, `max-w-6xl` content
- **XL (≥1280px):** Wider spacing only (no structural changes)

**Key changes:**

- `layout.tsx`: Sidebar nav component, hidden bottom nav on `lg:`, content width `max-w-2xl lg:max-w-6xl`, body `lg:pl-60` offset
- Dashboard: 3-column card grid on desktop
- Meal plan: 7-column calendar grid on desktop
- Grocery list: Branded store headers, 2-column grid per store on desktop
- Inventory: 3-column card grid on desktop

**Meal images architecture:**

- Hardcoded Unsplash photo ID map (20+ categories)
- `getMealImageUrl(mealTitle)`: Extract keywords, match category, return CDN URL
- CSS gradient fallback
- `next.config.ts` remote pattern for `images.unsplash.com`
- MealSlotCard: 160px image area above title
- WeeklyPlanView: 64px thumbnails on day rows (desktop only)
- Footer attribution: "Photos by Unsplash"

**Store branding architecture:**

- Colored circle avatars with store initials (no real logos)
- `STORE_BRANDS` map: Costco (CO, #005DAA), Woolworths (W, #125F2A), Coles (C, #E01A22), Aldi (A, #00477E), IGA (IG, #D32F2F), Trader Joe's (TJ, #C8102E), default (? gray)
- GroceryList: Branded headers with colored left border + circle avatar
- GroceryItem: Optional small store dot

**Not doing:**

- No new npm dependencies (Tailwind 4 + `next/image` sufficient)
- No backend changes (frontend-only)
- No dark mode yet
- No real store logos
- No Unsplash API (hardcoded photo IDs only)
- No custom Tailwind config

**Implementation order (4 phases, 3 days total):**

1. Responsive layout (1 day)
2. Meal images (1 day, depends on P1)
3. Store branding (0.5 day, depends on P1)
4. Polish (0.5 day, depends on P1-P3)

**Validation criteria:**

- Desktop (1280px): Sidebar visible, bottom nav hidden, multi-column grids
- Mobile (375px): No visual regression, bottom nav visible
- Tablet (768px): Mobile layout (no awkward in-between)
- All existing unit tests pass
- Lighthouse mobile score ≥ 90

### Decision 6: Meal Images & Store Branding Implementation (Phase 2 & 3)

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented

The app was locked at `max-w-2xl` on all screen sizes. Implemented single responsive codebase using Tailwind `lg:` breakpoint (1024px+):

- **Mobile (default):** Sticky top header, bottom nav, single-column — unchanged
- **Desktop (lg:):** Fixed left sidebar (w-64), hidden top header, hidden bottom nav, content offset by `lg:pl-64`

**Implementation:**

- `DesktopSidebar` component reuses `navItems` array (single source of truth)
- All `<main>` containers: `max-w-2xl lg:max-w-7xl mx-auto`
- Dashboard: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Meal plan list: `lg:grid-cols-2`
- Inventory: `lg:grid-cols-2`
- WeeklyPlanView: `lg:grid-cols-2 xl:grid-cols-3`

**Outcome:** Build clean ✅. 7 routes, 102kB shared JS, 0 type errors. All 37 unit tests unaffected (no logic changes).

### Decision 5: Meal Images & Store Branding (Phase 2 & 3)

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented

**Images:** Unsplash CDN with hardcoded photo IDs (not API calls) — zero rate limits, deterministic, highly available.

- `src/lib/meal-images.ts`: CATEGORY_PHOTOS map (20+ categories), getMealImageUrl(), FALLBACK_GRADIENTS
- `next.config.ts`: Updated `images.remotePatterns` for `images.unsplash.com`
- Components: `MealSlotCard`, `WeeklyPlanView`, Dashboard hero — all use `next/image` with `fill` layout

**Store Branding:** Colored circle avatars with store initials + brand colors.

- `src/lib/store-branding.ts`: STORE_BRANDS map (Costco, Woolworths, Coles, Aldi, IGA, Trader Joe's, default)
- GroceryList: Store section headers with colored left border, store avatar circle, store name
- GroceryItem: Optional small store dot indicator

**Layout changes:** Grocery items in 2-column grid within each store section on desktop. Checked-off items collapse to bottom with reduced opacity.

**Non-changes:** No blur placeholder, no new deps, no API changes, no auth changes.

### Decision 6: UI/UX Architecture — Master Plan

**Author:** Dallas (Lead)  
**Date:** 2026-03-02  
**Status:** Decided

Comprehensive architecture for responsive layout, meal images, and store branding across all pages:

**Scope:**

- Single responsive codebase (reject two-version approach)
- Tailwind breakpoint strategy: `<1024px` mobile-first (default), `≥1024px` sidebar + multi-column
- Meal images via Unsplash CDN (hardcoded photo IDs, not API)
- Store branding: colored badges with initials (no real logos)
- Page-level layout upgrades: Dashboard hero, Meal plan 7-column calendar (desktop), Grocery 2-column grid per store, Inventory card grid

**Implementation order:**

- P1: Responsive layout (1 day)
- P2: Meal images (1 day, depends on P1)
- P3: Store branding (0.5 day, depends on P1)
- P4: Polish (0.5 day, depends on P1-P3)

**Not doing:** No new deps, no backend changes, no dark mode yet, no real store logos, no Unsplash API, no custom Tailwind config.

**Validation:** Desktop (1280px) sidebar + multi-column, Mobile (375px) no regression, Tablet (768px) mobile fallback, all tests pass, Lighthouse ≥90.

### Decision 7: Personalization Spec — Architecture

**Author:** Dallas (Lead)  
**Date:** 2026-03-02  
**Status:** Decided

Feature spec for 003-personalization-ai (4 user stories, 22 functional requirements, 8 success criteria):

**Key design choices:**

1. **Single polymorphic MemberPreference model** with `type` discriminator (allergy, dislike, like, dietary_restriction) — simpler CRUD, unified API
2. **Ratings per MealSlot, not Recipe** — captures context (same recipe, different week/sides = different rating)
3. **Allergy = hard block, Dislike = soft preference** — allergies never relaxed (safety), dislikes relaxed as fallback
4. **Meal history derived from MealSlot(status=cooked)** — no new history model, avoids sync issues
5. **Cuisine preferences are per-plan, not persistent** — ephemeral (this week = Mexican) vs. stale preferences
6. **Constraint relaxation order:** (1) shorten history lookback, (2) allow dislikes, (3) never relax allergies

**New models:** MemberPreference, RecipeFavorite, MealSlotRating. New column on Recipe: `cuisine_type`.

**Impact:** 3 new tables, 1 new column, AI prompt extension required.
**Unsplash integration:** Direct photo IDs with URL query params (`?auto=format&fit=crop&w=...&h=...&q=80`). No API key needed. Alternative placeholders (picsum, via.placeholder) rejected.

**Category matching:** `getMealCategory()` uses word-split then substring scan against `KEYWORD_MAP`. Fuzzy matching rejected as overkill for MVP.

**Image layout:** `next/image` with `fill` layout. Parent container has `relative` + explicit height classes (`h-32 lg:h-48`). `placeholder="empty"` (no blur hash available).

**Store badges:** Colored circle with 1–3 character abbreviation. Unknown stores get first 2 chars + gray background. Pure CSS/Tailwind, no icon library.

**Grocery desktop layout:** `lg:grid lg:grid-cols-2 lg:divide-y-0` applied directly to `<ul>` inside each store section. GroceryItem works naturally in grid context (no changes needed).

**Dashboard hero:** Day-of-week logic finds today's dinner slot from active plan. Shows banner image (graceful fallback if absent/no dinner assigned).

**Non-decisions:**

- No blur placeholder
- No new npm packages
- No API/type changes
- Auth/middleware untouched

### Decision 7: Responsive Layout Architecture — Phase 1 (Implemented)

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented

**Mobile-first approach:** All existing layout unchanged at default (mobile) breakpoint. Desktop enhancements via `lg:` prefix (1024px+).

**Sidebar:** `DesktopSidebar` component in `layout.tsx` (`hidden lg:flex`). Reuses `navItems` array, uses `usePathname()` for active highlighting, shows user name + logout at bottom, app title/logo at top.

**Content width:** All `<main>`: `max-w-2xl lg:max-w-7xl mx-auto`

**Page grid upgrades:**

- Dashboard quick links: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Meal plan list: `lg:grid-cols-2`
- Inventory: `lg:grid-cols-2` (form left, list right)
- WeeklyPlanView: `lg:grid-cols-2 xl:grid-cols-3`
- Grocery/meal detail: wider container, no restructure

**Build status:** Clean ✅. 7 routes, 102kB shared JS, 0 type errors. All 37 existing unit tests unaffected.

### Decision 8: Updated Validator Test Suite for Relaxed Recipe Count

**Author:** Ripley (Backend Dev)  
**Date:** 2025-01-XX  
**Status:** Implemented

Validator logic changed from "exactly 7 recipes" to "at least 5 recipes" (no upper bound). Updated test suite to reflect this:

- `test_too_few_recipes`: Changed from 5 recipes (now valid) to 4 recipes
- `test_too_many_recipes`: Changed to verify 9 recipes produces NO error (no upper bound)
- `test_zero_recipes`: Updated error message to "Expected at least 5 recipes, got 0"

**Rationale:** Relaxed constraint allows AI to generate varying recipe counts based on available inventory. Tests remain comprehensive while matching actual validator behavior.

**Outcome:** All 29 worker tests pass. CI unblocked. Test suite accurately reflects validator constraints.

### Decision 9: Personalization Models & Migration

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented

Designed and implemented 3 new SQLAlchemy models for Phase 1:

1. **MemberPreference** (`MemberPreferences` table):
   - Per-member dietary restrictions, allergies, dislikes, likes
   - `UNIQUE(household_member_id, preference_type, value)` prevents duplicates
   - Optional `ingredient_id` FK, nullable `notes`
   - Index on `household_member_id`

2. **RecipeFavorite** (`RecipeFavorites` table):
   - Household-scoped (not per-member) to simplify AI logic
   - `UNIQUE(household_id, recipe_id)` ensures one favorite per recipe per household
   - Only `created_at` (no updated_at — favorites are binary on/off)
   - Index on `household_id`

3. **MealSlotRating** (`MealSlotRatings` table):
   - 1-5 star ratings with optional feedback
   - `CHECK(rating >= 1 AND rating <= 5)` at DB level
   - `UNIQUE(meal_slot_id, rated_by)` ensures one rating per member per slot
   - Only `created_at` (ratings immutable)
   - Index on `meal_slot_id`

4. **Recipe.cuisine_type:**
   - Nullable `String(50)` column added to existing Recipe model
   - Supports predefined types (mexican, italian) and free-text
   - Nullable to avoid breaking existing recipes

**Migration 003:** Creates 3 tables + 1 column with proper FKs, indexes, unique/CHECK constraints, correct downgrade path.

**Outcome:** All ruff checks pass, all 74 API tests pass (no regressions). Pattern adherence verified. Ready for Phase 2.

### Decision 10: Preferences API

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented

Implemented complete CRUD API for member preferences (Phase 2):

**Endpoints:**

- GET `/api/v1/members/{member_id}/preferences` — list all preferences (newest first)
- POST `/api/v1/members/{member_id}/preferences` — create (201), 409 on duplicate, 403 on non-household member
- DELETE `/api/v1/members/{member_id}/preferences/{preference_id}` — delete (204), 404 if not found, 403 on non-household member
- GET `/api/v1/preferences/dietary-types` — static list of 8 dietary types

**Models & Services:**

- Pydantic models: CreateMemberPreference, MemberPreferenceResponse
- PreferenceService: list, add (with IntegrityError→409 mapping), delete, member ownership validation
- Registered router in main.py, dependency factory in dependencies.py

**Test suite:** 14 tests covering list/add/delete, duplicate rejection, invalid type, member-not-in-household, dietary types endpoint.

**Outcome:** All 14 preference tests pass, 115 total API tests pass (no regressions), ruff checks pass. Pattern lessons: use `flush()` not `commit()`, don't commit seed data, DELETE tests verify status only, `IntegrityError` maps to 409, use `HTTP_422_UNPROCESSABLE_CONTENT`.

### Decision 11: Frontend API Error Display Pattern

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-03  
**Status:** Implemented

User reported "Failed to generate meal plan" but couldn't understand why. Frontend was catching API errors but displaying generic message instead of actual error detail from API response.

**Root cause:** FastAPI returns structured errors with `detail` field:

```json
{ "detail": "Household already has an active or in-progress meal plan" }
```

Frontend ApiError class captures this in `body` property but wasn't extracting it.

**Decision:** Always extract and display API error details in frontend catch blocks. Pattern:

```typescript
catch (err) {
  const message =
    (err && typeof err === "object" && "body" in err
      ? (err.body as { detail?: string })?.detail
      : null) ?? "Generic fallback message";
  setError(message);
}
```

**Application:** Fixed in meal plan generation (commit 5ed1955). Apply pattern to all frontend API calls (inventory, preferences, etc.).

**Outcome:** Users see helpful, actionable error messages. Better UX for expected errors (409 conflicts, 404 not found). All 117 API tests pass, 56 worker tests pass, Next.js build succeeds.

### Decision 12: User Directive — UI/UX Improvement

**Author:** Ashley Hollis (via Copilot)  
**Date:** 2026-03-02  
**Status:** Driving Phase 1

Meal planner needs images (meal photos, store branding), proper desktop layout (not stretched mobile), responsive design for both mobile and desktop. Consider separate versions but prefer responsive.

**Rationale:** Current text-only, mobile-first-only UI doesn't meet UX expectations.

**Outcome:** Captured for team memory. Decisions 4-6 address this directive.

### Decision 13: Auto-complete Existing Plan Before Generating New One

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-03  
**Status:** Implemented

## Context

The API enforces a constraint: only one active or draft meal plan per household. When the user clicks "Generate New Plan" while one already exists, the API returns 409 Conflict. Previously, the frontend displayed this as an error message (Decision 11 improved the error display), but the user still had to manually complete the old plan.

## Decision

The frontend now auto-completes any existing active/draft plan before creating a new one. In `handleGenerate`:

1. Check `plans` state for any plan with status "active" or "draft"
2. If found, call `updatePlanStatus(planId, { status: "completed" })`
3. Then proceed with `createMealPlan(...)` as normal

## Rationale

- Users expect "Generate New Plan" to just work — they shouldn't need to understand the one-active-plan constraint
- The old plan is implicitly superseded by the new one, so marking it "completed" is semantically correct
- This is a frontend-only change; no backend modifications needed

## Outcome

- 87/87 frontend tests pass
- TypeScript compiles clean
- Commit `9f45365` on branch `003-personalization-ai`

### Decision 14: User Directive — Latest LLM Models

**Author:** Ashley Hollis (via Copilot)  
**Date:** 2026-03-03  
**Status:** Active (Squad coordination)

The team should always use the latest LLM models. Specifically: `claude-opus-4.6` for Lead, `claude-sonnet-4.6` for Devs, `claude-haiku-4.5` for Ops/Test/Scribe. The user's Layer 1 override supersedes the Squad coordinator's default model selection table.

**Rationale:** User request — captured for team memory.

**Outcome:** Applied to squad spawn manifest starting 2026-03-03T060858Z.
**Date:** 2025-01-XX (earlier work)  
**Status:** Implemented

**Context:** Validator relaxed from "exactly 7 recipes" to "at least 5 recipes". Tests were outdated, blocking CI.

**Changes to `test_validator.py`:**

1. `test_too_few_recipes`: Now tests 4 recipes (not 5), expects "Expected at least 5 recipes, got 4"
2. `test_too_many_recipes`: Verifies 9 recipes produces NO error (no upper bound)
3. `test_zero_recipes`: Expects "Expected at least 5 recipes, got 0"
4. Class docstring: "At least 5 recipes required" (was "Exactly 7")

**Rationale:**

- Consistency: Tests reflect actual validator behavior
- Flexibility: Relaxed constraint allows AI to vary recipe count based on inventory
- Coverage: Validates minimum threshold, no maximum

**Impact:** All 29 worker tests now pass. CI unblocked. Test suite accurate to constraints.

---

## Session 2026-03-03T0702 Duplicate Inventory Fix & E2E Hardening

**Resolved:** 4 decisions (inventory duplicates three-layer fix, E2E hardening, SWA cleanup, model directive)

### Decision 9: Duplicate Inventory — Complete Three-Layer Fix

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented  
**Commit:** `14333c2`

**Problem:** Duplicate inventory items persisted despite previous upsert attempt. Root causes: (1) Existing duplicates in shared DB never cleaned, (2) E2E seed script accumulated state across runs, (3) No DB-level constraint.

**Solution: Three-layer approach**

1. **Layer 1 — Migration 005 with dedup & unique constraint:**
   - CTE deduplication: keeps latest row per (household_id, ingredient_id, location)
   - Idempotent unique constraint via `sys.indexes` check
   - Safe downgrade (idempotent constraint drop)

2. **Layer 2 — SQLAlchemy model sync:**
   - Added `UniqueConstraint` to `InventoryItem.__table_args__`
   - Keeps Python model in sync with DB for Alembic autogenerate

3. **Layer 3 — E2E seed idempotency:**
   - Before seeding: `GET /api/v1/inventory` then `DELETE` each item
   - Clean slate every pipeline run

4. **Layer 0 (existing) — Upsert guard:**
   - Pre-existing `add_item()` upsert remains as belt-and-suspenders

**Impact:** 98 API tests pass, 37 frontend tests pass, no test modifications needed. Shared-DB preview environments now have hard guarantees against duplicates.

### Decision 10: E2E Test Suite Hardening and Feature Coverage

**Author:** Lambert (Tester)  
**Date:** 2026-03-02  
**Status:** Implemented

**Problem:** Test suite reported "27 passed, 9 skipped" while preview was broken with 500s. Tests hid real bugs via silent seed failures and defensive skip logic.

**Solution:**

1. **Seed-data must fail hard:** Changed `console.warn()` to `expect()` assertions. Seed failures now cascade visibly.
2. **API errors must fail tests:** Removed defensive error checks that skipped instead of throwing.
3. **New feature E2E coverage:** Added 8 tests (5 inventory, 3 meal-plan) for freezer, leftovers, staples, auto-deduct.
4. **Real user journeys:** Changed pattern from "element exists?" to "workflow succeeds?"

**Validation:** TypeScript compiles, 37 unit tests pass, Playwright syntax valid. (Full E2E validation requires running against healthy backend.)

**Files changed:** `seed-data.setup.ts`, `inventory.spec.ts`, `meal-plan.spec.ts`

### Decision 11: SWA Preview Environment Cleanup Threshold

**Author:** Parker (DevOps)  
**Date:** 2026-03-03  
**Status:** ✅ Implemented

**Problem:** Concurrent PR deployments deleted each other's preview environments. Root cause: cleanup action with `min-age-hours: "1"` too aggressive.

**Solution:** Increase threshold to `min-age-hours: "24"` in `.github/workflows/deploy-frontend-swa.yml`.

**Rationale:** 24-hour window allows concurrent deployments without interference. Typical PR lifetime 1-7 days.

**Note:** Replaced in parallel work (Decision 12) with PR-aware cleanup that checks open/closed status.

### Decision 12: Local Closed-PR-Aware SWA Cleanup Action

**Author:** Parker (DevOps)  
**Date:** 2026-03-03  
**Status:** Implemented

**Problem:** Age-based cleanup (Decision 11) was a band-aid. Fundamental issue: cleanup doesn't account for PR open/closed status.

**Solution:** Replaced shared-infra reference with local composite action (`.github/actions/cleanup-stale-swa-environments/`) that checks PR status before deleting. Only closed/merged PR environments deleted.

**Trade-offs:**

- ✅ Eliminates cross-branch deletion race condition
- ⚠️ This repo now owns cleanup logic (not shared)
- Requires `gh` + Azure CLI (available on `ubuntu-latest`)

### Decision 13: User Directive — Always Use Configured Models

**Author:** Ashley Hollis (via Copilot)  
**Date:** 2026-03-03  
**Status:** Captured

**What:** Team members must be spawned with exact models specified in team.md (Dallas=claude-opus-4.6, Ripley/Kane=claude-sonnet-4.6, Parker/Lambert/Scribe=claude-haiku-4.5). Charters must have explicit Preferred model values.

**Why:** Models were configured but coordinator kept using wrong versions. User request enforces source-of-truth compliance.

---

## Session 2026-03-03T0800 Visual Smoke Testing Directive

**Resolved:** 1 decision (mandatory visual smoke testing)

### Decision 15: User Directive — Mandatory Visual Smoke Testing Before Feature Completion

**Author:** Ashley Hollis (via Copilot)  
**Date:** 2026-03-03  
**Status:** Active (Permanent directive)

**What:** Every feature MUST undergo visual smoke testing in the Azure preview environment using Playwright MCP browser tools BEFORE the feature can be marked complete or the PR merged. E2E tests alone are NOT sufficient.

**Why:** During 005-grocery-enhancements, automated E2E tests (52 passed, 0 failed) gave a false sense of confidence. Manual visual smoke testing revealed:

1. **Untestable flows** — Grocery list with shop filter and TripTracker couldn't be tested because no active meal plan with grocery items existed in the interactive user's context (E2E tests use isolated seed data)
2. **Pre-existing bugs hidden by E2E** — Meal plan generation returns 422 + frontend crashes with React error #31 (renders error object as React child). E2E tests never exercise this path because they seed data directly.
3. **Visual rendering gaps** — E2E headless tests can't catch layout issues, missing badges, broken responsive behavior, or visual regressions that only appear in a real browser

**Directive — applies to ALL future features:**

1. **Phase gate**: Tasks.md for every feature MUST include a "Visual Smoke Testing" phase as the FINAL phase before feature completion
2. **Scope**: Test every user story's primary UI flows in the deployed Azure preview environment
3. **Tooling**: Use Playwright MCP browser tools (navigate, snapshot, click, type) to interact with the live preview
4. **Auth**: Test both authenticated and unauthenticated states
5. **Regression**: Verify existing pages have no visual regressions
6. **Evidence**: Capture accessibility snapshots or screenshots of key screens
7. **Blocker policy**: Any visual bug found during smoke testing MUST be fixed before merge — it is a blocker, not a nice-to-have
8. **Owner**: Lambert (Tester) owns the smoke test checklist; Kane (Frontend Dev) fixes any visual bugs found

**Smoke Test Checklist Template** (adapt per feature):

- [ ] Navigate to preview URL (from GitHub Actions deployment)
- [ ] Test unauthenticated state (landing page, login link)
- [ ] Log in and verify authenticated state
- [ ] Test each user story's primary UI flow visually
- [ ] Verify data displays correctly (not raw IDs, proper formatting)
- [ ] Test responsive layout (if applicable)
- [ ] Check for console errors in browser
- [ ] Verify no visual regressions on existing pages
- [ ] Capture screenshots/snapshots as evidence

**Rationale:** Automated tests verify behavior in isolation. Visual smoke tests verify the integrated experience as a real user would see it. Both are necessary. This directive closes the gap between "tests pass" and "feature works."

---

## Session 2026-03-04T01-30 Inventory Validation & Product Serialization

**Resolved:** 4 decisions (relax inventory validation, product serialization, shop filter sentinel, visual smoke testing directive)

### Decision 16: Inventory Validation is Guidance, Not a Gate

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-04  
**Status:** Implemented  
**Commit:** da7bcba — `fix(validator): relax inventory constraint to allow grocery list items`

## Context

Meal plan generation was failing with:

- `"Expected ~21 recipes for 3 meal types (±2), got 13"`
- Many `"ingredient X not in inventory"` errors

The validator's check #4 required every recipe ingredient to exist in the household inventory. With multi-meal-type generation (breakfast + lunch + dinner), the LLM naturally includes ingredients not yet stocked — which is correct behaviour, since the grocery list is supposed to surface exactly those items.

## Decision

**Remove the inventory ingredient check from the validator entirely.**

The `inventory` parameter is retained in the function signature for backward compatibility, but the check body is replaced with a comment explaining the rationale.

Additionally, requirement 6 in both the `SYSTEM_PROMPT` constant and `format_system_prompt()` was updated from:

> "Use ingredient names that match the provided inventory list"

to:

> "Prioritize using ingredients from the provided inventory, especially items expiring soon. Recipes MAY include ingredients not in inventory — those will be added to the grocery list."

## Rationale

Hard validation gates belong only to:

1. **Safety constraints** — allergen ingredients (never relax)
2. **Structural constraints** — servings must be 2, recipe count within tolerance, equipment modes must exist

Inventory awareness is a **prompt-level guidance**, not a validator gate. The LLM still prioritises in-stock items and expiring items; it just isn't blocked from including others.

## Impact

- All 97 worker tests pass
- All 187 API tests pass
- Next.js build succeeds
- No test changes were required

### Decision 17: Product Mapping Routes — Manual Serialization Pattern

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-04  
**Status:** Implemented

## Context

The `ProductResponse` Pydantic model includes an `ingredient_name: str` field that is not a column on the `Product` ORM model — it must be populated from the eagerly-loaded `ingredient` relationship.

`model_validate(product)` with `from_attributes=True` cannot populate `ingredient_name` because it's not an ORM attribute. Passing `**product.__dict__` also fails because SQLAlchemy's internal state dict (`_sa_instance_state`, unloaded attributes) is unreliable for direct dict unpacking.

## Decision

Use a `_to_response(product: Product) -> ProductResponse` helper that explicitly maps every field:

```python
def _to_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        household_id=product.household_id,
        ...
        ingredient_name=product.ingredient.name if product.ingredient else "",
        created_at=product.created_at,
        updated_at=product.updated_at,
    )
```

Also: after `session.flush()`, call bare `session.refresh(product)` (not with `attribute_names`) to ensure `updated_at` is reloaded from the DB server default before the route handler accesses it.

## Rationale

- Explicit is better than implicit — no hidden ORM state bugs
- `ingredient` is `lazy="selectin"` so it's always loaded; safe to access directly
- The `refresh()` pattern ensures server-side timestamps are available without greenlet errors

## Impact

- Pattern to use in any future route where a response model includes derived/joined fields
- Applies to: ProductResponse; may apply to future response models that embed joined data

### Decision 18: Shop Filter Uses `__other__` Sentinel for Unassigned Items

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-04  
**Status:** Implemented

## Context

The ShopFilter component needs to handle grocery items that have no product linked (or have a product with no shop). These can't map to a real shop name.

## Decision

Use the string sentinel `"__other__"` as the `selectedShop` value when the "Other" tab is active. `filterByShop()` in GroceryList treats this value specially: it filters for items where `!item.product?.shop`.

## Rationale

- Avoids a separate boolean flag or discriminated union for "Other" state
- Keeps `selectedShop: string | null` simple (null = All, string = shop name or sentinel)
- TripTracker is not shown when `selectedShop === "__other__"` (no meaningful trip tracking for unassigned items)

## Scope

Frontend only. No API or backend impact. Components: ShopFilter.tsx, GroceryList.tsx.

### Decision 19: User Directive — Mandatory Visual Smoke Testing Before Feature Completion

**Author:** Ashley Hollis (via Copilot)  
**Date:** 2026-03-04  
**Status:** Active (Permanent directive)

**What:** Every feature MUST undergo visual smoke testing in the Azure preview environment using Playwright MCP browser tools BEFORE the feature can be marked complete or the PR merged. E2E tests alone are NOT sufficient.

**Why:** During 005-grocery-enhancements, automated E2E tests (52 passed, 0 failed) gave a false sense of confidence. Manual visual smoke testing revealed:

1. **Untestable flows** — Grocery list with shop filter and TripTracker couldn't be tested because no active meal plan with grocery items existed in the interactive user's context (E2E tests use isolated seed data)
2. **Pre-existing bugs hidden by E2E** — Meal plan generation returns 422 + frontend crashes with React error #31 (renders error object as React child). E2E tests never exercise this path because they seed data directly.
3. **Visual rendering gaps** — E2E headless tests can't catch layout issues, missing badges, broken responsive behavior, or visual regressions that only appear in a real browser

**Directive — applies to ALL future features:**

1. **Phase gate**: Tasks.md for every feature MUST include a "Visual Smoke Testing" phase as the FINAL phase before feature completion
2. **Scope**: Test every user story's primary UI flows in the deployed Azure preview environment
3. **Tooling**: Use Playwright MCP browser tools (navigate, snapshot, click, type) to interact with the live preview
4. **Auth**: Test both authenticated and unauthenticated states
5. **Regression**: Verify existing pages have no visual regressions
6. **Evidence**: Capture accessibility snapshots or screenshots of key screens
7. **Blocker policy**: Any visual bug found during smoke testing MUST be fixed before merge — it is a blocker, not a nice-to-have
8. **Owner**: Lambert (Tester) owns the smoke test checklist; Kane (Frontend Dev) fixes any visual bugs found

**Smoke Test Checklist Template** (adapt per feature):

- [ ] Navigate to preview URL (from GitHub Actions deployment)
- [ ] Test unauthenticated state (landing page, login link)
- [ ] Log in and verify authenticated state
- [ ] Test each user story's primary UI flow visually
- [ ] Verify data displays correctly (not raw IDs, proper formatting)
- [ ] Test responsive layout (if applicable)
- [ ] Check for console errors in browser
- [ ] Verify no visual regressions on existing pages
- [ ] Capture screenshots/snapshots as evidence

**Rationale:** Automated tests verify behavior in isolation. Visual smoke tests verify the integrated experience as a real user would see it. Both are necessary. This directive closes the gap between "tests pass" and "feature works."
