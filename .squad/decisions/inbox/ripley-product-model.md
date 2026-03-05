# Decision: Product Model Patterns for 005-grocery-enhancements

**Author:** Ripley (Backend Dev)
**Date:** 2026-03-06
**Status:** Implemented

## Summary

Phase 1 (T001-T003) was already committed before this session in commit 52c6172. Validation confirmed clean state: ruff passes, 193 API tests pass.

## Patterns Established

### Product model (services/shared/shared/db/models/product.py)
- UUID PK uses `generate_uuid` Python-side default, not a SQL server_default — consistent with all other models
- UNIQUEIDENTIFIER is handled by Base.type_annotation_map at class level, not per-column
- Relationships: `lazy="selectin"` on both household and ingredient FK sides
- `__table_args__` holds UniqueConstraint + two Index entries at bottom of class

### Migration (services/shared/alembic/versions/005_grocery_products.py)
- revision="005", down_revision="004" — maintains the linear chain
- Idempotent: _table_exists() before create_table, _index_exists() before create_index
- Timestamps use server_default=sa.text("SYSUTCDATETIME()") in migration (Python default is for ORM path)
- downgrade uses DROP TABLE IF EXISTS (T-SQL syntax, matches Azure SQL)

## Why This Matters

Future migrations must follow the same idempotent pattern. Any new model with a UUID PK should use generate_uuid (not server_default) in the ORM model class but add server_default=NEWID() in the migration column definition.
