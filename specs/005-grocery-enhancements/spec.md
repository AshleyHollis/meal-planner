# Feature Specification: Grocery Enhancements

**Feature Branch**: `005-grocery-enhancements`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "Enhance the grocery list system: (P18) Map ingredients to specific products with brand, size, price, and preferred shop so grocery lists show exact items to buy at each store. (P24) Filter the grocery list by shop for per-trip shopping with per-trip check-off tracking."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Product Mapping (Priority: P1 🎯 MVP)

As a household member, I want to map each ingredient to a specific product I
actually buy — with brand, size, price, and which shop I get it from — so that
my grocery list shows me the exact items to pick up at each store rather than
generic ingredient names and quantities.

Today the grocery list shows entries like "Chicken Breast — 2.00 lbs" which
leaves the shopper guessing which brand to grab, what size package to buy, and
what it costs. Product mapping solves this by letting me say: "When I need
chicken breast, I buy Tyson Boneless Skinless Chicken Breast, 2.5 lb bag,
$8.99, from Kroger."

Each ingredient can have one preferred product mapping per household. When the
AI generates a grocery list, items that have a product mapping display the
product details (brand, size, price, shop) instead of — or alongside — the raw
ingredient. Products without a mapping still display the plain ingredient as
they do today (no regression). Mappings are reusable across meal plans — once
set, every future grocery list uses them automatically.

