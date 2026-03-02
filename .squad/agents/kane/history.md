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
