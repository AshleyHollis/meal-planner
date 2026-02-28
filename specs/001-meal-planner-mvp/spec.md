# Feature Specification: Meal Planner MVP

**Feature Branch**: `001-meal-planner-mvp`
**Created**: 2026-02-28
**Status**: Draft
**Input**: AI-powered weekly meal planner with pantry tracking, expiry-based waste reduction, Ninja Combi cooking steps, and plan-time/cook-time customization for 2 adults shopping at Coles

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pantry, Fridge & Equipment Inventory (Priority: P1)

As a home cook, I want to track what ingredients I have in my fridge and pantry
(including expiry dates) and register my cooking equipment, so the system knows
what I have available before suggesting meals.

I can add items to my fridge or pantry with a quantity and expiry date. I can see
at a glance what's expiring soon. I can register my cooking equipment (Ninja Combi,
stove top, oven, microwave) so the system knows what I can cook with.

**Why this priority**: Everything else depends on knowing what ingredients and
equipment are available. Without inventory data, AI meal planning cannot prioritize
expiring ingredients or generate equipment-appropriate recipes.

**Independent Test**: Can be fully tested by adding items to pantry/fridge with
expiry dates, registering equipment, and verifying the inventory displays correctly
with expiry warnings. Delivers standalone value as a kitchen inventory tracker.

**Acceptance Scenarios**:

1. **Given** I have no items tracked, **When** I add "chicken breast" to my fridge
   with quantity "500g" and expiry "2026-03-05", **Then** it appears in my fridge
   inventory with the expiry date displayed.
2. **Given** I have items in my fridge, **When** an item is within 2 days of expiry,
   **Then** it is visually highlighted as expiring soon.
3. **Given** I have items in my fridge, **When** an item is past its expiry date,
   **Then** it is visually highlighted as expired and I am prompted to confirm
   whether to discard or keep it.
4. **Given** I have no equipment registered, **When** I add "Ninja Combi" as
   cooking equipment, **Then** it appears in my equipment list and is available
   for meal planning.
5. **Given** I have items in my pantry, **When** I use some of an item, **Then**
   I can update the quantity to reflect what remains.

---

### User Story 2 - AI Weekly Meal Planning (Priority: P2)

As a home cook, I want AI to generate a weekly meal plan of simple, easy meals
for 2 adults that prioritizes using ingredients close to expiry, uses my available
cooking equipment (primarily the Ninja Combi), and sources ingredients from Coles.

