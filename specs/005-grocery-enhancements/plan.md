# Implementation Plan: Grocery Enhancements

**Branch**: `005-grocery-enhancements` | **Date**: 2026-03-03 | **Spec**: `specs/005-grocery-enhancements/spec.md`
**Input**: Feature specification from `/specs/005-grocery-enhancements/spec.md`

## Summary

Enhance the grocery list system with two capabilities: (1) Product mapping — link ingredients to specific products with brand, size, price, and preferred shop so grocery lists show actionable shopping details instead of raw ingredient names; (2) Shop-filtered trips — filter the grocery list by shop for per-store shopping with per-trip check-off tracking that's independent of the global checked state. Implementation adds 1 new DB table, 5 new API endpoints, extends the grocery list response, and adds client-side trip state management via localStorage.

## Technical Context

**Language/Version**: Python 3.12 (backend/workers), TypeScript 5 (frontend)
**Primary Dependencies**: FastAPI + SQLAlchemy 2.0 async + Pydantic v2 (API), Next.js 16 + React 19 + Tailwind CSS 4 (web)
**Storage**: Azure SQL (prod) / SQL Server 2025 (local), Alembic migrations
**Testing**: pytest (API), Vitest (frontend), Playwright (E2E)
**Target Platform**: Azure cloud (prod), .NET Aspire local dev orchestrator
**Project Type**: Full-stack web application (API + worker + SPA)
**Performance Goals**: Product CRUD <200ms p95; shop filtering <1s; product library loads 200 products in <1s
**Constraints**: Zero regressions on existing grocery list behavior; product mappings persist across meal plans; trip state is per-device/session
**Scale/Scope**: Household-scoped; 1 new table, 5 new endpoints, extended grocery response, client-side trip state, 2 new frontend components, 1 new page

## Constitution Check

_GATE: Passes._

This feature adds 1 new model (Product) — well within complexity norms established by the existing 16-table schema. The Product model follows existing patterns (UNIQUEIDENTIFIER PK, TimestampMixin, household scoping). Shopping trip state is client-side (localStorage), avoiding unnecessary server-side complexity — consistent with Principle VI (Simplicity & YAGNI). No new infrastructure dependencies. No new service boundaries. Worker changes are minimal (apply product mapping to existing grocery generation). Frontend changes add components within the existing app router structure. All existing patterns followed.

**Constitution compliance:**

- **I. Shared Infrastructure**: ✅ No infrastructure changes needed
- **II. Test-First Development**: ✅ Tests planned for all new endpoints and components
- **III. Observability**: ✅ New endpoints will use existing structlog + OTel instrumentation
- **IV. Secret-Zero Trust**: ✅ No new secrets
- **V. Code Quality Gates**: ✅ Ruff, ESLint, type checking planned at each phase
- **VI. Simplicity & YAGNI**: ✅ Client-side trip state avoids unnecessary DB tables; one product mapping per ingredient per household (no multi-mapping complexity)

## New Model Design

### Product (new table: `Products`)

| Column          | Type                      | Constraints                                  |
| --------------- | ------------------------- | -------------------------------------------- |
| `id`            | `UUID` (UNIQUEIDENTIFIER) | PK, default `uuid4()`                        |
| `household_id`  | `UUID`                    | FK → `Households.id`, NOT NULL               |
| `ingredient_id` | `UUID`                    | FK → `Ingredients.id`, NOT NULL              |
| `brand`         | `String(200)`             | NOT NULL                                     |
| `product_name`  | `String(300)`             | NOT NULL                                     |
| `size_desc`     | `String(100)`             | NULLABLE, e.g. "2.5 lb bag", "16 oz can"     |
| `price`         | `Numeric(8,2)`            | NULLABLE                                     |
| `shop`          | `String(200)`             | NULLABLE                                     |
| `notes`         | `String(500)`             | NULLABLE                                     |
| `created_at`    | `DateTime`                | NOT NULL, default `sysutcdatetime()`         |
| `updated_at`    | `DateTime`                | NOT NULL, default `sysutcdatetime()`, update |

**Constraints**: `UNIQUE(household_id, ingredient_id)` — one preferred product per ingredient per household.
**Indexes**: `ix_products_household` on `household_id`, `ix_products_ingredient` on `ingredient_id`.
**Relationships**: `household` → `Household`, `ingredient` → `Ingredient` (lazy="selectin").

### GroceryItemResponse extension (no new column — join at query time)

The existing `GroceryItem` table is NOT modified. Instead, the `GET /grocery-list` endpoint joins through `GroceryItem.ingredient_id` → `Product.ingredient_id` (same household) to enrich the response with product details. This avoids duplicating product data on every grocery item and ensures product updates propagate automatically.

### Shopping Trip State (client-side — no DB table)

Trip state is managed in the frontend via localStorage:

