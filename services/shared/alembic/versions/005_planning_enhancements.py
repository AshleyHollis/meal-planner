"""Add RecurringMealTemplates table for planning enhancements.

Revision ID: 005
Revises: 004
Create Date: 2026-03-10

This migration is IDEMPOTENT. It checks for the existence of each object
before creating it, making it safe to run multiple times.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

revision = "005"
down_revision = "004"
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
    if not _table_exists("RecurringMealTemplates"):
        op.create_table(
            "RecurringMealTemplates",
            sa.Column(
                "id",
                UNIQUEIDENTIFIER(),
                nullable=False,
                server_default=sa.text("NEWID()"),
            ),
            sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("day", sa.Integer(), nullable=False),
            sa.Column("meal_type", sa.String(20), nullable=False),
            sa.Column("recipe_id", UNIQUEIDENTIFIER(), nullable=True),
            sa.Column("recipe_title", sa.String(300), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
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
            sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
            sa.CheckConstraint("day >= 0 AND day <= 6", name="ck_recurring_day_range"),
            sa.UniqueConstraint(
                "household_id",
                "day",
                "meal_type",
                name="uq_recurring_household_day_type",
            ),
        )

    if _table_exists("RecurringMealTemplates") and not _index_exists(
        "ix_recurring_templates_household"
    ):
        op.create_index(
            "ix_recurring_templates_household",
            "RecurringMealTemplates",
            ["household_id"],
        )


def downgrade() -> None:
    if _table_exists("RecurringMealTemplates"):
        if _index_exists("ix_recurring_templates_household"):
            op.drop_index("ix_recurring_templates_household", table_name="RecurringMealTemplates")
        op.drop_table("RecurringMealTemplates")
