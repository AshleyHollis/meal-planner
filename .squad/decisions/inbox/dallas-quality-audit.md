# Quality Audit — Dallas

**Date:** 2026-03-04
**Trigger:** Ashley reported "Generate Plan" failing on dashboard; overall app quality too low
**Method:** Source code review + live preview site testing (`https://agreeable-plant-04ffe2700-pr5.eastasia.6.azurestaticapps.net`)

---

## P0 — CRITICAL: Generate Plan Broken on Dashboard

### Root Cause

The dashboard's "Generate Plan" button fails with HTTP 409 because it **does not auto-complete existing draft/active plans** before calling `createMealPlan()`.

**The state mismatch:**
1. API (`meal_plan_service.py:77-87`) rejects `POST /api/v1/meal-plans` if ANY plan with status `draft` or `active` exists → returns 409
2. Dashboard (`page.tsx:42-75`) calls `getActiveMealPlan()` to check for an existing plan, but this endpoint only returns plans with `status=active`, NOT `status=draft`
3. So when a `draft` plan exists (e.g., worker never finished, Azure OpenAI unavailable), the dashboard shows "Plan Your Week" with Generate button, but clicking it gets 409
4. The preview environment has exactly this state: 1 draft plan, 0 active plans

**Verified on live preview:** Clicked "Generate Plan" → console shows `409` on `POST /api/v1/meal-plans`. Error message shown: "Failed to generate meal plan." (generic, not the actual API detail).

### Three Bugs in One

| # | Bug | Dashboard (`page.tsx`) | Meal Plan page (`meal-plan/page.tsx`) |
|---|-----|----------------------|--------------------------------------|
| 1 | **No auto-complete of existing plans** | ❌ Missing (lines 81-98) | ✅ Present (lines 116-121) |
| 2 | **Generic error message** | ❌ Shows "Failed to generate meal plan." (line 96) | ✅ Shows actual API detail (lines 135-138) |
| 3 | **Missing `meal_types` parameter** | ❌ Only sends `week_start_date` + `cuisine_preferences` (lines 85-89) | ✅ Sends all three including `meal_types` (lines 123-128) |

### Fix — Kane (Frontend)

**File:** `apps/web/src/app/page.tsx`

1. Import `listMealPlans` and `updatePlanStatus` from `@/services/api`
2. In `handleGenerate()`, before calling `createMealPlan()`:
   - Fetch plan list (or use cached data) to find any `active`/`draft` plan
   - If found, call `updatePlanStatus(existing.id, { status: "completed" })` first
3. Change error handling to show API detail instead of generic message (match meal-plan page pattern)
4. Consider adding `meal_types` support to dashboard generate flow (or omit intentionally for simplicity — but document the decision)

---

## P1 — HIGH: Inconsistencies Between Dashboard & Meal Plan Page

### 1. Duplicated `getNextMonday()` function
- **Files:** `apps/web/src/app/page.tsx:22-29` AND `apps/web/src/app/meal-plan/page.tsx:39-46`
- Identical function defined in both files. Should be extracted to `@/lib/date-utils.ts` (which already exists).
- **Risk:** Future changes to one copy won't be applied to the other.

### 2. Dashboard "Plan Your Week" section doesn't reflect `draft` plans
- Dashboard only checks for `active` plans via `getActiveMealPlan()`. A `draft` plan (generation in progress) is invisible to the dashboard — user sees "Generate Plan" even though generation is already underway.
- **Fix:** Dashboard should also check for `draft` plans and show a "Generation in progress" state with a link to the draft plan.

### 3. Different error handling patterns
- Dashboard: `setError("Failed to generate meal plan.")` — generic
- Meal Plan page: Extracts `err.body.detail` — specific
- History page: `setError("Failed to load meal history")` — generic, no retry
- Inventory page: Shows error with **Retry** button — best pattern
- **Standard:** All pages should use the Inventory page pattern: show API detail + Retry button

### 4. Dashboard doesn't use `useToast`
- Meal Plan page uses `useToast` for delete confirmation feedback
- Dashboard uses inline `{error}` div only
- **Inconsistent UX.** Toast should be used for transient errors; inline for persistent.

---

## P2 — MEDIUM: UX Quality Issues

### 5. Quick Suggestions "Cook This" button is fake
- **File:** `apps/web/src/app/quick-suggestions/page.tsx:35-38`
- `handleCookThis()` just shows a fake toast message ("added to your plan!") but performs NO API call
- **No plan is created.** This is misleading to users.
- **Fix (Ripley):** Either implement the actual API call to add to plan, or change button text to "View Recipe" and remove the fake success toast.

### 6. Desktop sidebar active state highlights incorrectly
- **File:** `apps/web/src/app/layout.tsx:264`
- `pathname.startsWith(href)` means `/meal-plan` highlights for BOTH `/meal-plan` AND `/meal-plan/[id]` — that's correct
- But the **Home** link (`/`) is missing from the desktop sidebar entirely. User can only get home via the "Meal Planner" logo link. Not discoverable.
- The sidebar has no "Home" or "Dashboard" entry.

### 7. Hardcoded currency format
- **Files:** `apps/web/src/app/products/[id]/page.tsx:196-199`, `apps/web/src/app/products/page.tsx:275-278`, `apps/web/src/app/grocery-list/[id]/page.tsx:92`
- Currency is hardcoded to `en-AU` / `AUD` in product pages but the grocery list uses raw `$` prefix
- **Fix:** Extract currency formatting to a shared utility. Use a configuration or user preference.

