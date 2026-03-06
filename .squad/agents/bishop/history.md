---
last_updated: 2026-03-04T00:00:00Z
---

# Bishop — Spec Architect History

Project-specific learnings from spec creation sessions.

## Learnings

<!-- Append entries after each spec session. Format: **Learning:** description. **Session:** date. -->

**Learning:** Cook-time adaptation (`POST .../adapt`) and save-variation (`POST /recipes/{id}/save-variation`) are both stub endpoints with `# TODO` comments — no LLM adaptation occurs. These are spec 001 US4 gaps. **Session:** 2026-03-04

**Learning:** Cooking Timers (US9) and Voice Assistant (US10) from spec 001 have zero implementation — no routes, no models, no frontend components. These are the largest unfilled stories from the MVP spec. **Session:** 2026-03-04

**Learning:** Spec 002 leftovers are never passed to the AI generator. `format_leftovers()` and `build_prompt(leftovers=)` exist in `prompts.py`, but `_load_context()` in `generator.py` never loads the `Leftover` table and never passes `leftovers=` to `build_prompt()`. FR-006 and SC-002 are unmet. **Session:** 2026-03-04

**Learning:** `POST /api/v1/grocery-lists/{id}/add-staples` (spec 002 FR-009) is missing entirely. Staple routes only cover add/list/delete/suggestions — no endpoint to bulk-add staple suggestions to an existing grocery list. **Session:** 2026-03-04

**Learning:** Spec 004 "Cook This" (FR-011) is UI-only — `handleCookThis` shows a toast but makes no API call to create a standalone meal slot. The backend has no endpoint to cook a quick suggestion. **Session:** 2026-03-04

**Learning:** Ingredient substitution (spec 004) computes grocery changes in the response but does NOT write them to the `GroceryItems` table. The grocery list in the DB still reflects the original ingredient after substitution — FR-005 gap. **Session:** 2026-03-04

**Learning:** Spec 005 ShoppingTrip entity has no server-side model. Trip check-off state uses localStorage only — not persisted in the DB, not shared across devices. The spec defined a `ShoppingTrip` DB entity that was never created. **Session:** 2026-03-04

**Learning:** `GroceryItem.preferred_store` is populated at list-generation time from product mappings. Inline product linking (FR-006) saves the product but does NOT update `preferred_store` on the existing grocery item row — the grouping diverges from the shop filter until the list is regenerated. **Session:** 2026-03-04

**Learning:** Spec 003 FR-020 multi-cuisine weighting is unimplemented. The API only accepts `cuisine_preferences: list[str]` with no weight values. **Session:** 2026-03-04

**Learning:** Single 1-star rating blocks a recipe in the generator (`avg_rating <= 2`) but spec 003 says ≥2 low ratings should be required. Also there is no UPDATE endpoint for preferences — only create/delete. **Session:** 2026-03-04

## Spec Directory Structure

The project uses this spec structure (established by specs 001-005):

```
specs/{feature-id}/
  spec.md       — user stories, acceptance criteria
  plan.md       — architecture, data models, API contracts
  tasks.md      — ordered implementation tasks with parallel markers
  data-model.md — (optional) detailed data model if complex
  contracts/    — (optional) API contract details if many endpoints
  checklists/   — (optional) verification checklists
```

## Codebase Patterns

- **Backend:** FastAPI + SQLAlchemy 2.0 async + Pydantic v2, under `services/api/`, `services/shared/`, `services/workers/`
- **Frontend:** Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4, under `apps/web/`
- **Models:** UUID PKs, TimestampMixin, household-scoped with household_id FK
- **Migrations:** Alembic under `services/shared/alembic/versions/`, idempotent pattern (IF NOT EXISTS)
- **Tests:** pytest (API), Vitest (frontend unit), Playwright (E2E under `apps/web/e2e/`)
- **Task format:** `[ID] [P?] [Story] Description` with exact file paths
