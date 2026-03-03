# Decision: Auto-complete Existing Plan Before Generating New One

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