Users manage product mappings from the grocery list itself (inline "link
product" action on any item) or from a dedicated product library page. The
product library shows all saved products grouped by ingredient category,
supports search, and allows add/edit/delete.

**Why this priority**: Without product mapping, the grocery list is an
ingredients list — useful for knowing what to cook, but not actionable for
shopping. Product mapping transforms it into a real shopping list with exact
items, prices, and store assignments. This is the foundational enhancement that
enables shop-filtered trips (US2) and eventual cost tracking.

**Independent Test**: Can be fully tested by creating product mappings for
several ingredients, generating a meal plan, and verifying the grocery list
shows product details (brand, size, price, shop) for mapped items and plain
ingredient details for unmapped items. Delivers standalone value — the grocery
list becomes actionable immediately.

**Acceptance Scenarios**:

1. **Given** I have mapped "chicken breast" to "Tyson Boneless Chicken Breast,
   2.5 lb bag, $8.99, Kroger", **When** a grocery list is generated containing
   chicken breast, **Then** the grocery item displays the product name, brand,
   size, price, and "Kroger" as the shop.
2. **Given** an ingredient has no product mapping, **When** the grocery list is
   generated, **Then** the item displays the ingredient name and quantity as it
   does today (no regression).
3. **Given** I click "link product" on a grocery item, **When** I fill in brand,
   size, price, and shop, **Then** a product mapping is saved and immediately
   reflected on the current grocery item.
4. **Given** I have saved product mappings, **When** a new meal plan is
   generated weeks later, **Then** the new grocery list automatically uses the
   existing product mappings for matching ingredients.
5. **Given** I open the product library page, **When** I search for "chicken",
   **Then** I see all products whose ingredient or product name contains
   "chicken", grouped by ingredient category.
6. **Given** I edit a product mapping (change price from $8.99 to $9.49),
   **When** the next grocery list is generated, **Then** the updated price is
   reflected.
7. **Given** I delete a product mapping, **When** the next grocery list is
   generated, **Then** that ingredient reverts to plain display (ingredient name
   - quantity).

---

### User Story 2 — Shop-Filtered Grocery Trips (Priority: P2)

As a shopper, I want to filter my grocery list by shop so I can see only the
items I need for each store trip, and check them off per-trip without affecting
my full grocery list.

Most households shop at 2-3 stores. The current grocery list shows everything
in one flat list. Shop filtering lets me tap "Kroger" and see only Kroger items,
then tap "Costco" and see only Costco items. Each filtered view acts as a
trip — I check items off as I shop at that store, and those checks are tracked
per-trip, not globally.

A shopping trip is created when the user starts filtering by shop. The trip
tracks which items were checked off at that shop. Items can belong to only one
shop (derived from product mapping). Items with no shop assignment appear in an
"Other / Any Store" group. When all items for a trip are checked, the trip is
marked complete. The user can complete shopping (add to inventory) per-trip or
for the full list.

The trip check-off state is separate from the global `is_checked` on the
grocery item. A user might check off "milk" at Kroger during the Kroger trip
but not yet mark the global grocery item as purchased. When a trip is completed
(all items checked), the system offers to mark those items as globally checked
and optionally add them to inventory.

**Why this priority**: Shop filtering depends on product mappings (US1) to know
which shop each item belongs to. Without mappings, there's nothing to filter
by. This is the natural second step — once items have shop assignments, users
want to filter and track per-store.

**Independent Test**: Can be tested by creating product mappings for items
across 2-3 shops, generating a grocery list, filtering by each shop, checking
items off per-trip, and verifying trip completion state is independent from
global check state. Also verify "Other / Any Store" group for unmapped items.

**Acceptance Scenarios**:

1. **Given** my grocery list has items mapped to Kroger, Costco, and unmapped
   items, **When** I filter by "Kroger", **Then** I see only items assigned to
   Kroger.
2. **Given** I filter by "Costco", **When** I check off "olive oil" during the
   Costco trip, **Then** "olive oil" shows as checked in the Costco trip view
   but the global grocery list still shows it unchecked.
3. **Given** I have checked off all Kroger items in the Kroger trip, **When** I
   complete the Kroger trip, **Then** the system offers to mark those items as
   globally checked and optionally add them to inventory.
4. **Given** items exist with no product mapping (no shop), **When** I view the
   shop filter options, **Then** I see an "Other / Any Store" group containing
   those items.
5. **Given** I have completed the Kroger trip and the Costco trip, **When** I
   view the full grocery list, **Then** items from both trips are marked as
   globally checked.
6. **Given** I start a Kroger trip, **When** I navigate away and come back,
   **Then** my per-trip check-off state is preserved.
7. **Given** a new grocery list is generated for a new meal plan, **When** I
   view it, **Then** all trip states are fresh (no carry-over from previous
   plan's trips).

---

### Edge Cases

- **Multiple products per ingredient**: A household might buy the same
  ingredient from different shops (e.g., organic eggs from Whole Foods, regular
  eggs from Kroger). The system supports one preferred product mapping per
  ingredient per household. If users want alternatives, they can update the
  mapping — historical mappings are not tracked in this version.
- **Price changes**: Prices on product mappings are user-entered and may become
  stale. The system displays the saved price as-is — no automatic price
  updates. Users can edit prices at any time.
- **Shop name normalization**: Shops are free-text strings. "Kroger", "kroger",
  and "KROGER" should be treated as the same shop for filtering purposes
  (case-insensitive matching). Leading/trailing whitespace is trimmed.
- **Items split across shops**: A single ingredient always maps to one shop via
  its product mapping. If a recipe needs 2 lbs of chicken and the mapping says
  Kroger, all 2 lbs go to Kroger — no splitting across shops.
- **Unmapped items in trip view**: Items without a product mapping appear in
  "Other / Any Store". They can be checked off in the global list or in the
  "Other" trip view.
- **Empty shop filter**: If no items are assigned to a particular shop (e.g.,
  the user deleted a product mapping), filtering by that shop shows an empty
  list with a message.
- **Trip state and list regeneration**: If a grocery list is regenerated (e.g.,
  meal plan changes), existing trip states are discarded. The new list gets
  fresh trip tracking.
- **Quantity mismatch between mapping and need**: A product mapping says "2.5 lb
  bag" but the recipe needs 1 lb. The grocery list shows the ingredient's needed
  quantity (1 lb) alongside the product details. It does not auto-adjust
  quantity to match package size — that's a future enhancement.
- **Concurrent shoppers**: Two household members filtering by different shops
  simultaneously. Trip state is per-device/session — each shopper tracks their
  own trip independently. If both complete shopping, inventory additions are
  additive.

## Requirements _(mandatory)_

### Functional Requirements

**Product Mapping (US1)**

- **FR-001**: System MUST allow a household to create a product mapping that
  links an ingredient to a specific product with brand name, product name, size
  description, price, and preferred shop.
- **FR-002**: System MUST support one preferred product mapping per ingredient
  per household.
- **FR-003**: System MUST display product details (brand, product name, size,
  price, shop) on grocery items that have an active product mapping.
- **FR-004**: System MUST display plain ingredient details (name, quantity, unit)
  for grocery items without a product mapping (backward compatible).
- **FR-005**: System MUST automatically apply existing product mappings when
  generating new grocery lists from meal plans.
- **FR-006**: System MUST allow users to create product mappings inline from a
  grocery item ("link product" action).
- **FR-007**: System MUST provide a product library page listing all saved
  products grouped by ingredient category with search capability.
- **FR-008**: System MUST allow users to edit and delete existing product
  mappings.
- **FR-009**: System MUST store product price as a decimal value with up to two
  decimal places.
- **FR-010**: System MUST treat shop names as case-insensitive for grouping and
  filtering purposes (trim whitespace, normalize case).

**Shop-Filtered Trips (US2)**

- **FR-011**: System MUST allow users to filter the grocery list by shop to view
  only items assigned to that shop.
- **FR-012**: System MUST display a shop selector showing all distinct shops
  from the current grocery list plus an "Other / Any Store" option for unmapped
  items.
- **FR-013**: System MUST track per-trip check-off state that is separate from
  the global grocery item `is_checked` state.
- **FR-014**: System MUST preserve per-trip check-off state across page
  navigations within the same session.
- **FR-015**: System MUST allow users to complete a trip, which offers to mark
  those items as globally checked and optionally add them to household
  inventory.
- **FR-016**: System MUST reset all trip states when a new grocery list is
  generated for a new meal plan.
- **FR-017**: System MUST display a trip completion indicator showing checked
  items vs total items per shop.

### Key Entities

- **Product**: A specific purchasable item representing what the shopper
  actually buys. Has brand name, product name, size description, price, and
  preferred shop. Linked to exactly one ingredient. Scoped to a household.

- **ShoppingTrip**: A per-shop, per-grocery-list tracking record that captures
  which items were checked off during a shopping trip to a specific store.
  Contains the shop name, a reference to the grocery list, and per-item check
  state. Trips are ephemeral per grocery list — they reset when a new list is
  generated.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Grocery lists for households with product mappings display product
  details (brand, size, price, shop) on 100% of mapped items.
- **SC-002**: Unmapped grocery items continue to display as they do today (zero
  regressions on existing grocery list behavior).
- **SC-003**: Users can create a product mapping for an ingredient in under 30
  seconds via the inline "link product" action.
- **SC-004**: Shop filtering narrows the grocery list to only items for the
  selected shop within 1 second of selection.
- **SC-005**: Per-trip check-off state persists across page navigations with
  zero data loss during a shopping session.
- **SC-006**: Completing a shopping trip correctly marks all trip items as
  globally checked and adds them to inventory without duplicates.
- **SC-007**: Product mappings are automatically reused across at least 3
  consecutive meal plan generations without user re-entry.
- **SC-008**: The product library page loads and displays up to 200 products
  with search results appearing within 1 second.
