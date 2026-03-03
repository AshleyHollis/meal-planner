"""Add inventory and personalization tables.

Revision ID: 003
Revises: 002
Create Date: 2026-03-02

This migration is IDEMPOTENT. It checks for the existence of each object
before creating it, making it safe to run against databases at any state.

Merges the previously-split 003_inventory_enhancements and 003_personalization
into a single migration to fix duplicate-revision-ID errors on fresh databases.
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
    # --- Inventory enhancements ---

    if not _column_exists("InventoryItems", "defrost_hours"):
        op.add_column("InventoryItems", sa.Column("defrost_hours", sa.Integer(), nullable=True))

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

    if _table_exists("Leftovers"):
        if not _index_exists("ix_leftovers_household"):
            op.create_index("ix_leftovers_household", "Leftovers", ["household_id"])
        if not _index_exists("ix_leftovers_slot"):
            op.create_index("ix_leftovers_slot", "Leftovers", ["meal_slot_id"])

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

    if _table_exists("StapleIngredients"):
        if not _index_exists("ix_staple_household"):
            op.create_index("ix_staple_household", "StapleIngredients", ["household_id"])
        if not _index_exists("ix_staple_ingredient"):
            op.create_index("ix_staple_ingredient", "StapleIngredients", ["ingredient_id"])

    # --- Personalization tables ---

    if not _table_exists("MemberPreferences"):
        op.create_table(
            "MemberPreferences",
            sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
            sa.Column("household_member_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("preference_type", sa.String(30), nullable=False),
            sa.Column("value", sa.String(200), nullable=False),
            sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=True),
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
            sa.ForeignKeyConstraint(["household_member_id"], ["HouseholdMembers.id"]),
            sa.ForeignKeyConstraint(["ingredient_id"], ["Ingredients.id"]),
            sa.UniqueConstraint(
                "household_member_id", "preference_type", "value", name="uq_member_pref_type_value"
            ),
        )

    if _table_exists("MemberPreferences"):
        if not _index_exists("ix_member_prefs_member"):
            op.create_index("ix_member_prefs_member", "MemberPreferences", ["household_member_id"])

    if not _table_exists("RecipeFavorites"):
        op.create_table(
            "RecipeFavorites",
            sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
            sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("recipe_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
            sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
            sa.UniqueConstraint("household_id", "recipe_id", name="uq_household_recipe"),
        )

    if _table_exists("RecipeFavorites"):
        if not _index_exists("ix_recipe_favorites_household"):
            op.create_index("ix_recipe_favorites_household", "RecipeFavorites", ["household_id"])

    if not _table_exists("MealSlotRatings"):
        op.create_table(
            "MealSlotRatings",
            sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
            sa.Column("meal_slot_id", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("rated_by", UNIQUEIDENTIFIER(), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("feedback", sa.String(500), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["meal_slot_id"], ["MealSlots.id"]),
            sa.ForeignKeyConstraint(["rated_by"], ["HouseholdMembers.id"]),
            sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
            sa.UniqueConstraint("meal_slot_id", "rated_by", name="uq_slot_rated_by"),
        )

    if _table_exists("MealSlotRatings"):
        if not _index_exists("ix_meal_slot_ratings_slot"):
            op.create_index("ix_meal_slot_ratings_slot", "MealSlotRatings", ["meal_slot_id"])

    if not _column_exists("Recipes", "cuisine_type"):
        with op.batch_alter_table("Recipes", schema=None) as batch_op:
            batch_op.add_column(sa.Column("cuisine_type", sa.String(50), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "IF COL_LENGTH('Recipes','cuisine_type') IS NOT NULL ALTER TABLE Recipes DROP COLUMN cuisine_type"
        )
    )
    conn.execute(sa.text("DROP TABLE IF EXISTS MealSlotRatings"))
    conn.execute(sa.text("DROP TABLE IF EXISTS RecipeFavorites"))
    conn.execute(sa.text("DROP TABLE IF EXISTS MemberPreferences"))
    conn.execute(sa.text("DROP TABLE IF EXISTS StapleIngredients"))
    conn.execute(sa.text("DROP TABLE IF EXISTS Leftovers"))
    conn.execute(
        sa.text(
            "IF COL_LENGTH('InventoryItems','defrost_hours') IS NOT NULL ALTER TABLE InventoryItems DROP COLUMN defrost_hours"
        )
    )
