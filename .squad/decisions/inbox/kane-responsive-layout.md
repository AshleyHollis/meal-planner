# Decision: Responsive Layout Architecture — Phase 1

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented

## Context

The app was built mobile-first (375px min-width). On desktop it appeared as a narrow centered column — no sidebar, no multi-column layout, bottom nav awkwardly visible.

## Decision

Implement a single responsive codebase using Tailwind breakpoint classes (`lg:` at 1024px+). No separate desktop components, no custom CSS, no new dependencies.

### Layout strategy:

- **Mobile (default):** Sticky top header, bottom navigation bar, single-column content — all unchanged.
- **Desktop (`lg:` and above):** Fixed left sidebar (w-64), hidden top header, hidden bottom nav, content offset by `lg:pl-64`.

### Sidebar implementation:

- Added `DesktopSidebar` component in `layout.tsx` (`hidden lg:flex`).
- Reuses same `navItems` array as `BottomNav` — single source of truth.
- Uses `usePathname()` for active route highlighting (same logic as `BottomNav`).
- Shows user display name + logout at the bottom of the sidebar.
- App title/logo at the top of the sidebar replaces the mobile header on desktop.

### Content width:

- All `<main>` containers: `max-w-2xl lg:max-w-7xl mx-auto` — narrow on mobile, full-width on desktop.

### Page-level grid upgrades:

- Dashboard quick links: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Meal plan list: `lg:grid-cols-2` card grid
- Inventory: `lg:grid-cols-2` with form left, list right
- WeeklyPlanView: `lg:grid-cols-2 xl:grid-cols-3`
- Grocery list / meal plan detail: wider container, no layout restructure needed

## Rationale

Single codebase avoids duplication and drift. Tailwind breakpoints are the idiomatic approach for Next.js apps. The sidebar + `pl-64` offset pattern is well-established and doesn't require JavaScript or layout context.

## Outcome

Build clean ✅. 7 routes, 102kB shared JS, 0 type errors. All 37 existing unit tests unaffected (no logic changes).