### 8. Hardcoded `CURRENT_MEMBER_ID = "current"` in preferences
- **File:** `apps/web/src/app/preferences/page.tsx:7`
- Comment says "In a real implementation, this would fetch the current user's member ID"
- This is a placeholder. It works because the backend resolves `"current"` from auth context, but it's a code smell.

### 9. Grocery list estimated cost uses `$` but products page uses `Intl.NumberFormat`
- **File:** `apps/web/src/app/grocery-list/[id]/page.tsx:92` — `Est. ${estimatedCost.toFixed(2)}`
- **File:** `apps/web/src/app/products/page.tsx:275-278` — `Intl.NumberFormat("en-AU", ...)`
- **Inconsistent.** Same number, different formatting.

### 10. Products page delete handler silently fails
- **File:** `apps/web/src/app/products/page.tsx:82-89`
- `handleDelete` has an empty `catch {}` block — no error feedback to user
- **Fix:** Show toast or error state on delete failure.

---

## P3 — LOW: Code Quality & Maintainability

### 11. `DAY_LABELS` defined in 3 places
- `apps/web/src/app/page.tsx:414-420` (abbreviated: Mon, Tue...)
- `apps/web/src/app/page.tsx:475-483` (full: Monday, Tuesday...)
- `apps/web/src/app/meal-plan/[id]/page.tsx:22-30` (full: Monday, Tuesday...)
- **Fix:** Extract to `@/lib/date-utils.ts` with both abbreviated and full variants.

### 12. E2E tests don't cover dashboard Generate Plan flow
- `e2e/smoke.spec.ts:172-186` checks that Generate Plan button OR Active Plan heading exists, but never clicks Generate
- `e2e/meal-plan.spec.ts:316-367` tests Generate from the meal plan page, not the dashboard
- **This is exactly why the bug went undetected.** The dashboard Generate path has zero E2E coverage.
- **Fix (Lambert):** Add E2E test that clicks Generate Plan on the dashboard page.

### 13. No ErrorBoundary wrapper on pages
- `apps/web/src/components/ui/ErrorBoundary.tsx` exists but is not used on any page
- An unhandled React error will show the default white screen
- **Fix:** Wrap each page with ErrorBoundary in the layout

### 14. Missing `<meta>` title per page
- All pages show "Meal Planner" as the browser tab title
- No page-specific titles (e.g., "Inventory — Meal Planner", "Meal Plans — Meal Planner")
- Minor but affects usability when multiple tabs are open

### 15. `WeeklyPlanView.tsx` component exists but is unused
- **File:** `apps/web/src/components/meal-plan/WeeklyPlanView.tsx`
- Present in the components directory but not imported anywhere
- The meal plan detail page (`meal-plan/[id]/page.tsx`) inlines its own weekly view
- **Fix:** Either use the component or delete it.

### 16. Meal plan list page shows 34 plans with 18 failed
- Preview environment has accumulated test junk: 18 failed plans, 15 completed (all auto-completed before retry), 1 stuck draft
- No bulk cleanup capability exists in the UI
- **Not a code bug** but affects perceived quality. Consider adding a "Clean up failed plans" action.

---

## Quality Standards Going Forward

1. **Error handling:** Always extract and display API error detail. Never show generic "Failed to..." messages. Use the Inventory page pattern: show detail + Retry button.
2. **DRY:** Extract shared utilities (dates, currency, day labels) to `@/lib/`. No function duplication between pages.
3. **Parity:** Dashboard and dedicated page must use the same logic for any shared action (generate plan, etc.). Extract shared hooks when the same API interaction appears in 2+ places.
4. **E2E coverage:** Every user-facing action (button click that calls an API) must have at least one E2E test path. Dashboard Generate was the gap that let this bug ship.
5. **No fake actions:** If a button says "Cook This" or "added to your plan!", it must actually do that. Placeholder toasts are worse than no button at all.
6. **Toast vs inline errors:** Use toast for transient confirmations (deleted, saved). Use inline error divs for blocking errors that need user action.

---

## Summary of Assignments

| Priority | Issue | Owner | Effort |
|----------|-------|-------|--------|
| P0 | Dashboard Generate Plan fails (409) | Kane | 1hr |
| P0 | Dashboard shows generic error, not API detail | Kane | 15min |
| P1 | Extract `getNextMonday()` to shared util | Kane | 15min |
| P1 | Dashboard should detect draft plans | Kane | 30min |
| P1 | Standardize error handling pattern | Kane | 2hr |
| P2 | Quick Suggestions "Cook This" is fake | Ripley | 2hr |
| P2 | Add Home/Dashboard to desktop sidebar | Kane | 15min |
| P2 | Standardize currency formatting | Kane | 30min |
| P2 | Products page silent delete failure | Kane | 15min |
| P3 | Extract DAY_LABELS to shared util | Kane | 15min |
| P3 | Add E2E test for dashboard Generate | Lambert | 1hr |
| P3 | Wrap pages with ErrorBoundary | Kane | 30min |
| P3 | Page-specific browser tab titles | Kane | 30min |
| P3 | Clean up or remove unused WeeklyPlanView | Kane | 15min |
