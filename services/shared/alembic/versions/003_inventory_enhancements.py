"""Add inventory enhancement tables and columns.

Revision ID: 003
Revises: 002
Create Date: 2026-03-02
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add defrost_hours to InventoryItems
    op.add_column("InventoryItems", sa.Column("defrost_hours", sa.Integer(), nullable=True))

    # Leftovers table
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
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["meal_slot_id"], ["MealSlots.id"]),
        sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
        sa.CheckConstraint("portions > 0", name="ck_leftover_portions"),
    )
    op.create_index("ix_leftovers_household", "Leftovers", ["household_id"])
    op.create_index("ix_leftovers_slot", "Leftovers", ["meal_slot_id"])

    # StapleIngredients table
    op.create_table(
        "StapleIngredients",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("min_threshold", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
        sa.ForeignKeyConstraint(["ingredient_id"], ["Ingredients.id"]),
        sa.UniqueConstraint("household_id", "ingredient_id", name="uq_staple_household_ingredient"),
        sa.CheckConstraint("min_threshold > 0", name="ck_staple_threshold"),
    )
    op.create_index("ix_staple_household", "StapleIngredients", ["household_id"])
    op.create_index("ix_staple_ingredient", "StapleIngredients", ["ingredient_id"])


def downgrade() -> None:
    op.drop_table("StapleIngredients")
    op.drop_table("Leftovers")
    op.drop_column("InventoryItems", "defrost_hours")
