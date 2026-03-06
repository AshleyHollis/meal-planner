"""Create Products table for household ingredient-to-product mappings.

Revision ID: 005
Revises: 004
Create Date: 2026-03-03

This migration is IDEMPOTENT. It checks for the existence of each object
before creating it, making it safe to run against databases at any state.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


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
    if not _table_exists("Products"):
        op.create_table(
            "Products",
            sa.Column(
                "id",
                UNIQUEIDENTIFIER(),
                nullable=False,
                server_default=sa.text("NEWID()"),
            ),
            sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("brand", sa.String(200), nullable=False),
            sa.Column("product_name", sa.String(300), nullable=False),
            sa.Column("size_desc", sa.String(100), nullable=True),
            sa.Column("price", sa.Numeric(8, 2), nullable=True),
            sa.Column("shop", sa.String(200), nullable=True),
            sa.Column("notes", sa.String(500), nullable=True),
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
                name="uq_product_household_ingredient",
            ),
        )

    if _table_exists("Products"):
        if not _index_exists("ix_products_household"):
            op.create_index("ix_products_household", "Products", ["household_id"])
        if not _index_exists("ix_products_ingredient"):
            op.create_index("ix_products_ingredient", "Products", ["ingredient_id"])


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS Products"))
