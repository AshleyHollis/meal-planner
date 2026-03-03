"""Add personalization tables and cuisine_type column.

Revision ID: 003
Revises: 002
Create Date: 2026-03-02
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

# revision identifiers
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create MemberPreferences table
    op.create_table(
        "MemberPreferences",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_member_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("preference_type", sa.String(30), nullable=False),
        sa.Column("value", sa.String(200), nullable=False),
        sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_member_id"], ["HouseholdMembers.id"]),
        sa.ForeignKeyConstraint(["ingredient_id"], ["Ingredients.id"]),
        sa.UniqueConstraint(
            "household_member_id", "preference_type", "value", name="uq_member_pref_type_value"
        ),
    )
    op.create_index("ix_member_prefs_member", "MemberPreferences", ["household_member_id"])

    # Create RecipeFavorites table
    op.create_table(
        "RecipeFavorites",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("recipe_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
        sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
        sa.UniqueConstraint("household_id", "recipe_id", name="uq_household_recipe"),
    )
    op.create_index("ix_recipe_favorites_household", "RecipeFavorites", ["household_id"])

    # Create MealSlotRatings table
    op.create_table(
        "MealSlotRatings",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("meal_slot_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("rated_by", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("feedback", sa.String(500), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["meal_slot_id"], ["MealSlots.id"]),
        sa.ForeignKeyConstraint(["rated_by"], ["HouseholdMembers.id"]),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
        sa.UniqueConstraint("meal_slot_id", "rated_by", name="uq_slot_rated_by"),
    )
    op.create_index("ix_meal_slot_ratings_slot", "MealSlotRatings", ["meal_slot_id"])

    # Add cuisine_type column to Recipes table using batch mode for MSSQL
    with op.batch_alter_table("Recipes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("cuisine_type", sa.String(50), nullable=True))


def downgrade() -> None:
    # Remove cuisine_type column from Recipes table using batch mode
    with op.batch_alter_table("Recipes", schema=None) as batch_op:
        batch_op.drop_column("cuisine_type")

    # Drop tables in reverse dependency order
    op.drop_table("MealSlotRatings")
    op.drop_table("RecipeFavorites")
    op.drop_table("MemberPreferences")
