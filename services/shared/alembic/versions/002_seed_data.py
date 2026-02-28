"""Seed data migration for ingredients.

Revision ID: 002
Revises: 001
Create Date: 2026-02-28
"""

import sys
from pathlib import Path

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

# Ensure seed package is importable when alembic runs
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from seed.common_ingredients import SEED_INGREDIENTS  # noqa: E402

# revision identifiers
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None

# Table reference for bulk_insert
ingredients_table = sa.table(
    "Ingredients",
    sa.column("name", sa.String),
    sa.column("category", sa.String),
    sa.column("default_unit", sa.String),
    sa.column("default_storage", sa.String),
    sa.column("typical_shelf_life_days", sa.Integer),
)


def upgrade() -> None:
    op.bulk_insert(ingredients_table, SEED_INGREDIENTS)


def downgrade() -> None:
    for ingredient in SEED_INGREDIENTS:
        op.execute(
            sa.text("DELETE FROM [Ingredients] WHERE [name] = :name").bindparams(
                name=ingredient["name"]
            )
        )
