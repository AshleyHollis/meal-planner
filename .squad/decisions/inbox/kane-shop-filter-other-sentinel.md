# Decision: Shop Filter Uses `__other__` Sentinel for Unassigned Items

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-04  
**Status:** Implemented  

## Context

The ShopFilter component needs to handle grocery items that have no product linked (or have a product with no shop). These can't map to a real shop name.

## Decision

Use the string sentinel `"__other__"` as the `selectedShop` value when the "Other" tab is active. `filterByShop()` in GroceryList treats this value specially: it filters for items where `!item.product?.shop`.

## Rationale

- Avoids a separate boolean flag or discriminated union for "Other" state
- Keeps `selectedShop: string | null` simple (null = All, string = shop name or sentinel)
- TripTracker is not shown when `selectedShop === "__other__"` (no meaningful trip tracking for unassigned items)

## Scope

Frontend only. No API or backend impact. Components: ShopFilter.tsx, GroceryList.tsx.
