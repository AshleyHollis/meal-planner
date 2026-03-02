"""Initial schema migration for 13 tables.

Revision ID: 001
Revises:
Create Date: 2026-02-28
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

# revision identifiers
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Tier 1: No foreign keys ---

    op.create_table(
        "Households",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("default_servings", sa.Integer(), nullable=False, server_default="2"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "Ingredients",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("default_unit", sa.String(10), nullable=False),
        sa.Column("default_storage", sa.String(20), nullable=False),
        sa.Column("typical_shelf_life_days", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_ingredients_name", "Ingredients", ["name"])
    op.create_index("ix_ingredients_category", "Ingredients", ["category"])

    # --- Tier 2: FK to Households and/or Ingredients ---

    op.create_table(
        "HouseholdMembers",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("auth0_user_id", sa.String(100), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="owner"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
        sa.UniqueConstraint("auth0_user_id"),
    )
    op.create_index("ix_members_auth0", "HouseholdMembers", ["auth0_user_id"])
    op.create_index("ix_members_household", "HouseholdMembers", ["household_id"])

    op.create_table(
        "InventoryItems",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(10), nullable=False),
        sa.Column("location", sa.String(20), nullable=False),
        sa.Column("expiry_date", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
        sa.ForeignKeyConstraint(["ingredient_id"], ["Ingredients.id"]),
        sa.CheckConstraint("quantity >= 0", name="ck_inventory_qty"),
    )
    op.create_index("ix_inventory_household", "InventoryItems", ["household_id"])
    op.create_index("ix_inventory_ingredient", "InventoryItems", ["ingredient_id"])
    op.create_index("ix_inventory_expiry", "InventoryItems", ["expiry_date"])

    op.create_table(
        "Equipment",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
    )
    op.create_index("ix_equipment_household", "Equipment", ["household_id"])

    # --- Tier 3: FK to Equipment ---

    op.create_table(
        "EquipmentModes",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("equipment_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("min_temp", sa.Float(), nullable=True),
        sa.Column("max_temp", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["equipment_id"], ["Equipment.id"]),
    )
    op.create_index("ix_modes_equipment", "EquipmentModes", ["equipment_id"])

    # --- Tier 4: FK to Households (nullable), self-referencing ---

    op.create_table(
        "Recipes",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("servings", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("prep_time_min", sa.Integer(), nullable=True),
        sa.Column("cook_time_min", sa.Integer(), nullable=True),
        sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("source_recipe_id", UNIQUEIDENTIFIER(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
        sa.ForeignKeyConstraint(["source_recipe_id"], ["Recipes.id"]),
    )
    op.create_index("ix_recipes_household", "Recipes", ["household_id"])

    # --- Tier 5: FK to Recipes, Ingredients, EquipmentModes ---

    op.create_table(
        "RecipeIngredients",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("recipe_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("is_optional", sa.Boolean(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
        sa.ForeignKeyConstraint(["ingredient_id"], ["Ingredients.id"]),
    )
    op.create_index("ix_recipe_ingredients_recipe", "RecipeIngredients", ["recipe_id"])
    op.create_index("ix_recipe_ingredients_ingredient", "RecipeIngredients", ["ingredient_id"])

    op.create_table(
        "RecipeSteps",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("recipe_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("equipment_mode_id", UNIQUEIDENTIFIER(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("duration_min", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
        sa.ForeignKeyConstraint(["equipment_mode_id"], ["EquipmentModes.id"]),
    )
    op.create_index("ix_recipe_steps_recipe", "RecipeSteps", ["recipe_id"])

    # --- Tier 6: FK to Households ---

    op.create_table(
        "MealPlans",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("household_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("week_start_date", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("error_message", sa.String(1000), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["Households.id"]),
    )
    op.create_index("ix_meal_plans_household", "MealPlans", ["household_id"])

    # --- Tier 7: FK to MealPlans, Recipes ---

    op.create_table(
        "MealSlots",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("meal_plan_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("recipe_id", UNIQUEIDENTIFIER(), nullable=True),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("meal_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="planned"),
        sa.Column("cooked_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["meal_plan_id"], ["MealPlans.id"]),
        sa.ForeignKeyConstraint(["recipe_id"], ["Recipes.id"]),
        sa.UniqueConstraint("meal_plan_id", "day", "meal_type", name="uq_slot_plan_day_type"),
    )
    op.create_index("ix_slots_plan", "MealSlots", ["meal_plan_id"])

    # --- Tier 8: FK to MealPlans ---

    op.create_table(
        "GroceryLists",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("meal_plan_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["meal_plan_id"], ["MealPlans.id"]),
        sa.UniqueConstraint("meal_plan_id"),
    )

    # --- Tier 9: FK to GroceryLists, Ingredients ---

    op.create_table(
        "GroceryItems",
        sa.Column("id", UNIQUEIDENTIFIER(), nullable=False, server_default=sa.text("NEWID()")),
        sa.Column("grocery_list_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("ingredient_id", UNIQUEIDENTIFIER(), nullable=False),
        sa.Column("quantity_needed", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit", sa.String(10), nullable=False),
        sa.Column("is_checked", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("preferred_store", sa.String(200), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSUTCDATETIME()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["grocery_list_id"], ["GroceryLists.id"]),
        sa.ForeignKeyConstraint(["ingredient_id"], ["Ingredients.id"]),
    )
    op.create_index("ix_grocery_items_list", "GroceryItems", ["grocery_list_id"])
    op.create_index("ix_grocery_items_ingredient", "GroceryItems", ["ingredient_id"])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table("GroceryItems")
    op.drop_table("GroceryLists")
    op.drop_table("MealSlots")
    op.drop_table("MealPlans")
    op.drop_table("RecipeSteps")
    op.drop_table("RecipeIngredients")
    op.drop_table("Recipes")
    op.drop_table("EquipmentModes")
    op.drop_table("Equipment")
    op.drop_table("InventoryItems")
    op.drop_table("HouseholdMembers")
    op.drop_table("Ingredients")
    op.drop_table("Households")
