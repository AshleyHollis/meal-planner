# Tasks: Grocery Enhancements

**Input**: Design documents from `/specs/005-grocery-enhancements/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: Included — constitution requires test-first development; project has existing test suites.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths in every description

---

## Phase 1: Foundational (Model & Migration)

**Purpose**: Create Product SQLAlchemy model and Alembic migration — foundation for all API and frontend work.

**⚠️ CRITICAL**: No API or frontend work can begin until this phase is complete.

- [ ] T001 [P] Create Product SQLAlchemy model in `services/shared/shared/db/models/product.py` — UUID PK, household_id FK (→Households.id), ingredient_id FK (→Ingredients.id), brand (String 200 NOT NULL), product_name (String 300 NOT NULL), size_desc (String 100 nullable), price (Numeric 8,2 nullable), shop (String 200 nullable), notes (String 500 nullable), timestamps. UNIQUE(household_id, ingredient_id). Indexes on household_id and ingredient_id. Relationships: household → Household, ingredient → Ingredient (lazy="selectin").
- [ ] T002 Export Product model in `services/shared/shared/db/models/__init__.py` — add Product to imports and **all**
- [ ] T003 Create Alembic migration `services/shared/alembic/versions/005_grocery_products.py` — create Products table with all columns, FK constraints, UNIQUE(household_id, ingredient_id), indexes. Use idempotent pattern (IF NOT EXISTS). Downgrade drops table.

### V1 — Model & Migration Checkpoint

- [ ] V001 Run shared lint: `cd services/shared && uv run ruff check shared/ && uv run ruff format --check shared/`
- [ ] V002 Run API tests to verify no regressions: `cd services/api && uv run pytest tests/ -v`

---

## Phase 2: User Story 1 — Product Mapping (Priority: P1) 🎯 MVP

**Goal**: CRUD for product mappings + enriched grocery list response showing product details for mapped ingredients.

**Independent Test**: Create product mappings for several ingredients, generate a meal plan, verify grocery list shows product details (brand, size, price, shop) for mapped items and plain ingredient details for unmapped items.

### Pydantic Models

- [ ] T004 [P] [US1] Create Pydantic request/response models in `services/api/src/api/models/product.py` — `CreateProduct` (ingredient_id: UUID, brand: str, product_name: str, size_desc: str | None, price: float | None, shop: str | None, notes: str | None), `UpdateProduct` (all optional), `ProductResponse` (all fields + id, ingredient_name, created_at, updated_at), `ProductSummary` (id, brand, product_name, size_desc, price, shop)
- [ ] T005 [P] [US1] Extend `GroceryItemResponse` in `services/api/src/api/models/grocery.py` — add `ingredient_name: str`, `ingredient_category: str`, and `product: ProductSummary | None` fields

### Service Layer

- [ ] T006 [US1] Create ProductService in `services/api/src/api/services/product_service.py` — list products for household, create product (validate ingredient exists, enforce unique constraint on household_id+ingredient_id, return 409 on duplicate), update product by ID, delete product by ID, search products by query string (case-insensitive LIKE on brand, product_name, shop)
- [ ] T007 [US1] Extend GroceryService in `services/api/src/api/services/grocery_service.py` — modify `get_grocery_list()` to join GroceryItem → Ingredient (for name/category) and left-join to Product (matching ingredient_id + household_id) to populate product details in response

### Routes

- [ ] T008 [US1] Create product routes in `services/api/src/api/routes/products.py` — `GET /api/v1/products` (list all), `POST /api/v1/products` (201), `PUT /api/v1/products/{product_id}`, `DELETE /api/v1/products/{product_id}` (204), `GET /api/v1/products/search?q={query}`
- [ ] T009 [US1] Register products router in `services/api/src/api/main.py` — add `app.include_router(products_router)`
- [ ] T010 [US1] Add `get_product_service` dependency factory in `services/api/src/api/dependencies.py` — follows existing pattern (session + household_id)

### Worker Integration

- [ ] T011 [US1] Modify generator in `services/workers/meal_plan_generator/generator.py` — in `_persist_plan()`, after creating grocery items, query Product table for household_id, build ingredient_id→Product lookup, set `preferred_store` from `product.shop` on each GroceryItem that has a mapping

### Tests

- [ ] T012 [US1] Write product endpoint tests in `services/api/tests/test_products.py` — test list/create/update/delete products, search, duplicate ingredient rejection (409), ingredient-not-found (404), product-not-found on update/delete (404)
- [ ] T013 [US1] Write/extend grocery list tests in `services/api/tests/test_grocery.py` — test that GET grocery-list response includes ingredient_name, ingredient_category, and product details for mapped items; product is null for unmapped items

### V2 — Product API Checkpoint

- [ ] V003 Run API lint: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/`
- [ ] V004 Run API tests: `cd services/api && uv run pytest tests/ -v`
- [ ] V005 Run worker lint: `cd services/workers && uv run ruff check meal_plan_generator/ && uv run ruff format --check meal_plan_generator/`

