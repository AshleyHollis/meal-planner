"""Repair inventory tables if migration 003 partially applied.

Revision ID: 004
Revises: 003
Create Date: 2026-03-02

This migration is IDEMPOTENT. It checks for the existence of each object
before creating it, making it safe to run against:
  - A DB where 003 fully worked   (all checks pass → no-op)
  - A DB where 003 partially ran  (missing pieces are added)
  - A fresh DB after 003 runs     (no-op)
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

revision = "004"
down_revision = "003b"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = :t AND COLUMN_NAME = :c"
        ),
        {"t": table, "c": column},
    )
    return result.fetchone() is not None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = :t"),
        {"t": table},
    )
    return result.fetchone() is not None


def _index_exists(index: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM sys.indexes WHERE name = :n"),
        {"n": index},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    # 1. Ensure defrost_hours column exists on InventoryItems
    if not _column_exists("InventoryItems", "defrost_hours"):
        op.add_column(
            "InventoryItems",
            sa.Column("defrost_hours", sa.Integer(), nullable=True),
        )

    # 2. Ensure Leftovers table exists
    if not _table_exists("Leftovers"):
        op.create_table(
            "Leftovers",
            sa.Column(
                "id",
                UNIQUEIDENTIFIER(),
                nullable=False,
                server_default=sa.text("NEWID()"),
            ),
            sa.Column("meal_slot_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("recipe_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("portions", sa.Integer(), nullable=False),
            sa.Column("storage_location", sa.String(20), nullable=False),
            sa.Column("expiry_date", sa.Date(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["meal_slot_id"], ["MealSlots.id"]),
            sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
            sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
            sa.CheckConstraint("portions > 0", name="ck_leftover_portions"),
        )

    # 3. Ensure StapleIngredients table exists
    if not _table_exists("StapleIngredients"):
        op.create_table(
            "StapleIngredients",
            sa.Column(
                "id",
                UNIQUEIDENTIFIER(),
                nullable=False,
                server_default=sa.text("NEWID()"),
            ),
            sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("min_threshold", sa.Float(), nullable=False),
            sa.Column("unit", sa.String(20), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
            sa.ForeignKeyConstraint(["ingredient_id"], ["Ingredients.id"]),
            sa.UniqueConstraint(
                "household_id",
                "ingredient_id",
                name="uq_staple_household_ingredient",
            ),
            sa.CheckConstraint("min_threshold > 0", name="ck_staple_threshold"),
        )

    # 4. Ensure indexes exist (created only if Leftovers/StapleIngredients existed
    #    from 003 but indexes were somehow missing, or tables just created above)
    if _table_exists("Leftovers"):
        if not _index_exists("ix_leftovers_household"):
            op.create_index("ix_leftovers_household", "Leftovers", ["household_id"])
        if not _index_exists("ix_leftovers_slot"):
            op.create_index("ix_leftovers_slot", "Leftovers", ["meal_slot_id"])

    if _table_exists("StapleIngredients"):
        if not _index_exists("ix_staple_household"):
            op.create_index("ix_staple_household", "StapleIngredients", ["household_id"])
        if not _index_exists("ix_staple_ingredient"):
            op.create_index("ix_staple_ingredient", "StapleIngredients", ["ingredient_id"])


def downgrade() -> None:
    # No-op: 004 is a repair migration. Objects owned by 003; let 003 downgrade handle them.
    pass
