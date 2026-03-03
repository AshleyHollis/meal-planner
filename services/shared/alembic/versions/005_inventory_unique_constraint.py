"""Add unique constraint on InventoryItems (household_id, ingredient_id, location).

Revision ID: 005
Revises: 004
Create Date: 2026-03-02

Steps:
  1. Deduplicate existing rows: for each (household_id, ingredient_id, location)
     group, keep the row with the latest created_at, delete the rest.
  2. Add unique constraint (idempotent — checks sys.indexes first).

This migration is safe to run on a clean DB (step 1 deletes nothing, step 2
creates the constraint) and on a DB with duplicates (step 1 cleans first).
"""

import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

_CONSTRAINT = "uq_inventory_household_ingredient_location"


def _constraint_exists(name: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM sys.indexes WHERE name = :n"),
        {"n": name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    # 1. Remove duplicate rows, keeping the latest (by created_at) per group.
    #    SQL Server supports DELETE on a CTE, so this is a single statement.
    op.get_bind().execute(
        sa.text(
            """
            WITH ranked AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY household_id, ingredient_id, location
                           ORDER BY created_at DESC
                       ) AS rn
                FROM InventoryItems
            )
            DELETE FROM ranked WHERE rn > 1
            """
        )
    )

    # 2. Add unique constraint if it doesn't already exist.
    if not _constraint_exists(_CONSTRAINT):
        op.create_unique_constraint(
            _CONSTRAINT,
            "InventoryItems",
            ["household_id", "ingredient_id", "location"],
        )


def downgrade() -> None:
    if _constraint_exists(_CONSTRAINT):
        op.drop_constraint(_CONSTRAINT, "InventoryItems", type_="unique")
