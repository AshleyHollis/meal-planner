# Decision: Worker Resilience — scalar_one_or_none Pattern

**Author:** Ripley  
**Date:** 2026-03-04  
**Branch:** 005-grocery-enhancements  
**Commit:** e75c0ab

## Context

During the meal plan generation pipeline audit, two instances of `result.scalar_one()` were found in `services/workers/meal_plan_generator/generator.py`. SQLAlchemy's `scalar_one()` raises `NoResultFound` if the row doesn't exist. In the worker, this can happen if a plan is deleted between the time the LLM starts generating and the time the worker tries to persist results.

## Decision

**Use `scalar_one_or_none()` for all worker DB lookups where the target row may not exist**, followed by an explicit None check with a warning log and early return. Never use `scalar_one()` in async worker code outside of a context where the row is guaranteed to exist.

## Rationale

- Workers run asynchronously and the target plan can be deleted (e.g., user deletes a failed/stuck plan) between LLM call and DB write
- `scalar_one()` throws `NoResultFound` which propagates as an exception and triggers `_mark_failed`, which itself used `scalar_one()` — a double failure
- `scalar_one_or_none()` + None guard produces clean warning logs and graceful early return with no state corruption
- Matches the existing check at step 1.5 in `generate_meal_plan` which already uses `scalar_one_or_none()`

## Impact

- `_persist_plan()`: now safely returns if plan was deleted before persistence
- `_mark_failed()`: now safely returns if plan was deleted before status update
- Pattern should be applied to any future worker DB lookups

## Also Noted (Not Fixed)

The API-level check for existing draft/active plans in `MealPlanService.create_plan()` uses application-level SELECT+check rather than a DB constraint. This is a potential race condition under concurrent requests. Low risk for current usage but should be addressed if concurrency increases (add a filtered unique index on `(household_id, status)` for draft/active states, or use a DB-level advisory lock).
