---
spec: 002-inventory-enhancements
created: 2026-03-02
status: approved
---

# Feature Specification: Inventory Enhancements

**Feature Branch**: `002-inventory-enhancements`
**Created**: 2026-03-02
**Status**: Approved

## Overview

Four enhancements that close the loop between cooking, inventory tracking, and meal planning. Ordered so each story builds on the prior: auto-deduct creates the cook→inventory link, leftovers extend it, staples add proactive restocking, and freezer adds a third storage dimension.

---

## User Scenarios & Testing

### User Story 1 — Auto-Deduct Inventory on Cook (Priority: P1)

As a household member, when I mark a meal slot as "cooked," the system automatically subtracts the recipe's ingredient quantities from my current inventory so I always know what I have on hand.

**Why this priority**: Foundational. Every other story depends on inventory reflecting actual consumption. Without auto-deduct, inventory drifts from reality within days.

**Independent Test**: Mark a slot as cooked via `PATCH /api/v1/meal-plans/{plan_id}/slots/{slot_id}/status` with `{"status": "cooked"}`. Verify inventory quantities decrease by the recipe's ingredient amounts.

**Acceptance Scenarios**:

1. **Given** a meal slot is "planned" and inventory has sufficient stock for all recipe ingredients **When** the user marks the slot as "cooked" **Then** each recipe ingredient's quantity is subtracted from the matching inventory item and `cooked_at` is set.

2. **Given** a meal slot is "planned" and inventory has insufficient stock for one or more ingredients **When** the user marks the slot as "cooked" **Then** each matching inventory item is reduced to zero (never negative), non-matching ingredients are skipped, and the response includes a `deductions` summary showing `ingredient_id`, `deducted`, and `remaining` for each ingredient.

3. **Given** a meal slot is "planned" and a recipe ingredient has no matching inventory item at all **When** the user marks the slot as "cooked" **Then** the slot is still marked cooked, the missing ingredient is listed in the deductions summary with `deducted: 0`, and no error is raised.

4. **Given** a meal slot is already "cooked" **When** the user attempts to mark it as "cooked" again **Then** the system returns a 409 Conflict and does not deduct inventory a second time.

5. **Given** a meal slot is "planned" **When** the user marks the slot as "skipped" **Then** no inventory deduction occurs and the slot status is updated to "skipped."

---

### User Story 2 — Record Leftover Portions (Priority: P2)

As a household member, after cooking a meal I want to record leftover portions (with an estimated expiry) so the AI planner can suggest using them before they spoil.

**Why this priority**: Directly extends US-1's cook flow. Leftovers are a major source of food waste; capturing them immediately after cooking is the natural UX moment.

**Independent Test**: After marking a slot cooked, call `POST /api/v1/meal-plans/{plan_id}/slots/{slot_id}/leftovers` with `{"portions": 2, "storage_location": "fridge", "expiry_date": "2026-03-05"}`. Verify a `Leftover` record is created and appears in `GET /api/v1/leftovers`.

**Acceptance Scenarios**:

1. **Given** a meal slot has just been marked "cooked" **When** the user submits leftover portions **Then** a Leftover record is created linked to the slot, with portions, storage location, and expiry date.

2. **Given** leftovers exist in inventory **When** the AI meal plan generator runs **Then** the prompt includes leftover items in the "expiring soon / use first" section, ordered by expiry date ascending.

3. **Given** a leftover record exists **When** the user marks it as "used" **Then** the record's `used_at` timestamp is set and it no longer appears in the active leftovers list.

4. **Given** a leftover's expiry date has passed **When** the user views leftovers **Then** the item is flagged as "expired" in the response.

5. **Given** a meal slot is "planned" (not yet cooked) **When** the user tries to record leftovers **Then** the system returns 400 Bad Request.

---

### User Story 3 — Staple Ingredients with Thresholds (Priority: P3)

As a household member, I want to mark certain ingredients as "staples" with a minimum threshold so they are automatically added to my grocery list when stock runs low.

**Why this priority**: Independent of the cook workflow but depends on accurate inventory (US-1). Reduces the cognitive load of remembering to buy basics like salt, oil, eggs.