---

## Phase 3: User Story 1 — Frontend Product Mapping (Priority: P1 continued)

**Goal**: Product library page, enhanced grocery list with product details, inline "Link Product" action.

### Types & API Client

- [ ] T014 [P] [US1] Add TypeScript types to `apps/web/src/types/index.ts` — `ProductSummary`, `Product`, `TripState` interfaces as defined in plan
- [ ] T015 [P] [US1] Add API client functions in `apps/web/src/services/api.ts` — `getProducts()`, `createProduct(data)`, `updateProduct(productId, data)`, `deleteProduct(productId)`, `searchProducts(query)`
- [ ] T016 [P] [US1] Update existing GroceryItem types in `apps/web/src/types/index.ts` — extend with `ingredient_name: string`, `ingredient_category: string`, `product: ProductSummary | null`

### Components

- [ ] T017 [US1] Create ProductMappingForm component in `apps/web/src/components/ProductMappingForm.tsx` — form fields for brand, product_name, size_desc, price, shop; ingredient pre-selected from context; submit calls createProduct or updateProduct; used both inline on grocery list and on /products page
- [ ] T018 [US1] Modify GroceryItem component in `apps/web/src/components/grocery/GroceryItem.tsx` — display ingredient_name (not UUID, fixes existing bug), show product brand + product_name + price badge + shop tag if product mapping exists, add "Link Product" button for unmapped items that opens ProductMappingForm inline
- [ ] T019 [US1] Modify GroceryList component in `apps/web/src/components/grocery/GroceryList.tsx` — use ingredient_name from API response for display, show product details when available, pass product context to GroceryItem

### Page

- [ ] T020 [US1] Create product library page in `apps/web/src/app/products/page.tsx` — list all household products grouped by ingredient_category, search bar with debounced input filtering by name/brand/shop, add/edit/delete product mappings via ProductMappingForm, ingredient autocomplete using existing ingredient list

### Tests

- [ ] T021 [P] [US1] Write product library page tests in `apps/web/src/__tests__/products.test.tsx` — test rendering product list, search filtering, add/edit/delete flows
- [ ] T022 [P] [US1] Write ProductMappingForm tests in `apps/web/src/__tests__/product-mapping-form.test.tsx` — test form validation, submit, pre-filled ingredient

### V3 — Frontend Product Mapping Checkpoint

- [ ] V006 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V007 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V008 Run frontend tests: `cd apps/web && npm test -- --run`

**Checkpoint**: At this point, User Story 1 should be fully functional — product mappings can be created, edited, deleted; grocery lists display product details for mapped items and plain details for unmapped items.

---

## Phase 4: User Story 2 — Shop-Filtered Grocery Trips (Priority: P2)

**Goal**: Filter grocery list by shop, per-trip check-off tracking independent from global checked state, trip completion with inventory add.

**Depends on**: US1 (product mappings provide the shop assignments that enable filtering)

**Independent Test**: Create product mappings for items across 2-3 shops, generate grocery list, filter by each shop, check items off per-trip, verify trip check state is independent from global is_checked, complete a trip and verify items marked globally.

### Components

- [ ] T023 [P] [US2] Create tripStorage utility in `apps/web/src/services/tripStorage.ts` — localStorage-based trip state management: `getTripState(groceryListId, shop)`, `setItemChecked(groceryListId, shop, itemId, checked)`, `getTripProgress(groceryListId, shop)`, `clearTripsForList(groceryListId)`, `isNewList(groceryListId)` (clears stale trip state). Key format: `shopping-trip-{groceryListId}-{shopNormalized}`. Shop names normalized: lowercased, trimmed.
- [ ] T024 [P] [US2] Create ShopFilter component in `apps/web/src/components/ShopFilter.tsx` — derive distinct shops from grocery items' product.shop values (case-insensitive dedup), render filter tabs/pills: "All", per-shop tabs sorted alphabetically, "Other / Any Store" for items with product=null. Emit onFilterChange(shop | "all" | "other"). Show item count per shop.
- [ ] T025 [US2] Create TripTracker component in `apps/web/src/components/TripTracker.tsx` — appears when shop filter is active (not "All"), manages per-trip check state via tripStorage, shows trip progress bar (checked/total), provides independent checkboxes per item (separate from global is_checked), "Complete Trip" button that calls existing PATCH /grocery-items/{id} for each checked item + offers CompleteShoppingDialog for inventory add. Preserves state across navigation.

