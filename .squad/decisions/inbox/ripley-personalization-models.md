# Decision: Personalization Models Schema Design

**Date:** 2026-03-02  
**Decider:** Ripley (Backend Dev)  
**Status:** Implemented  
**Branch:** 003-personalization-ai

## Context

Phase 1 of the personalization AI feature required designing 3 new database models to store member preferences, recipe favorites, and meal ratings. The models needed to integrate cleanly with the existing 13-table schema while maintaining ACID guarantees and proper referential integrity.

## Decision

### Model Designs

1. **MemberPreference** (table: `MemberPreferences`)
   - Stores per-member dietary restrictions, allergies, dislikes, and likes
   - Key constraint: `UNIQUE(household_member_id, preference_type, value)` prevents duplicates
   - Optional `ingredient_id` FK for ingredient-level preferences (allergies/dislikes/likes)
   - Nullable `notes` field for additional context
   - Index on `household_member_id` for efficient member-scoped queries

2. **RecipeFavorite** (table: `RecipeFavorites`)
   - Household-scoped recipe favorite tracking (not per-member to simplify AI logic)
   - `UNIQUE(household_id, recipe_id)` ensures one favorite record per recipe per household
   - Only stores `created_at` (no updated_at) since favorites are binary on/off
   - Index on `household_id` for efficient household favorite lists

3. **MealSlotRating** (table: `MealSlotRatings`)
   - 1-5 star ratings with optional feedback on cooked meal slots
   - `CHECK(rating >= 1 AND rating <= 5)` enforces valid rating range at DB level
   - `UNIQUE(meal_slot_id, rated_by)` ensures one rating per member per slot
   - Index on `meal_slot_id` for efficient slot rating aggregations
   - Only stores `created_at` (ratings are immutable once submitted)

4. **Recipe.cuisine_type**
   - Nullable `String(50)` column added to existing Recipe model
   - Supports both predefined types (mexican, italian, etc.) and free-text
   - Nullable to avoid breaking existing recipes

### Key Design Choices

**Why household-scoped favorites instead of per-member?**
- Simplifies AI prompt construction (avoid conflicts between members' favorites)
- Aligns with meal planning being a household-level activity
- Reduces table size and join complexity

**Why immutable ratings (no updated_at, no UPDATE operations)?**
- Preserves historical feedback integrity for AI training
- Prevents rating manipulation
- Simpler API (POST to create, GET to read, no PUT/PATCH)

**Why CHECK constraint on rating instead of application-level validation?**
- Database enforces data integrity even if API validation bypassed
- Prevents invalid data from other entry points (admin tools, scripts)
- Self-documenting schema constraint

**Why batch_alter_table for cuisine_type column?**
- Alembic best practice for MSSQL to avoid table locking issues
- Consistent with existing migration patterns in the codebase

## Alternatives Considered

1. **Per-member favorites:** Rejected due to complexity in AI prompt (which favorites take precedence?). Household-level is clearer.

2. **Separate tables for each preference_type:** Rejected. Single table with discriminator column is more maintainable and avoids 4 separate CRUD endpoints.

3. **Mutable ratings (allow updates):** Rejected. Immutable ratings preserve feedback history and simplify API. If a user wants to change their rating, they can delete and re-rate.

4. **Enum for preference_type/cuisine_type:** Rejected. String columns with validation at API level provide more flexibility for future expansion without migrations.

## Consequences

### Positive

- Clean integration with existing schema (follows all established patterns)
- Efficient queries (proper indexes on FK columns)
- Data integrity enforced at DB level (CHECK, UNIQUE constraints)
- Forward-compatible (nullable cuisine_type, extensible preference_type values)
- Zero impact on existing functionality (all additive changes)

### Negative

- Household-scoped favorites means individual member preferences not captured (acceptable trade-off for MVP)
- Immutable ratings mean no way to correct mistakes (can delete and re-rate, adds friction)
- No audit trail for preference changes (could add later if needed)

### Neutral

- Migration 003 creates 3 new tables + 1 column (well within complexity budget)
- All models use TimestampMixin except RecipeFavorite/MealSlotRating (intentional, only need created_at)

## Verification

- ✅ All ruff lint checks pass
- ✅ All 74 API tests pass (no regressions)
- ✅ Migration follows existing patterns (UNIQUEIDENTIFIER PKs, PascalCase table names)
- ✅ Proper SQLAlchemy relationships with selectin eager loading
- ✅ TYPE_CHECKING imports for forward references

## Next Steps

- Phase 2: Implement Preferences API (CRUD endpoints + service layer)
- Phase 3: Implement Favorites API (toggle endpoint + list)
- Phase 4: Implement Ratings API (submit + get)
- Phase 5: Meal History API + cuisine preferences passthrough
- Phase 6: Worker prompt & validation extensions
