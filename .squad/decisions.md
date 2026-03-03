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