The AI considers what's in my fridge/pantry, what's expiring soon, my registered
equipment, and my preference for simple meals. It produces a 7-day plan with
meals that include equipment-specific cooking steps (e.g., "Ninja Combi: Air Crisp
at 200C for 15 min" vs "Stove top: pan-fry on medium for 8 min").

**Why this priority**: This is the core value proposition. AI-driven meal planning
that accounts for real kitchen context (inventory, equipment, expiry) is what
differentiates this from a recipe app.

**Independent Test**: Can be tested by seeding inventory with a few ingredients
(some expiring soon) and equipment, requesting a weekly plan, and verifying the
AI produces 7 days of meals that reference the available ingredients and equipment.

**Acceptance Scenarios**:

1. **Given** I have ingredients in my inventory and equipment registered, **When**
   I request a weekly meal plan, **Then** the AI generates a plan with meals for
   each day of the week for 2 adults.
2. **Given** I have chicken expiring in 2 days and beef expiring in 6 days, **When**
   the AI generates a plan, **Then** meals using chicken appear earlier in the week
   than meals using beef.
3. **Given** I have a Ninja Combi registered, **When** the AI generates a recipe,
   **Then** cooking steps include Ninja Combi-specific instructions (mode, temperature,
   time) where applicable.
4. **Given** I request a meal plan, **When** the AI generates recipes, **Then** each
   recipe includes step-by-step cooking instructions organized by equipment used
   (e.g., "Ninja Combi steps", "Stove top steps", "No-cook/prep steps").
5. **Given** a generated meal plan, **When** I view a recipe, **Then** ingredient
   quantities are scaled for 2 servings.

---

### User Story 3 - Grocery List Generation (Priority: P3)

As a home cook, I want a consolidated grocery list generated from my weekly meal
plan that accounts for what I already have, so I can efficiently shop at Coles
without buying duplicates.

The system compares what the meal plan requires against what's already in my
fridge/pantry and produces a list of only what I need to buy. Items are grouped
in a way that makes shopping easy.

**Why this priority**: Without a grocery list, the meal plan is just a list of
ideas. The grocery list turns the plan into action. It depends on both the meal
plan (P2) and inventory (P1) being functional.

**Independent Test**: Can be tested by creating a meal plan with known ingredients,
seeding pantry with some of them, and verifying the grocery list contains only
the missing items with correct quantities.

**Acceptance Scenarios**:

1. **Given** I have a weekly meal plan and some ingredients already in my pantry,
   **When** I generate a grocery list, **Then** only the ingredients I need to
   buy are listed with quantities needed.
2. **Given** a recipe needs 500g of chicken and I have 200g in my fridge, **When**
   I generate the grocery list, **Then** it shows 300g of chicken needed.
3. **Given** multiple meals in the week use the same ingredient, **When** I generate
   the grocery list, **Then** quantities are consolidated into a single line item.
4. **Given** a generated grocery list, **When** I am shopping, **Then** I can
   check off items as I add them to my cart.
5. **Given** I have completed shopping, **When** I mark the grocery list as done,
   **Then** purchased items are added to my fridge/pantry inventory with
   quantities and I am prompted to enter expiry dates.

---

### User Story 4 - Meal Customization at Plan Time and Cook Time (Priority: P4)

As a home cook, I want to customize meals at two points: when I'm planning the
week (swap meals, modify recipes, adjust ingredients) and when I'm actually
cooking (simplify or add steps based on how much time and effort I have right now).

**Plan-time customization**: Before the week starts, I review the AI's suggested
plan and can swap meals between days, replace a meal entirely, add or remove
ingredients, or change the cooking method.

**Cook-time customization**: When I'm about to cook, I can tell the system "I have
30 minutes" or "I want minimal effort" and it adapts the recipe steps. For example,
it might suggest using the microwave to defrost instead of overnight thawing, or
skip a garnish step, or suggest a Ninja Combi mode that combines steps.

**Why this priority**: The two customization points are what make this app practical
for real life. Plans change, energy levels vary, and rigid meal plans get abandoned.
This flexibility keeps users engaged.

**Independent Test**: Can be tested by generating a meal plan, modifying a meal
at plan time, then opening a meal at cook time and adjusting the effort level,
verifying the recipe steps change accordingly.

**Acceptance Scenarios**:

1. **Given** I have a weekly meal plan, **When** I drag a meal from Monday to
   Wednesday, **Then** the meals swap positions and the grocery list updates
   accordingly.
2. **Given** I am viewing a planned meal, **When** I remove an ingredient, **Then**
   the recipe steps update to reflect the change and the grocery list adjusts.
3. **Given** I am about to cook a meal, **When** I indicate I have limited time,
   **Then** the system suggests simplified cooking steps (fewer steps, simpler
   techniques, or faster equipment modes).
4. **Given** I am about to cook a meal, **When** I indicate I want to add more
   effort, **Then** the system can suggest additional steps (e.g., marinating,
   toasting, a side dish).
5. **Given** I customize a meal at cook time, **When** I save the customized
   version, **Then** I can optionally save it as a personal variation for
   future use.

---

### User Story 5 - Leftover Tracking (Priority: P5)

As a home cook, I want to record leftovers after cooking a meal, so the AI can
factor them into future meal plans and I waste less food.

After cooking, I can mark how much of a meal is left over. Leftovers appear in
my fridge inventory with an estimated use-by date. The AI treats leftovers as
available ingredients when planning future meals (e.g., suggesting "leftover
chicken stir-fry" if I have leftover roast chicken).

**Why this priority**: Leftover tracking closes the feedback loop. Without it,
the system doesn't know what was actually consumed vs what remains, leading to
inaccurate inventory and wasted food. It enhances the waste reduction core feature.

**Independent Test**: Can be tested by cooking a meal, recording leftovers,
and verifying they appear in fridge inventory and are considered by the AI in
the next meal plan request.

**Acceptance Scenarios**:

1. **Given** I have cooked a meal, **When** I mark that I have leftovers, **Then**
   I can record the approximate quantity and it appears in my fridge inventory.
2. **Given** I have leftovers in my fridge, **When** the AI generates a meal plan,
   **Then** it suggests meals that incorporate or complement those leftovers.
3. **Given** I have leftovers with an estimated use-by date, **When** that date
   approaches, **Then** the leftovers are prioritized in the same way as expiring
   ingredients.
4. **Given** I have cooked a meal for 2, **When** I record that we only ate 1
   serving, **Then** 1 serving of leftovers is added to my fridge inventory.

---

### Edge Cases

- What happens when the fridge/pantry is nearly empty? The AI should generate
  a plan that is mostly grocery-dependent and clearly indicate a larger shopping
  list is needed.
- What happens when all registered equipment is unavailable (e.g., Ninja Combi
  is broken)? The user can temporarily disable equipment, and the AI replans
  using remaining equipment.
- What happens when the user doesn't complete the grocery shop (only buys some
  items)? The user can mark which items were purchased, and the system adjusts
  the meal plan to only include meals that are feasible with purchased ingredients.
- What happens when an ingredient is unavailable at Coles? The user can mark an
  item as unavailable, and the AI suggests a substitute or replans the affected
  meals.
- What happens when the user skips a planned meal? The unused ingredients remain
  in inventory and the meal can be rescheduled to a later day in the week.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add, edit, and remove items from fridge
  and pantry inventories with name, quantity, and optional expiry date.
- **FR-002**: System MUST visually distinguish items expiring within 2 days,
  expired items, and items with no expiry concern.
- **FR-003**: System MUST allow users to register and manage cooking equipment
  with names and supported cooking modes (e.g., Ninja Combi supports Air Crisp,
  Combi Cook, Slow Cook, Steam, Bake, etc.).
- **FR-004**: System MUST generate AI-powered weekly meal plans for 2 adults
  that prioritize ingredients closest to expiry.
- **FR-005**: System MUST generate recipes with cooking steps organized by
  equipment, including equipment-specific settings (mode, temperature, time).
- **FR-006**: System MUST generate consolidated grocery lists from meal plans,
  subtracting quantities already available in fridge/pantry.
- **FR-007**: System MUST allow meal customization at plan time (swap days,
  modify ingredients, change equipment/method).
- **FR-008**: System MUST allow meal customization at cook time (simplify or
  elaborate steps based on available time/effort).
- **FR-009**: System MUST allow users to record leftovers after cooking with
  quantity and estimated use-by date.
- **FR-010**: System MUST incorporate leftovers into future AI meal plan
  suggestions.
- **FR-011**: System MUST update fridge/pantry inventory when grocery shopping
  is marked complete.
- **FR-012**: System MUST allow users to check off grocery list items during
  shopping.
- **FR-013**: System MUST scale all recipe quantities for the configured
  household size (default: 2 adults).
- **FR-014**: System MUST authenticate users via Auth0 to persist their data
  across sessions.

### Key Entities

- **Household**: The user's household configuration (number of adults, default
  serving size). A household has one inventory and one equipment registry.
