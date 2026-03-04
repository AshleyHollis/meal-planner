---
last_updated: 2026-03-04T00:00:00Z
---

# Bishop — Spec Architect History

Project-specific learnings from spec creation sessions.

## Learnings

<!-- Append entries after each spec session. Format: **Learning:** description. **Session:** date. -->

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
