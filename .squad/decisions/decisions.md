# Decisions — Meal Planner

> The canonical decision log. Merged from `.squad/decisions/inbox/`, edited for clarity and deduplication.

## Decision 1: E2E Test Debugging — CORS and Meal Plan

**Author:** Dallas  
**Date:** 2026-03-02  
**Status:** Decided

### CORS Issue Root Cause

The CORS failures were caused by a `nullslast()` 500 error — an unhandled exception in the recipe service. Starlette's `ServerErrorMiddleware` catches exceptions _outside_ the CORS middleware chain, returning bare 500 responses without `Access-Control-Allow-Origin` headers. Result: looks like CORS misconfiguration, but it's actually an app error. No defensive CORS config changes needed — the regex matches correctly.

### Meal Plan Generation Tests

Worker requires Azure OpenAI to generate meals, not available in preview. Tests skip gracefully. Accepted for MVP. Follow-up: test seeding endpoint post-MVP.

### Key Insight

When debugging CORS in Starlette/FastAPI, check if the underlying request returns a successful response first. If a 500 bypasses error handlers, it also bypasses CORSMiddleware.

---

## Decision 2: pre-commit.ci Filetype Identification

**Author:** Dallas  
**Date:** 2026-03-02  
**Status:** Decided

The `identify` library uses `ts` (not `typescript`) as the type tag for TypeScript files. Fix already committed (`ec2626f`).

---

## Decision 3: Frontend Error Message Pattern

**Author:** Ripley (Frontend Lead)  
**Date:** 2026-03-03  
**Status:** Decided

Frontend error display now shows actual API error details (e.g., "Household already has an active or in-progress meal plan") instead of generic "Failed to generate meal plan". Pattern: parse API error response, extract message, display to user. Apply to all frontend API interactions.

Committed: `5ed1955`

---

## Decision 4: 003-Personalization-AI Spec Architecture

**Author:** Dallas  
**Date:** 2026-03-02  
**Status:** Decided

### MemberPreference as Single Polymorphic Model

One `MemberPreference` table with a `type` discriminator (allergy/dislike/like/dietary_restriction) instead of 4 separate tables. Keeps schema simple and CRUD unified.

### Ratings on MealSlot, Not Recipe

Same recipe rated differently in different contexts. Context-specific feedback is more useful for AI tuning.

### Allergy vs. Dislike

Allergies are hard blocks (never relax), dislikes are soft (can be relaxed). Critical for safety — explicitly separated in AI prompt handling.

### History from Existing Data

No new history model needed. Cooked meals already have timestamps. Only new model: `RecipeFavorite` (boolean existence).

### Cuisine Preferences Per-Plan

Per-plan, not persistent. Each generation starts fresh, avoids stale preferences.

### Conflict Resolution Order

1. Relax history constraints first
2. Relax dislikes next
3. Never relax allergies

---

## Decision 5: 004-Planning-Enhancements Spec Architecture

**Author:** Dallas  
**Date:** 2026-03-03  
**Status:** Decided

### Only One New DB Model — RecurringMealTemplate

The only new table required is `RecurringMealTemplates` (US4). The other three features leverage existing schema:

- **US1 (Substitution)**: Uses existing `Recipe.source_recipe_id` for lineage — substituted recipes are new Recipe rows linked to originals.
- **US2 (Quick Suggestions)**: No persistence — synchronous LLM call, results are ephemeral.
- **US3 (Multi-Meal)**: `MealSlot.meal_type` is already `String(20)` with a unique constraint on `(meal_plan_id, day, meal_type)`. The schema supports breakfast/lunch/dinner out of the box — only the worker hardcodes "dinner".

This keeps the DB impact minimal (16 → 17 tables).

### Substitution Uses Synchronous LLM Call (Not Queue)

Ingredient substitution follows the `adapt_recipe()` pattern in `meal_plan_service.py` — a synchronous, direct LLM call rather than the queued async pattern used for full plan generation. Rationale: substitution is a single-recipe operation that should return in <10 seconds, vs. plan generation which takes 30-60s and uses the queue.

### Quick Suggestions Are Stateless

"What can I make right now?" does not create a MealPlan or MealSlots. It's a read-only suggestion endpoint that makes a synchronous LLM call. If the user likes a suggestion and taps "Cook This", only then does a standalone meal slot get created for tracking. This avoids polluting the plan history with exploratory queries.

### Multi-Meal Backward Compatibility via Default

`meal_types` defaults to `["dinner"]` when not specified, preserving 100% backward compatibility. The worker prompt is parameterized — "Generate a 7-day {meal_types_description} plan" — so dinner-only plans are unchanged. The weekly plan view detects single vs. multi meal type and renders accordingly.

### Recurring Templates Use Day+MealType Uniqueness

One template per (household, day, meal_type) — you can't have two different recurring Tuesday dinners. Templates can reference either a specific `recipe_id` (pre-fill exact recipe) or just a `recipe_title` string (hint for AI generation). This dual mode handles both "always make Chicken Tacos on Tuesday" and "something Mexican on Tuesday" use cases.

