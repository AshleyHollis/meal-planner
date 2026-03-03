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

## Session 2026-03-02T0923 UI/UX Improvements

**Resolved:** 4 decisions (responsive layout, meal images, store branding, UI/UX architecture)

### Decision 4: Responsive Layout Architecture — Phase 1 (Desktop Expansion)

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