- **Inventory Item**: An ingredient in the fridge or pantry. Has a name, quantity
  (with unit), storage location (fridge/pantry), and optional expiry date.
- **Cooking Equipment**: A piece of kitchen equipment (e.g., Ninja Combi, oven).
  Has a name and a list of supported cooking modes with settings.
- **Meal Plan**: A weekly plan containing 7 days of meals. Belongs to a household.
  Has a status (draft/active/completed).
- **Meal**: A single meal within a plan (e.g., Monday dinner). References a recipe
  and can be customized at plan time.
- **Recipe**: A set of ingredients and equipment-specific cooking steps generated
  by AI. Can be an AI original or a user-modified variation.
- **Cooking Step**: A single instruction within a recipe, associated with a specific
  piece of equipment (or no equipment for prep steps). Includes settings like
  temperature, time, and mode.
- **Grocery List**: A consolidated shopping list derived from a meal plan. Contains
  line items with quantities needed after subtracting inventory.
- **Leftover**: A record of uneaten food after cooking a meal. Has a quantity and
  estimated use-by date. Stored as an inventory item in the fridge.

## Assumptions

- The household size is fixed at 2 adults for the MVP. Multi-household or
  variable household size is a future enhancement.
- Coles is the primary grocery store. No integration with Coles APIs is needed
  for MVP; the grocery list is a simple checklist.
- The Ninja Combi is the primary cooking equipment, but the system supports
  any equipment the user registers.
- "Simple/easy meals" is a preference communicated to the AI, not a hard system
  constraint. Users can override with more complex meals if desired.
- Meal plans cover dinners by default. Breakfast and lunch can be added as a
  future enhancement.
- Expiry dates are manually entered by the user. No barcode scanning or
  automatic detection for MVP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can set up their kitchen inventory (fridge, pantry, equipment)
  and generate their first AI weekly meal plan within 15 minutes of first use.
- **SC-002**: At least 80% of meals in a generated plan use ingredients that are
  already in the user's inventory or close to expiry.
- **SC-003**: Users can customize a meal at cook time (adjust effort/time) in
  under 30 seconds.
- **SC-004**: Generated grocery lists accurately reflect only the items the user
  needs to buy (no duplicates of items already in inventory).
- **SC-005**: Users report that meal plans reduce their food waste by helping them
  use expiring ingredients before they go bad.
- **SC-006**: Users complete the weekly plan-to-shop-to-cook cycle at least 3
  weeks in a row, indicating the system is practical enough for sustained use.