### Integration

- [ ] T026 [US2] Integrate ShopFilter and TripTracker into GroceryList in `apps/web/src/components/grocery/GroceryList.tsx` — add ShopFilter at top of grocery list, filter displayed items by selected shop, show TripTracker overlay when a specific shop is selected, pass trip check state to GroceryItem for visual differentiation (trip-checked vs globally-checked)
- [ ] T027 [US2] Modify grocery list detail page `apps/web/src/app/grocery-list/[id]/page.tsx` — handle shop filter state in URL query params or component state, clear trip state when grocery list ID changes (new meal plan)

### Tests

- [ ] T028 [P] [US2] Write tripStorage tests in `apps/web/src/__tests__/trip-storage.test.tsx` — test get/set/clear trip state, shop normalization, stale list cleanup
- [ ] T029 [P] [US2] Write ShopFilter tests in `apps/web/src/__tests__/shop-filter.test.tsx` — test shop derivation from items, case-insensitive dedup, "Other" group, filter selection
- [ ] T030 [P] [US2] Write TripTracker tests in `apps/web/src/__tests__/trip-tracker.test.tsx` — test per-trip check state independent from global, progress tracking, trip completion

### V4 — Shop-Filtered Trips Checkpoint

- [ ] V009 Run frontend lint: `cd apps/web && npm run lint`
- [ ] V010 Run frontend type check: `cd apps/web && npx tsc --noEmit`
- [ ] V011 Run frontend tests: `cd apps/web && npm test -- --run`

**Checkpoint**: US2 fully functional — grocery list filters by shop, per-trip check-off works independently, trip completion marks items globally.

---

## Phase 5: E2E Tests + Polish

**Goal**: End-to-end Playwright tests covering full flows. Final regression check.

- [ ] T031 [US1] E2E test in `apps/web/e2e/products.spec.ts` — create product mapping → generate meal plan → verify grocery list shows product details for mapped items and plain details for unmapped
- [ ] T032 [US2] E2E test in `apps/web/e2e/grocery-trips.spec.ts` — create product mappings for 2 shops → generate grocery list → filter by shop → check items per-trip → complete trip → verify items marked globally
- [ ] T033 Full regression: run all existing E2E tests to verify no regressions from grocery enhancement changes

### V5 — E2E Checkpoint

- [ ] V012 Run all API tests: `cd services/api && uv run pytest tests/ -v`
- [ ] V013 Run all worker tests: `cd services/workers && uv run pytest tests/ -v`
- [ ] V014 Run all frontend tests: `cd apps/web && npm test -- --run`
- [ ] V015 Run frontend lint + type check: `cd apps/web && npm run lint && npx tsc --noEmit`
- [ ] V016 Run API + shared lint: `cd services/api && uv run ruff check src/ && cd ../../services/shared && uv run ruff check shared/`

---

## Phase 6: Visual Smoke Testing in Preview Environment _(mandatory)_

**Goal**: Manually verify all user-facing features in the deployed Azure preview environment using Playwright MCP browser tools. E2E tests run in isolated headless environments and can miss visual regressions, layout issues, and real-world integration problems.

**Depends on**: Phase 5 (E2E tests pass, preview deployment green).

**⚠️ CRITICAL**: Feature is NOT complete until visual smoke testing passes. This phase catches issues that automated tests miss — visual rendering bugs, broken layouts, real API integration errors, and auth-gated flows.

### Smoke Test Procedure

1. **Navigate to Preview URL** — find from GitHub Actions preview deployment workflow run
2. **Test authenticated and unauthenticated states** — verify login/logout flow works
3. **Test each user story's primary flows** visually in the browser
4. **Capture screenshots** of key screens for evidence
5. **File issues or fix** any visual bugs, layout problems, or integration errors found

### Visual Smoke Test Tasks

