# Decision: Repair Migration Strategy for Shared Preview Database

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-02  
**Status:** Implemented

## Context

All preview environments share a single Azure SQL database via Key Vault secret
`meal-planner-sql-connection-string`. There is no per-PR database isolation.

Migration 003 was partially applied in preview: the `alembic_version` table showed
revision `003`, but `Leftovers` and `StapleIngredients` tables were absent and the
`defrost_hours` column may not have been added. Because Alembic considers the DB
up-to-date when the version row matches, `alembic upgrade head` is a no-op and
cannot self-heal.

## Decision

When a migration is found to be partially applied in a shared environment:

1. **Do not attempt to reset or delete the `alembic_version` row** — this risks
   breaking other concurrent preview deployments.
2. **Create a follow-up repair migration** (next revision number, `down_revision`
   pointing at the broken one) that is fully idempotent.
3. **Idempotency pattern** for Azure SQL (T-SQL):
   - Column existence: `INFORMATION_SCHEMA.COLUMNS`
   - Table existence: `INFORMATION_SCHEMA.TABLES`
   - Index existence: `sys.indexes`
   - Use `op.get_bind()` + `sa.text()` inside `upgrade()` to query before acting.
4. **downgrade() is a no-op** for pure repair migrations — the original migration
   owns the objects and handles teardown.

## Rationale

- Safe on a fully-applied DB (no-op), partially-applied DB (fixes gaps), or any
  future fresh DB that runs both 003 and 004 in sequence.
- No manual intervention or DB state surgery required.
- Pattern is reusable for any future shared-environment partial-migration scenario.

## Files

- `services/shared/alembic/versions/004_repair_inventory_tables.py`
