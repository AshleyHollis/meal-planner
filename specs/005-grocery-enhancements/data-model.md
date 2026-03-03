# Data Model: Grocery Enhancements

**Feature**: `005-grocery-enhancements`
**Date**: 2026-03-03

## New Entities

### Product

Maps an ingredient to a specific purchasable item for a household.

| Field         | Type         | Required | Constraints                     |
| ------------- | ------------ | -------- | ------------------------------- |
| id            | UUID         | Yes      | Primary key, auto-generated     |
| household_id  | UUID         | Yes      | FK → Household, indexed         |
| ingredient_id | UUID         | Yes      | FK → Ingredient, indexed        |
| brand         | String(200)  | Yes      | Brand name                      |
| product_name  | String(300)  | Yes      | Specific product name           |
| size_desc     | String(100)  | No       | Package size, e.g. "2.5 lb bag" |
| price         | Decimal(8,2) | No       | User-entered price              |
| shop          | String(200)  | No       | Store name                      |
| notes         | String(500)  | No       | Optional notes                  |
| created_at    | DateTime     | Yes      | Auto-generated                  |
| updated_at    | DateTime     | Yes      | Auto-updated                    |

**Uniqueness**: One product per ingredient per household (`household_id, ingredient_id`).

**Relationships**:

- Product → Household (many-to-one)
- Product → Ingredient (many-to-one)

## Modified Entities

### GroceryItemResponse (API response only — no DB change)

Extended with joined data:

| New Field           | Type            | Source                                                |
| ------------------- | --------------- | ----------------------------------------------------- |
| ingredient_name     | String          | Join: GroceryItem.ingredient_id → Ingredient.name     |
| ingredient_category | String          | Join: GroceryItem.ingredient_id → Ingredient.category |
| product             | ProductSummary? | Join: ingredient_id → Product (same household)        |

### ProductSummary (embedded object)

| Field        | Type     |
| ------------ | -------- |
| id           | UUID     |
| brand        | String   |
| product_name | String   |
| size_desc    | String?  |
| price        | Decimal? |
| shop         | String?  |

## Client-Side State (no DB table)

### TripState (localStorage)

| Field          | Type     | Description                    |
| -------------- | -------- | ------------------------------ |
| groceryListId  | String   | Which grocery list this is for |
| shop           | String   | Which shop this trip is for    |
| checkedItemIds | String[] | Item IDs checked off this trip |
| startedAt      | String   | When trip was started          |

**Key**: `shopping-trip-{groceryListId}-{shopNormalized}`
**Lifecycle**: Created on first check in a shop view. Cleared when grocery list changes.

## Entity Relationship Summary

```
Household ─1───N─ Product ─N───1─ Ingredient
                                      │
GroceryList ─1───N─ GroceryItem ─N───1┘
     │
MealPlan ─1───1┘
```

Product enriches GroceryItem at query time via shared Ingredient FK (no direct FK between Product and GroceryItem).