- [ ] T034 [US1] Visual smoke: Product Library page (`/products`) — verify product cards render with brand, product name, price badge, shop badge, notes. Test search filtering, add product form, edit product form, delete product
- [ ] T035 [US1] Visual smoke: Grocery list with product enrichment — verify mapped items show product details (brand, size, price, shop) and unmapped items show plain ingredient name + quantity. Verify "Link Product" button appears on unmapped items
- [ ] T036 [US2] Visual smoke: Shop filter on grocery list — verify shop filter tabs render (All, per-shop, Other/Any Store), filtering narrows list correctly, item counts per shop are accurate
- [ ] T037 [US2] Visual smoke: Trip tracker — verify per-trip checkboxes work independently from global is_checked, progress bar updates, "Complete Trip" button functions, trip state persists across navigation
- [ ] T038 Regression smoke: Dashboard, Inventory, Meal Plans, History pages — verify no visual regressions from grocery enhancement changes
- [ ] T039 Auth flow smoke: Test authenticated API calls work correctly — product CRUD, grocery list loading, trip completion all function through the SWA BFF auth layer

### V6 — Visual Smoke Testing Checkpoint

- [ ] V017 All smoke test tasks pass with no blocking visual issues
- [ ] V018 Screenshots captured for key screens (Product Library, Grocery List with products, Shop Filter, Trip Tracker)

**Checkpoint**: Feature is verified end-to-end in a real deployed environment. Ready for merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Model & Migration)**: No dependencies — start immediately. BLOCKS all subsequent phases.
- **Phase 2 (Product API — US1 backend)**: Depends on Phase 1.
- **Phase 3 (Product Frontend — US1 frontend)**: Depends on Phase 2 (API must exist).
- **Phase 4 (Shop-Filtered Trips — US2)**: Depends on Phase 3 (needs product mappings with shop data in UI).
- **Phase 5 (E2E + Polish)**: Depends on all prior phases.
- **Phase 6 (Visual Smoke Testing)**: Depends on Phase 5 + preview deployment green. BLOCKS feature completion.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 1 — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 completion — shop filtering requires product mappings to have shop assignments

### Within Each Phase

- Pydantic models before services
- Services before routes
- Routes before tests (tests validate the full stack)
- Types/API client before components
- Components before pages
- Implementation before checkpoint verification

### Parallel Opportunities

