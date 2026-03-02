# Decision: Personalization Spec Architecture

**Author:** Dallas (Lead)  
**Date:** 2026-03-02  
**Status:** Decided  
**Spec:** `specs/003-personalization-ai/spec.md`

## Summary

Created the feature specification for 003-personalization-ai covering 4 user stories mapped to backlog items P6, P7, P17, P22.

## Key Decisions

### 1. Single Polymorphic MemberPreference Model

**Decision:** One `MemberPreference` table with a `type` column (allergy, dislike, like, dietary_restriction) rather than 4 separate tables.

**Rationale:** Unified CRUD API, simpler migrations, single query to load all preferences for a member. The type discriminator keeps semantics clear while the AI prompt builder handles each type differently.

### 2. Ratings Stored Per MealSlot, Not Per Recipe

**Decision:** `MealSlotRating` links to MealSlot + HouseholdMember, not to Recipe directly.

**Rationale:** The same recipe cooked in different contexts (different week, different sides) may get different ratings. MealSlot-level ratings capture "how was this specific cooking occasion" which is richer signal for the AI. Recipe-level aggregates are computed at query time.

### 3. Allergy = Hard Block, Dislike = Soft Preference

**Decision:** Allergies are never relaxed, even when constraints over-eliminate recipes. Dislikes can be relaxed as a fallback.

**Rationale:** Safety. An allergen violation is a health risk. A disliked ingredient is an inconvenience. The AI prompt explicitly separates these: "NEVER include: [allergies]" vs. "AVOID when possible: [dislikes]".

### 4. Meal History Derived from Existing MealSlot Data

**Decision:** No new history model. History is a query over MealSlot(status=cooked, cooked_at). Only new model for US2 is RecipeFavorite.

**Rationale:** MealSlot already tracks cooked_at and status. Adding a redundant history table would create sync issues. Favorites need a new model because "favorite" is a persistent household preference, not a transient cooking event.

### 5. Cuisine Preferences Are Per-Plan, Not Persistent

**Decision:** Cuisine selections are passed as request parameters when generating a plan. They are not stored as user preferences.

**Rationale:** Cuisine cravings are ephemeral — "I want Mexican this week" doesn't mean every week. Persistent cuisine preferences would go stale and require cleanup UX. Per-plan is simpler and matches user intent.

### 6. Constraint Relaxation Order

**Decision:** When preferences + history + ratings over-constrain the recipe space, relax in this order: (1) shorten history lookback, (2) allow disliked ingredients, (3) never relax allergies.

**Rationale:** History repetition is least harmful to violate. Dislikes are annoying but safe. Allergies are dangerous. This gives the AI a graceful degradation path.

## Impact

- 3 new database models: MemberPreference, RecipeFavorite, MealSlotRating
- 1 new column on Recipe: cuisine_type
- 1 new column on MealPlan (or generation request): cuisine preferences
- AI prompt builder must be extended to include preferences, history, ratings, cuisine
- 22 functional requirements, 8 success criteria
