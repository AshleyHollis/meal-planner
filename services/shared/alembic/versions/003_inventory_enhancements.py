"""Add inventory enhancement tables and columns.

Revision ID: 003
Revises: 002
Create Date: 2026-03-02

This migration is IDEMPOTENT. It checks for the existence of each object
before creating it, making it safe to run multiple times.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = :t"),
        {"t": table},
    )
    return result.fetchone() is not None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = :t AND COLUMN_NAME = :c"
        ),
        {"t": table, "c": column},
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
    # Add defrost_hours to InventoryItems
    if not _column_exists("InventoryItems", "defrost_hours"):
        op.add_column("InventoryItems", sa.Column("defrost_hours", sa.Integer(), nullable=True))

    # Leftovers table
    if not _table_exists("Leftovers"):
        op.create_table(
            "Leftovers",
            sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
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
    if not _index_exists("ix_leftovers_household"):
        op.create_index("ix_leftovers_household", "Leftovers", ["household_id"])
    if not _index_exists("ix_leftovers_slot"):
        op.create_index("ix_leftovers_slot", "Leftovers", ["meal_slot_id"])

    # StapleIngredients table
    if not _table_exists("StapleIngredients"):
        op.create_table(
            "StapleIngredients",
            sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
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
                "household_id", "ingredient_id", name="uq_staple_household_ingredient"
            ),
            sa.CheckConstraint("min_threshold > 0", name="ck_staple_threshold"),
        )
    if not _index_exists("ix_staple_household"):
        op.create_index("ix_staple_household", "StapleIngredients", ["household_id"])
    if not _index_exists("ix_staple_ingredient"):
        op.create_index("ix_staple_ingredient", "StapleIngredients", ["ingredient_id"])


def downgrade() -> None:
    if _table_exists("StapleIngredients"):
        op.drop_table("StapleIngredients")
    if _table_exists("Leftovers"):
        op.drop_table("Leftovers")
    if _column_exists("InventoryItems", "defrost_hours"):
        op.drop_column("InventoryItems", "defrost_hours")
