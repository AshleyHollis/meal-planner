# Decision: Unify Generate Plan Flow (Dashboard + Meal Plan Page)

**Author:** Kane  
**Date:** 2026-03-09  
**Branch:** 005-grocery-enhancements  
**Commit:** f1d988a  

## Context

The dashboard's "Generate Plan" button was failing silently with a 409 Conflict error from the API whenever the user had an existing active or draft plan. The meal plan page had a working implementation that auto-completed existing plans before creating new ones. These two flows were inconsistent.

## Decision

**Always call `listMealPlans()` at the start of `handleGenerate` to find and auto-complete any active/draft plan before calling `createMealPlan()`.**

Using `listMealPlans()` (not just the `plan` state) is intentional — `getActiveMealPlan()` only returns plans with status `"active"`, but a `"draft"` plan also causes a 409 conflict. The fresh list fetch inside `handleGenerate` catches all conflict cases.

## Changes

- Dashboard now uses identical generate flow to the meal plan page:
  - `listMealPlans()` → find active/draft → `updatePlanStatus(id, {status:'completed'})` → `createMealPlan()`
  - Same error message extraction (`err.body.detail`)
  - Same 3-step generation progress indicator
  - Same `CuisineSelector` + `MealTypeSelector` side-by-side (no more hidden "Customize Cuisine" toggle)
  - Toast + inline error on failure

## Impact

- Fixes the breaking "Generate Plan" button on the dashboard
- Consistent UX between dashboard and meal plan page
- No performance concern: `listMealPlans()` is only called on user-initiated generate, not on every render
