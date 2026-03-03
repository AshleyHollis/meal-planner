# Kane — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4, Auth0 v4 BFF
- **Owner:** Ashley Hollis
- **Branch:** 001-meal-planner-mvp (PR #1)
- **State:** Frontend fully built. 37 frontend unit tests pass. Build clean (6 routes, 102kB shared JS).
- **Key files:** apps/web/src/services/api.ts, apps/web/src/services/runtimeConfig.ts, apps/web/src/middleware.ts
- **Auth pattern:** Auth0 v4 BFF — /auth/access-token endpoint, Bearer token on all API calls

## Learnings

### Phase 1 — Responsive Layout (Desktop Sidebar Nav)

- **What changed:** 7 files updated — `layout.tsx`, `page.tsx`, `meal-plan/page.tsx`, `meal-plan/[id]/page.tsx`, `inventory/page.tsx`, `grocery-list/[id]/page.tsx`, `WeeklyPlanView.tsx`.
- **Pattern used:** Tailwind responsive prefixes only (`lg:`, `xl:`). No custom CSS or media queries. No new dependencies.
- **Sidebar approach:** Added `DesktopSidebar` component in layout.tsx (`hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0`). Uses same `usePathname()` active state logic as `BottomNav`. User name + logout at sidebar bottom.
- **Mobile preserved:** `Header` got `lg:hidden`, `BottomNav` nav got `lg:hidden`, body padding kept `pb-20 lg:pb-0`. All mobile behavior unchanged.
- **Content offset:** Wrapped `Header` + `children` + `BottomNav` in `<div className="lg:pl-64">` to offset for sidebar width.
- **Container width:** All `<main>` elements updated to `max-w-2xl lg:max-w-7xl` for wider desktop canvas.
- **Build result:** ✅ Clean — 7 routes, 102kB shared JS, 0 errors. Only pre-existing `<a>` auth link warnings (not related to this work).
- **Inventory page:** Restructured to `lg:grid lg:grid-cols-2 lg:gap-8` with form on left and list on right — logic/state unchanged.

### Phase 2 & 3 — Meal Images + Store Branding

- **What changed:** 2 new lib files (`meal-images.ts`, `store-branding.ts`) + 5 component files updated (`MealSlotCard.tsx`, `WeeklyPlanView.tsx`, `GroceryList.tsx`, `page.tsx`) + `next.config.ts`.
- **Image approach:** `next/image` with `fill` + `object-cover` + `placeholder="empty"`. Unsplash CDN via photo ID lookup. Category matched by keyword scan of meal name (exact word then substring). Gradient overlay on image for legibility.
- **Fallback:** When category = "default" (no keyword match), `getMealImageUrl` returns `""` — components render a thin gradient color bar instead.
- **Store branding:** Colored circle badge in GroceryList section headers. Unknown stores default to first 2 chars of store name, gray background.
- **Desktop grocery layout:** `lg:grid lg:grid-cols-2 lg:divide-y-0` applied to grocery items list for 2-col layout on desktop.
- **Dashboard image:** Today's dinner slot image shown as a banner at top of Active Plan card. Falls back gracefully when no plan or no recipe for today.
- **Build result:** ✅ Clean — 7 routes, 0 errors. Only pre-existing `<a>` auth link warnings.

### Phase 4 — Polish and Build Verification

- **Files reviewed:** All 12 modified files from Phases 1–3 plus `grocery-list/page.tsx`.
- **Issues found and fixed:**
  1. `grocery-list/page.tsx` — both `<main>` containers (loading state and no-plan state) were missing `lg:max-w-7xl`. Fixed to `max-w-2xl px-4 py-8 lg:max-w-7xl`.
  2. `meal-images.ts` — `roast` category gradient had invalid Tailwind color `to-brown-700` (Tailwind has no `brown` palette). Fixed to `from-amber-600 to-amber-800`.
- **Consistency verified:**
  - All `<main>` containers: `max-w-2xl lg:max-w-7xl mx-auto` ✅
  - Desktop sidebar nav: all 4 routes match bottom nav ✅
  - Active route styling uses `pathname.startsWith(href)` in both nav components ✅
  - No raw `<img>` tags — all images use `next/image` with proper `alt` text ✅
  - All `'use client'` directives present where `usePathname`/`useState`/`useEffect`/`use()` are used ✅
  - Badge `"info"` variant is defined in `Badge.tsx` ✅
- **Build result:** ✅ Clean — 7 routes, 0 TypeScript errors, 0 new warnings. Pre-existing `<a>` auth link lint warnings remain (intentional — Auth0 BFF requires hard redirects, not Next.js Link).
- **Tests:** ✅ 37/37 passed — no regressions.

### Phase 5 — Auto-complete Existing Plan Before New Generation

- **What changed:** `apps/web/src/app/meal-plan/page.tsx` — modified `handleGenerate` function.
- **Problem:** API returns 409 Conflict when user clicks "Generate New Plan" while an active or draft plan exists.
- **Fix:** Before calling `createMealPlan()`, check `plans` state for any plan with status "active" or "draft". If found, call `updatePlanStatus(planId, { status: "completed" })` first.
- **API detail:** `updatePlanStatus` takes `(planId: string, body: UpdatePlanStatusBody)` where `UpdatePlanStatusBody = { status: MealPlanStatus }`. Task description said plain string param but actual signature is object — always check TypeScript types.
- **Tests:** ✅ 87/87 passed — no regressions. TypeScript clean.
- **Commit:** `9f45365` on branch `003-personalization-ai`.

### Phase 6 — Interactive Meal Cards & Recipe Details

- **What changed:** 3 files updated, 1 file created — `meal-plan/[id]/page.tsx`, `history/page.tsx`, `layout.tsx`.
- **Task 1 — Replace WeeklyPlanView with MealSlotCard:** Updated plan detail page to render `MealSlotCard` for each slot instead of read-only `WeeklyPlanView`. Added `onMarkCooked` and `onMarkSkipped` callbacks that call `updateSlotStatus` API, then trigger `refetch()` from polling hook to refresh data.
- **Task 2 — Expandable recipe detail view:** Added `expandedSlots` state (Set<string>) and toggle handler. Below each `MealSlotCard`, render a "View Recipe" / "Hide Recipe" button. When expanded, show recipe description, ingredients list (with quantity/unit/ID — ingredient names not available in data), and cooking steps with step numbers and duration.
- **Task 3 — Create /history page:** Created `apps/web/src/app/history/page.tsx` mounting `MealHistoryList` component. Implemented pagination with `getMealHistory(page, 20)`, page state, hasMore detection, and loading states. Added History nav link to layout with clock icon.
- **Task 4 — Fix favorite state loading:** On plan detail page load, call `listFavorites()` and build `Set<string>` of recipe IDs. Pass `isFavorited={favoriteRecipeIds.has(recipe.id)}` to each `MealSlotCard`. Implemented `handleFavoriteToggle` that calls `addFavorite`/`removeFavorite` API and updates local state.
- **Patterns used:**
  - Grouped slots by day using `slotsByDay: Record<number, MealSlot[]>` then sorted keys for consistent render order.
  - Used `useMealPlanPolling` hook's `refetch` method (not `setPlan`) to refresh data after mark-cooked/skip actions.
  - HistoryIcon SVG uses clock symbol (viewBox 0 0 24 24, circle + clock hands path).
  - Expanded nav from 5 to 6 items — bottom nav still fits on mobile (56px min-height per item ensures 44px tap target).
  - Recipe detail shows ingredient IDs (not names) because `RecipeIngredient.ingredient_id` is a string ID — no join to Ingredient table in current data structure.
- **Build result:** ✅ Clean — TypeScript 0 errors, lint 4 warnings (pre-existing auth `<a>` tags), tests 87/87 passed.
- **Outcome:** Users can now mark meals as cooked/skipped, rate cooked meals, favorite recipes, view cooking instructions inline, and see meal history. All core personalization features wired up.