```typescript
interface TripState {
  groceryListId: string;
  shop: string;
  checkedItemIds: string[]; // grocery item IDs checked during this trip
  startedAt: string; // ISO timestamp
}
```

Key: `shopping-trip-{groceryListId}-{shopNormalized}`

This satisfies FR-013 (separate from global is_checked), FR-014 (persists across navigation), FR-016 (resets with new list — new groceryListId = new keys), and the edge case of concurrent shoppers (each device has its own localStorage).

## API Endpoints

### Products — `/api/v1/products`

| Method   | Path                            | Description                             | Request Body    | Response                |
| -------- | ------------------------------- | --------------------------------------- | --------------- | ----------------------- |
| `GET`    | `/api/v1/products`              | List all product mappings for household | —               | `list[ProductResponse]` |
| `POST`   | `/api/v1/products`              | Create a product mapping                | `CreateProduct` | `ProductResponse` (201) |
| `PUT`    | `/api/v1/products/{product_id}` | Update a product mapping                | `UpdateProduct` | `ProductResponse`       |
| `DELETE` | `/api/v1/products/{product_id}` | Delete a product mapping                | —               | 204 No Content          |
| `GET`    | `/api/v1/products/search`       | Search products by name/brand/shop      | query: `q`      | `list[ProductResponse]` |

**Service**: `ProductService(session, household_id)` — validates ingredient exists, enforces unique constraint on (household_id, ingredient_id), provides search across brand + product_name + shop.

### Grocery List Response Extension

Modify existing `GET /api/v1/meal-plans/{meal_plan_id}/grocery-list` to include product details in each `GroceryItemResponse`:

**Extended `GroceryItemResponse`**:

```
id, ingredient_id, ingredient_name, ingredient_category, quantity_needed, unit, is_checked, preferred_store,
product: { id, brand, product_name, size_desc, price, shop } | null
```

The `product` field is populated by joining `GroceryItem.ingredient_id` → `Product.ingredient_id` WHERE `Product.household_id` = current household. If no product mapping exists, `product` is `null`.

Also add `ingredient_name` and `ingredient_category` to the response (join through existing `ingredient` relationship) — this fixes an existing bug where the frontend displays raw UUIDs instead of ingredient names.

### Trip Completion — reuse existing endpoints

No new trip-specific server endpoints. Trip completion uses the existing:

- `PATCH /api/v1/grocery-items/{item_id}` — mark items as globally checked
- `POST /api/v1/grocery-lists/{id}/complete` — add checked items to inventory

The frontend calls these when the user completes a trip.

### Pydantic Models (new in `services/api/src/api/models/`)

**`product.py`**:

- `CreateProduct`: `ingredient_id: UUID`, `brand: str`, `product_name: str`, `size_desc: str | None`, `price: float | None`, `shop: str | None`, `notes: str | None`
- `UpdateProduct`: all fields optional (partial update)
- `ProductResponse`: all fields + `id`, `ingredient_name`, `created_at`, `updated_at`
- `ProductSummary`: `id`, `brand`, `product_name`, `size_desc`, `price`, `shop` (embedded in GroceryItemResponse)

## Frontend Changes

### New Page

**`/products`** — Product library:

- Lists all household product mappings grouped by ingredient category
- Search bar filtering by product name, brand, or shop
- Add/edit/delete product mappings
- Each product shows: ingredient name, brand, product name, size, price, shop

### Modified Components

**`GroceryList.tsx`** — Enhanced grocery list:

- Show product details (brand, product name, size, price) when a product mapping exists
- Show plain ingredient + quantity when no mapping exists (current behavior)
- Add "Link Product" button on unmapped items → opens inline product mapping form
- Shop filter tabs at top: all distinct shops from items + "All" + "Other / Any Store"

**`GroceryItem.tsx`** — Enhanced grocery item:

- Display ingredient name (not UUID) — fix existing bug
- Show product brand + name if mapped, price badge, shop tag
- "Link Product" action button for unmapped items

### New Components

**`ShopFilter.tsx`** — Shop filter tabs/pills:

- Derives distinct shops from grocery items' product mappings
- "All", per-shop tabs, "Other / Any Store" for unmapped items
- Manages active filter state, emits filter change

**`TripTracker.tsx`** — Per-trip check-off overlay:

- Appears when a shop filter is active (not "All")
- Manages trip state in localStorage
- Shows trip progress (checked/total)
- "Complete Trip" button → marks items globally checked, offers inventory add
- Independent check state from global is_checked

**`ProductMappingForm.tsx`** — Inline form for creating/editing product mapping:

- Fields: brand, product name, size description, price, shop
- Ingredient is pre-selected (from the grocery item context)
- Used both inline on grocery list and on the /products page

### New TypeScript Types (`apps/web/src/types/index.ts`)