**Independent Test**: Mark "Olive Oil" as a staple with threshold 200ml. Reduce inventory to 50ml. Call `GET /api/v1/grocery-lists/staple-suggestions` and verify "Olive Oil" appears with `quantity_needed: 150`.

**Acceptance Scenarios**:

1. **Given** a user sets an ingredient as a staple with `min_threshold = 500g` **When** inventory of that ingredient drops to 400g (via auto-deduct or manual edit) **Then** the ingredient appears in staple suggestions with `quantity_needed = 100g`.

2. **Given** a staple ingredient is already on the current grocery list **When** inventory drops below threshold **Then** the system does not create a duplicate grocery item.

3. **Given** a user removes the staple flag from an ingredient **When** inventory is below the old threshold **Then** the ingredient no longer appears in staple suggestions.

4. **Given** staple suggestions exist **When** the user calls `POST /api/v1/grocery-lists/{id}/add-staples` **Then** all suggested staple items are added to the specified grocery list.

5. **Given** a staple ingredient has no inventory record at all **When** staple suggestions are computed **Then** the ingredient appears with `quantity_needed` equal to the full threshold amount.

---

### User Story 4 — Freezer Storage Location (Priority: P4)

As a household member, I want to store inventory items in the freezer with defrost-time tracking, and receive reminders to move items to the fridge before cooking day.

**Why this priority**: Adds a third storage location. Lower priority because fridge/pantry covers most use cases, but freezer support rounds out the inventory model.

**Independent Test**: Add an inventory item with `location: "freezer"` and `defrost_hours: 12`. Create a meal plan using that ingredient for tomorrow. Call `GET /api/v1/inventory/defrost-reminders` and verify the item appears with a "move to fridge by" timestamp.

**Acceptance Scenarios**:

1. **Given** a user adds an inventory item **When** they set `location` to "freezer" **Then** the item is stored with location "freezer" and an optional `defrost_hours` field.

2. **Given** a freezer item is an ingredient in a planned meal for day N **When** `defrost_hours` before the meal's expected cook time arrives **Then** the defrost reminder endpoint includes that item with `move_by` timestamp and `recipe_title`.

3. **Given** an ingredient's `default_storage` is "freezer" **When** the user adds that ingredient to inventory without specifying location **Then** the location defaults to "freezer."

4. **Given** a user moves a freezer item to "fridge" **When** they update the item's location via `PATCH /api/v1/inventory/{item_id}` **Then** the defrost reminder for that item is no longer returned.

5. **Given** the AI meal plan generator runs **When** freezer items are available **Then** the prompt includes freezer items with their defrost requirements so the AI can plan thaw timing.

---

### Edge Cases

- **Unit mismatch on deduction**: If a recipe uses "ml" but inventory is stored in "g" for the same ingredient, skip deduction for that ingredient and include a `unit_mismatch` warning in the response.
- **Concurrent deductions**: Two users mark the same slot as cooked simultaneously. Use optimistic locking (slot version or status check) so only one deduction succeeds; the second gets 409.
- **Leftover portions = 0**: Reject with 422 — portions must be ≥ 1.
- **Staple threshold = 0**: Reject with 422 — threshold must be > 0.
- **Freezer defrost_hours = null**: Treat as "no defrost needed" (e.g., ice cream). No reminder generated.
- **Migration rollback**: All new columns are nullable or have defaults so rollback drops columns cleanly.

---

## Requirements

### Functional Requirements

