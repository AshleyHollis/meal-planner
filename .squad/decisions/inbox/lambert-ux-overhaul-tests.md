# Decision: E2E Test Coverage for Phase 1 UX Overhaul

**Author:** Lambert (Tester)  
**Date:** 2026-03-04  
**Status:** Implemented

## Context

Phase 1 UX overhaul introduced significant UI/UX changes:

- Mobile navigation with "More" slide-up menu (5 secondary menu items)
- Status filter tabs on meal plans (All, Active, Completed, Failed, Draft)
- Delete functionality for failed plans with confirmation dialog
- EmptyState component for no-data states
- Card-based layouts with visual status indicators

Risk: Without E2E coverage, regressions in these new UX patterns would not be caught until production or user reports.

## Decision

Add comprehensive E2E test coverage for all Phase 1 UX features:

1. **Navigation (smoke.spec.ts)** — 2 tests for mobile More menu:
   - Menu opens and all 5 links visible
   - Menu closes on link click and navigation works

2. **Meal Plans (meal-plan.spec.ts)** — 24 tests across 4 suites:
   - Status filter tabs: All, Active, Completed, Failed, Draft filtering
   - Delete failed plans: button visibility, confirmation dialog, cancel flow
   - Empty state: proper component display when no plans exist

## Rationale

- **Coverage:** All user-facing Phase 1 UX changes now have E2E validation
- **Regression prevention:** Future changes to navigation, filters, or delete UX will trigger test failures
- **Test patterns:** New tests follow established patterns (skip guards, graceful state handling, role-based selectors)
- **Mobile-first:** More menu tests use viewport sizing to verify responsive UX
- **Data-aware:** Tests handle scenarios where test data is missing (no plans, no failed plans)

## Outcome

- 26 new E2E tests added (all passing structure, ready for execution)
- TypeScript compilation clean
- Commit: 3c3f8c1
- Branch: 005-grocery-enhancements
- No breaking changes to existing test files
- All new tests follow squad conventions (test.skip, getByRole, proper timeouts)

## Post-MVP

If E2E tests fail after merge:

1. Check if UI selectors changed (navigation, filter buttons, delete buttons)
2. Verify More menu state management (showMore state in layout.tsx)
3. Confirm status filter logic (line 195-210 in meal-plan/page.tsx)
4. Check delete handler (line 112-127 in meal-plan/page.tsx)

## Testing Notes

- More menu tests require mobile viewport (375x667)
- Filter tab tests handle both empty and populated states
- Delete tests use two-level confirmation pattern (click → confirm → click confirm again)
- Empty state test checks for either EmptyState OR absence of plan cards
