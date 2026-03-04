# Decision: Grocery totals, meal plan filtering, and stats endpoint

**Date:** 2026-03-04  
**Author:** Ripley  
**Branch:** 005-grocery-enhancements

## What was added

### 1. GET /api/v1/meal-plans — filtering and sorting

- New query params: `status` (optional), `sort` (created_at|week_start_date), `order` (asc|desc)
- Defaults preserved: sort=created_at, order=desc — existing callers unaffected.

### 2. GET /api/v1/meal-plans/stats

- New endpoint returning `MealPlanStatsResponse`:
  - `plans_by_status: dict[str, int]` — count per status value
  - `total_meals_cooked: int` — all cooked MealSlots across all plans
  - `items_expiring_soon: int` — InventoryItems with expiry_date ≤ now + 7 days
- Lightweight: 3 aggregate queries, no JOINs beyond MealSlot→MealPlan.

### 3. GroceryListResponse — total_price and store_totals

- `total_price: float | None` — sum of product prices for all items with a mapped product. `None` (not 0.0) when no products have prices.
- `store_totals: dict[str, float]` — per-store breakdown. Uses "Other" for products with no shop set.
- Prices are the flat product price (not quantity × price) — represents the purchase cost of each product mapping.

## Frontend impact

- Kane: `GET /api/v1/meal-plans` response is unchanged for existing callers (query params are additive).
- `total_price` and `store_totals` are new fields on GroceryListResponse — safe to add to grocery UI.
- `/stats` is a new endpoint — can be used on the dashboard to populate the "Meals This Week" and "Items Expiring" stats cards.