```
Phase 1 (foundation)
  │
  └──► Phase 2 (Product API — US1 backend)
         │
         ├──► T004, T005 in parallel (Pydantic models)
         ├──► T012, T013 in parallel (tests, after routes)
         │
         └──► Phase 3 (Product Frontend — US1 frontend)
                │
                ├──► T014, T015, T016 in parallel (types + API client)
                ├──► T021, T022 in parallel (tests)
                │
                └──► Phase 4 (Shop Trips — US2)
                       │
                       ├──► T023, T024 in parallel (tripStorage + ShopFilter)
                       ├──► T028, T029, T030 in parallel (tests)
                       │
                       └──► Phase 5 (E2E + Polish)
                              │
                              └──► Phase 6 (Visual Smoke Testing — GATES completion)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Model & Migration
2. Complete Phase 2: Product API
3. Complete Phase 3: Frontend Product Mapping
4. **STOP and VALIDATE**: Test product mapping end-to-end
5. Deploy/demo if ready — grocery list already shows actionable product details

### Incremental Delivery

1. Phase 1 + Phase 2 + Phase 3 → Product Mapping works (MVP!)
2. Phase 4 → Shop filtering + trips adds per-store shopping
3. Phase 5 → E2E validation + regression check
4. Phase 6 → Visual smoke testing in preview environment (mandatory gate)

---

---

## Phase 7: UX Depth & Detail Views

**Goal**: Transform the app from functional-but-basic to fully fleshed out with clickable detail views, images, references, and professional-quality UX. Every entity should be clickable with a rich detail view.

**Depends on**: Phases 1-6 complete (all core features working).

### Backend — New Fields & API Enrichment

- [ ] T040 [P] Add `image_url` (String 500, nullable) and `source_url` (String 500, nullable) fields to Recipe model in `services/shared/shared/db/models/` and create Alembic migration `services/shared/alembic/versions/006_recipe_enrichment.py` — idempotent pattern
- [ ] T041 [P] Add `image_url` (String 500, nullable) field to Product model in `services/shared/shared/db/models/product.py` and include in Alembic migration 006
- [ ] T042 Update RecipeResponse Pydantic model in `services/api/src/api/models/` to include image_url and source_url in API responses
- [ ] T043 Update Product Pydantic models in `services/api/src/api/models/product.py` to include image_url in responses
- [ ] T044 Create `GET /api/v1/products/{product_id}` detail endpoint in `services/api/src/api/routes/products.py` — returns full product with ingredient details
- [ ] T045 Create `GET /api/v1/inventory/{item_id}` detail endpoint in `services/api/src/api/routes/inventory.py` — returns full inventory item with ingredient info, expiry details, associated product mapping
- [ ] T046 Update seed data in `services/api/src/api/services/` or seed scripts — add image_url and source_url values for existing seed recipes; add image_url for seed products

### Frontend — Detail Pages

- [ ] T047 [P] Create product detail page at `apps/web/src/app/products/[id]/page.tsx` — show full product info (brand, name, size, price, shop, notes), product image, linked ingredient details, edit/delete actions, breadcrumb navigation back to products list
- [ ] T048 [P] Create inventory item detail page at `apps/web/src/app/inventory/[id]/page.tsx` — show full item info (ingredient name, quantity, unit, storage location, expiry date with status), associated product mapping if exists, usage history, breadcrumb navigation
- [ ] T049 Enhance MealSlotCard in `apps/web/src/components/meal-plan/MealSlotCard.tsx` — show recipe source URL as clickable link when available, display recipe image_url (prefer over placeholder), add nutritional hints display if available
- [ ] T050 Add TypeScript types and API client functions in `apps/web/src/types/index.ts` and `apps/web/src/services/api.ts` — getProduct(id), getInventoryItem(id), ProductDetail, InventoryItemDetail types
- [ ] T051 Make products clickable in product library page `apps/web/src/app/products/page.tsx` — each product card links to /products/[id] detail page
- [ ] T052 Make inventory items clickable in inventory page `apps/web/src/app/inventory/page.tsx` — each item links to /inventory/[id] detail page

### Frontend — Visual Enhancement

- [ ] T053 Enhance product cards with images — show product image (or category-based placeholder) on product library cards and grocery list items
- [ ] T054 Enhance inventory list items with visual improvements — add ingredient category icons/images, more prominent expiry warnings, usage indicators
- [ ] T055 Add breadcrumb navigation component in `apps/web/src/components/ui/Breadcrumbs.tsx` — reusable across detail pages (Products > Product Name, Inventory > Item Name, etc.)
- [ ] T056 Enhance dashboard at `apps/web/src/app/page.tsx` — add weekly meal calendar preview, clickable stats cards that navigate to respective pages, recent activity feed

### E2E Tests for Detail Pages

- [ ] T057 E2E test for product detail page in `apps/web/e2e/products.spec.ts` — navigate to product detail, verify all fields displayed, test edit from detail page, test back navigation
- [ ] T058 E2E test for inventory detail page in `apps/web/e2e/inventory.spec.ts` — navigate to inventory item detail, verify all fields displayed, test back navigation
- [ ] T059 E2E regression test — verify all existing flows still work with new detail pages and clickable elements

### V7 — UX Depth Checkpoint

- [ ] V019 Run all frontend tests: `cd apps/web && npm test -- --run`
- [ ] V020 Run frontend lint + type check: `cd apps/web && npm run lint && npx tsc --noEmit`
- [ ] V021 Run all API tests: `cd services/api && uv run pytest tests/ -v`
- [ ] V022 Run all E2E tests in CI

### V8 — Visual Smoke Testing (Mandatory Gate)

- [ ] T060 Visual smoke: Product detail page — verify image renders, all fields present, edit/delete work, breadcrumbs navigate correctly
- [ ] T061 Visual smoke: Inventory item detail page — verify all fields, expiry status, associated product, breadcrumbs
- [ ] T062 Visual smoke: Enhanced MealSlotCard — verify recipe source URL clickable, images load, recipe detail expands properly
- [ ] T063 Visual smoke: Product library — verify cards are clickable, images show, overall professional appearance
- [ ] T064 Visual smoke: Dashboard — verify calendar preview, stats navigation, activity feed

**Checkpoint**: App is fully fleshed out with rich detail views, images, references. Every entity is clickable. UX feels professional and complete.

---

## Task Summary

| Phase                              | Tasks     | Tests     | Checkpoints |
| ---------------------------------- | --------- | --------- | ----------- |
| 1. Model & Migration               | T001–T003 | —         | V001–V002   |
| 2. Product API (US1 backend)       | T004–T013 | T012–T013 | V003–V005   |
| 3. Product Frontend (US1 frontend) | T014–T022 | T021–T022 | V006–V008   |
| 4. Shop-Filtered Trips (US2)       | T023–T030 | T028–T030 | V009–V011   |
| 5. E2E + Polish                    | T031–T033 | T031–T033 | V012–V016   |
| 6. Visual Smoke Testing            | T034–T039 | —         | V017–V018   |
| 7. UX Depth & Detail Views         | T040–T064 | T057–T059 | V019–V022   |

**Total: 64 tasks + 22 verification checkpoints = 86 items**
Phases 1-6: ✅ Complete (core P18/P24 features + UX overhaul)
Phase 7: 🔄 In Progress (UX depth enhancements)