- **FR-001**: When `update_slot_status` transitions a slot to "cooked," invoke `InventoryService.deduct_for_recipe(recipe_id)` to subtract ingredient quantities.
- **FR-002**: Deduction response includes per-ingredient breakdown: `ingredient_id`, `ingredient_name`, `requested`, `deducted`, `remaining`, `unit_mismatch` (bool).
- **FR-003**: Deduction clamps inventory to zero — never negative. Enforced by existing DB check constraint `qty >= 0`.
- **FR-004**: New `Leftover` model: `id, meal_slot_id, recipe_id, household_id, portions (int), storage_location, expiry_date, used_at, created_at`.
- **FR-005**: `POST /leftovers` only allowed when slot status = "cooked."
- **FR-006**: Worker `build_prompt()` includes active leftovers (where `used_at IS NULL AND expiry_date >= today`) in the expiring-soon section.
- **FR-007**: New `StapleIngredient` model: `id, household_id, ingredient_id, min_threshold (float), unit, created_at`. Unique on `(household_id, ingredient_id)`.
- **FR-008**: `GET /grocery-lists/staple-suggestions` computes `max(0, min_threshold - current_qty)` per staple, returning items where result > 0.
- **FR-009**: `POST /grocery-lists/{id}/add-staples` bulk-adds staple suggestions to an existing grocery list.
- **FR-010**: `location` field on InventoryItem extended to accept "freezer". Pydantic Literal updated to `"fridge" | "pantry" | "freezer"`.
- **FR-011**: New nullable `defrost_hours` (Integer) column on InventoryItem.
- **FR-012**: `GET /inventory/defrost-reminders` returns freezer items that are ingredients in upcoming planned meals within the defrost window.
- **FR-013**: Worker `build_prompt()` includes freezer items with defrost info.
- **FR-014**: New nullable `is_staple` (Boolean, default False) and `min_threshold` (Float, nullable) columns on Ingredient — OR a separate `StapleIngredient` join table. Decision: **separate table** to keep Ingredient clean and support per-household staples.
- **FR-015**: Alembic migration `003_inventory_enhancements` adds all new columns and tables in a single migration.

### Key Entities

#### New: `Leftover`

| Column           | Type             | Constraints                               |
| ---------------- | ---------------- | ----------------------------------------- |
| id               | UNIQUEIDENTIFIER | PK, default newid()                       |
| meal_slot_id     | UNIQUEIDENTIFIER | FK → MealSlot.id, NOT NULL                |
| recipe_id        | UNIQUEIDENTIFIER | FK → Recipe.id, NOT NULL                  |
| household_id     | UNIQUEIDENTIFIER | FK → Household.id, NOT NULL               |
| portions         | Integer          | NOT NULL, CHECK > 0                       |
| storage_location | String(20)       | NOT NULL, "fridge" / "pantry" / "freezer" |
| expiry_date      | Date             | NOT NULL                                  |
| used_at          | DateTime         | nullable                                  |
| created_at       | DateTime         | NOT NULL, default sysutcdatetime()        |

#### New: `StapleIngredient`

| Column        | Type             | Constraints                         |
| ------------- | ---------------- | ----------------------------------- |
| id            | UNIQUEIDENTIFIER | PK, default newid()                 |
| household_id  | UNIQUEIDENTIFIER | FK → Household.id, NOT NULL         |
| ingredient_id | UNIQUEIDENTIFIER | FK → Ingredient.id, NOT NULL        |
| min_threshold | Float            | NOT NULL, CHECK > 0                 |
| unit          | String(20)       | NOT NULL, "g" / "ml" / "units"      |
| created_at    | DateTime         | NOT NULL, default sysutcdatetime()  |
|               |                  | UNIQUE(household_id, ingredient_id) |

#### Modified: `InventoryItem`

| Column        | Change                                            |
| ------------- | ------------------------------------------------- |
| location      | Allow "freezer" (String(20) already accommodates) |
| defrost_hours | **New** — Integer, nullable                       |

#### Modified: `Ingredient`

| Column          | Change                                            |
| --------------- | ------------------------------------------------- |
| default_storage | Allow "freezer" (String(20) already accommodates) |

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: After marking a slot cooked, inventory quantities for all recipe ingredients are reduced (verifiable via `GET /inventory`).
- **SC-002**: Leftover records are included in AI-generated meal plan prompts when unexpired.
- **SC-003**: Staple suggestions correctly compute shortfall quantities and do not duplicate items already on a grocery list.
- **SC-004**: Freezer items are storable, retrievable, and defrost reminders fire at the correct lead time.
- **SC-005**: All existing tests pass after migration. New tests cover each acceptance scenario.
- **SC-006**: `ruff check` passes on all Python files. `npx tsc --noEmit` passes on all TypeScript files. `npx vitest run` passes.
- **SC-007**: Alembic migration applies and rolls back cleanly on a fresh database.