```typescript
export interface ProductSummary {
  id: string;
  brand: string;
  product_name: string;
  size_desc: string | null;
  price: number | null;
  shop: string | null;
}

export interface Product extends ProductSummary {
  household_id: string;
  ingredient_id: string;
  ingredient_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripState {
  groceryListId: string;
  shop: string;
  checkedItemIds: string[];
  startedAt: string;
}
```

### New API Client Functions (`apps/web/src/services/api.ts`)

- `getProducts()` → `fetchApi<Product[]>`
- `createProduct(data)` → `fetchApi<Product>`
- `updateProduct(productId, data)` → `fetchApi<Product>`
- `deleteProduct(productId)` → `fetchApi<void>`
- `searchProducts(query)` → `fetchApi<Product[]>`

### Extended GroceryItemResponse in API types

Update the existing `GroceryItemResponse` type to include `ingredient_name`, `ingredient_category`, and optional `product: ProductSummary | null`.

## Worker Changes (minimal)

### Generator (`generator.py`)

When persisting grocery items in `_persist_plan()`, look up existing product mappings for the household:

- Query `Product` table for household_id
- Build lookup: `ingredient_id` → `Product`
- When creating `GroceryItem`, set `preferred_store` from `product.shop` if a mapping exists

This ensures newly generated grocery lists automatically have `preferred_store` populated from product mappings, maintaining the existing shop-grouping behavior in the frontend.

## Project Structure

### New & Modified Files

```text
services/
  shared/
    shared/db/models/
      product.py             # NEW — Product model
      __init__.py            # MODIFIED — export Product
    alembic/versions/
      005_grocery_products.py # NEW — create Products table

  api/
    src/api/
      routes/
        products.py          # NEW — product CRUD endpoints
        grocery.py           # MODIFIED — extend grocery list response with product details
        __init__.py          # MODIFIED — register products router (if needed)
      services/
        product_service.py   # NEW — ProductService class
        grocery_service.py   # MODIFIED — include product data in grocery list query
      models/
        product.py           # NEW — Pydantic request/response models
        grocery.py           # MODIFIED — extend GroceryItemResponse with product + ingredient_name
      dependencies.py        # MODIFIED — add get_product_service factory
    tests/
      test_products.py       # NEW — product endpoint tests
      test_grocery.py        # MODIFIED — test extended grocery response with product data

  workers/
    meal_plan_generator/
      generator.py           # MODIFIED — apply product mappings when creating grocery items

apps/
  web/
    src/
      app/
        products/
          page.tsx           # NEW — product library page
      components/
        grocery/
          GroceryList.tsx    # MODIFIED — shop filter tabs, product details display
          GroceryItem.tsx    # MODIFIED — product info display, link product action
        ShopFilter.tsx       # NEW — shop filter tabs component
        TripTracker.tsx      # NEW — per-trip check-off component
        ProductMappingForm.tsx # NEW — product mapping form
      services/
        api.ts               # MODIFIED — add product API functions
        tripStorage.ts       # NEW — localStorage trip state management
      types/
        index.ts             # MODIFIED — add Product, ProductSummary, TripState types
    src/__tests__/
      products.test.tsx      # NEW — product library page tests
      shop-filter.test.tsx   # NEW — shop filter component tests
      trip-tracker.test.tsx  # NEW — trip tracker component tests
```

## Migration Strategy

### Migration 005: `005_grocery_products.py`

Single Alembic migration that:

1. **Creates `Products` table** with all columns, FK constraints, unique constraint on `(household_id, ingredient_id)`, and indexes on `household_id` and `ingredient_id`.

All changes are additive (new table only). No data migration needed. Fully backward-compatible.

**Downgrade**: Drop the `Products` table.

## Implementation Order

1. **Phase 1 — Model & Migration**: Create Product SQLAlchemy model + Alembic migration. Foundation for everything.
2. **Phase 2 — Product API (US1)**: Service + routes + Pydantic models + tests. Core CRUD.
3. **Phase 3 — Grocery Response Extension**: Extend grocery list response with product details + ingredient name. Update grocery service query.
4. **Phase 4 — Worker Integration**: Apply product mappings in generator when creating grocery items.
5. **Phase 5 — Frontend: Types & API Client**: TypeScript types + API functions.
6. **Phase 6 — Frontend: Product Library Page**: /products page with CRUD + search.
7. **Phase 7 — Frontend: Enhanced Grocery List (US1)**: Product details display, "Link Product" action, ingredient name fix.
8. **Phase 8 — Frontend: Shop Filter & Trips (US2)**: ShopFilter, TripTracker, trip localStorage, trip completion flow.
9. **Phase 9 — E2E Tests**: Full-flow Playwright tests.

## Complexity Tracking

No constitution violations. All changes follow established patterns. No new infrastructure, no new service boundaries. 1 new model is well within the schema's complexity trajectory (16 → 17 tables). Trip state in localStorage avoids unnecessary server-side tables (YAGNI).