### Migration Numbering

Next migration is `005_planning_enhancements.py`. The existing migrations are 001-004.

### Impact

- **New models**: 1 (RecurringMealTemplate)
- **New endpoints**: 6 (substitution, quick-suggestions, 4× recurring CRUD)
- **Modified endpoints**: 1 (createMealPlan — accepts meal_types)
- **Worker changes**: Prompt extensions, generator multi-meal logic, recurring pre-fill
- **Frontend**: 4 new components, 2 new pages, 2 modified components
- **Total tasks**: 68 + 26 verification checkpoints = 94 items

### Schema Notes

- `services/shared/shared/db/models/meal_plan.py` — MealSlot already has meal_type:String(20) with uq_slot_plan_day_type constraint
- `services/shared/shared/db/models/recipe.py` — Recipe already has source_recipe_id for lineage
- `services/workers/meal_plan_generator/generator.py:461` — Slot creation hardcodes meal_type="dinner"
- `services/api/src/api/services/meal_plan_service.py` — \_call_llm() pattern for synchronous LLM calls
- `services/workers/meal_plan_generator/prompts.py` — build_prompt() already accepts personalization kwargs

---

## Decision 6: UX Depth Review & Prioritized Frontend Enhancements

**Author:** Dallas (Lead)  
**Date:** 2026-03-04  
**Status:** Decided

### Feature Completeness (Spec 005 Acceptance Scenarios)

**12/14 PASS**, 1 PARTIAL, 1 FAIL:

- **PASS**: Product mapping display, unmapped item fallback, inline linking, auto-apply, product search grouping, edit/delete functionality
- **PARTIAL**: Shop-filtered trips complete but do NOT prompt to add to inventory (gap in CompleteShoppingDialog integration)
- **FAIL**: Trip state not clearing on new list generation — `isNewList()` check never invoked

### Critical UX Gaps (vs. Industry Standards)

1. **No entity detail pages** — Everything is a list. Recipes/products/inventory items are not clickable or navigable.
2. **Images only on MealSlots** — Product and inventory lists are pure text. Recipes not viewable outside inline-expand.
3. **Bug in CompleteShoppingDialog** — Displays `ingredient_id` (UUID) instead of `ingredient_name`.
4. **No grocery cost total** — Prices exist per-product but sum never shown.
5. **No recipe source URL** — AI recipes have no attribution or external link.

### Top 10 Prioritized Improvements

| Rank   | Improvement                                            | Impact      | Effort  | Owner         |
| ------ | ------------------------------------------------------ | ----------- | ------- | ------------- |
| **1**  | Recipe detail page (`/meal-plan/[id]/recipe/[slotId]`) | 🔴 Critical | Medium  | Kane          |
| **2**  | Product detail page (`/products/[id]`)                 | 🔴 Critical | Low     | Kane          |
| **3**  | Fix CompleteShoppingDialog UUID display                | 🔴 Bug      | Trivial | Kane          |
| **4**  | Grocery list cost total                                | 🟠 High     | Low     | Kane          |
| **5**  | Inventory detail page (`/inventory/[id]`)              | 🟠 High     | Low     | Kane          |
| **6**  | Fix trip state reset on new list                       | 🟠 High     | Trivial | Kane          |
| **7**  | Trip completion → inventory add                        | 🟠 High     | Low     | Kane          |
| **8**  | Recipe source URL field (backend + frontend)           | 🟡 Medium   | Low     | Ripley + Kane |
| **9**  | Inventory search/filter                                | 🟡 Medium   | Low     | Kane          |
| **10** | Grocery list print/share                               | 🟡 Medium   | Low     | Kane          |

### Backend Additions (Ripley)

- Add `source_url` field to Recipe model
- Add `image_url` field to Product model
- Add `GET /api/v1/products/{product_id}` endpoint
- Add `GET /api/v1/inventory/{item_id}` endpoint (if missing)
- Consider `GET /api/v1/recipes/{recipe_id}` public endpoint

### Frontend Implementation Guide (Kane)

**Immediate fixes:**

- `CompleteShoppingDialog.tsx:81` — show `ingredient_name` not `ingredient_id`
- `grocery-list/[id]/page.tsx` — add cost total calculation and display
- `GroceryList.tsx` — call `clearTripsForList()` when list changes

**New pages:**

- `/meal-plan/[id]/recipe/[slotId]/page.tsx` — full recipe detail with ingredients, steps, hero image, favorite button, source URL link
- `/products/[id]/page.tsx` — product detail with price, shop, linked ingredient, edit/delete
- `/inventory/[id]/page.tsx` — inventory item detail with expiry countdown, related recipes

**Clickable links:**

- MealSlotCard recipe title → recipe detail page
- Product rows in products/page.tsx → product detail
- Inventory items in InventoryList → inventory detail

### Summary

App has solid architecture but lacks **depth** — the skeleton is right, needs flesh. Top 3 fixes (recipe detail, product detail, UUID fix) would transform user experience from "functional prototype" to "usable app".
