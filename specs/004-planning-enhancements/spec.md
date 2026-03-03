# Feature Specification: Planning Enhancements

**Feature Branch**: `004-planning-enhancements`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "Enhance meal planning capabilities: AI-powered ingredient substitution (P8), 'What can I make right now?' feature (P13), multi-meal-type planning for breakfast/lunch (P20), and recurring meal slots like 'Taco Tuesday every week' (P25)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — AI-Powered Ingredient Substitution (Priority: P1 🎯 MVP)

As a user viewing a meal plan recipe, I want to swap an ingredient I don't have or
don't want, and have the AI automatically update cooking steps, quantities, and the
grocery list so I don't have to figure out the adjustments myself.

When viewing a recipe in a meal slot, the user selects an ingredient and requests a
substitution. The system calls the AI with the full recipe context (all ingredients,
steps, equipment) plus the substitution request (e.g., "replace chicken with tofu").
The AI returns an updated recipe with modified ingredients (adjusted quantities/units),
updated cooking steps (different temperatures, times, techniques), and the system
automatically recalculates the grocery list. The original recipe is preserved via
`source_recipe_id` — the substituted version is a new Recipe linked to the original.

**Why this priority**: Ingredient substitution is the highest-impact planning
enhancement. Users frequently lack a specific ingredient or want to accommodate a
preference on the fly. Without this, users either skip the meal or manually adapt
the recipe — both reduce engagement. This directly leverages the existing AI
infrastructure (LLM client, prompt builder) and the `source_recipe_id` lineage
tracking already on the Recipe model.

**Independent Test**: Can be fully tested by generating a meal plan, selecting a
recipe, requesting an ingredient swap (e.g., "swap salmon for chicken"), and verifying
the returned recipe has updated ingredients, modified steps, and the grocery list
reflects the change. Delivers immediate standalone value — any plan becomes
customizable.

**Acceptance Scenarios**:

1. **Given** a meal slot has a recipe with "salmon" as an ingredient, **When** I
   request "substitute salmon with chicken", **Then** the recipe is updated with
   chicken at an appropriate quantity, cooking steps reflect chicken prep (different
   temperature/time), and the grocery list removes salmon and adds chicken.
2. **Given** I substitute an ingredient in a recipe, **When** I view the meal slot,
   **Then** the new recipe shows `source_recipe_id` pointing to the original, and
   "Save Original" is available to revert.
3. **Given** I substitute "butter" with "olive oil" in a baking recipe, **When** the
   AI updates the recipe, **Then** quantities are converted appropriately (e.g.,
   100g butter → 80ml olive oil) and steps referencing "melt butter" are updated
   to "heat olive oil".
4. **Given** a substitution would conflict with a household member's allergy (e.g.,
   substituting with peanut oil when a member is allergic to peanuts), **When** I
   request the substitution, **Then** the system warns about the allergy conflict
   before applying.
5. **Given** the user requests a substitution for an ingredient that doesn't exist in
   the recipe, **When** the request is made, **Then** the API returns a 400 error
   with a clear message.

---

### User Story 2 — What Can I Make Right Now? (Priority: P2)

As a user with ingredients in my inventory, I want to see what recipes I can make
right now without generating a full weekly plan, so I can quickly decide what to
cook tonight.

The system queries the user's current inventory, sends it to the AI with the
instruction "suggest 3-5 recipes using only these ingredients (plus common pantry
staples)", and returns quick recipe suggestions. Unlike full meal plan generation,
this is a lightweight, synchronous operation — no queue, no meal plan creation. The
user can then choose to cook a suggestion (which optionally creates a one-off meal
slot for tracking) or dismiss it.

**Why this priority**: This fills a gap the current system doesn't address — ad-hoc
cooking decisions. Full weekly plans are great for planning ahead, but users often
want to know "what can I make tonight?" The feature reuses inventory data and the
LLM client but introduces a new, simpler prompt path and a new API endpoint.

**Independent Test**: Can be tested by adding inventory items, calling the "what can
I make" endpoint, and verifying the returned suggestions use primarily on-hand
ingredients. Test with empty inventory should return a helpful message. Test with
expiring items should prioritize those ingredients.

**Acceptance Scenarios**:

1. **Given** my inventory has chicken, rice, broccoli, soy sauce, and garlic, **When**
   I request "what can I make right now?", **Then** the system suggests 3-5 recipes
   that primarily use those ingredients.
2. **Given** my inventory has items expiring within 2 days, **When** I request
   suggestions, **Then** recipes using those expiring items are prioritized.
3. **Given** my inventory is empty, **When** I request suggestions, **Then** the
   system returns a message indicating no suggestions are available and prompts me
   to add inventory.
4. **Given** I like a suggestion and tap "Cook This", **When** I confirm, **Then** a
   standalone meal slot is created with the recipe for tracking/rating purposes, and
   inventory is optionally deducted.

---

### User Story 3 — Multi-Meal-Type Planning (Priority: P3)

As a user, I want to plan breakfast and lunch in addition to dinner so that I have
a complete daily meal plan covering all meals.

The existing `MealSlot` model already has a `meal_type` field (String(20)) and a
unique constraint `uq_slot_plan_day_type` on `(meal_plan_id, day, meal_type)`,
meaning each combination of plan/day/type is unique. Currently, the worker
hardcodes `meal_type="dinner"` when creating slots. This enhancement extends the
system to support `breakfast`, `lunch`, and `dinner` meal types. The user specifies
which meal types to include when requesting a plan, and the AI generates recipes
appropriate for each meal type.

**Why this priority**: The schema already supports multi-meal types — this is
primarily a worker prompt change + frontend display change. It unlocks significantly
more value from the existing infrastructure without new models. Lower than P8 and P13
because dinner-only planning is functional for MVP; adding breakfast/lunch is an
expansion, not a fix.

**Independent Test**: Can be tested by requesting a plan with `meal_types=["breakfast",
"lunch", "dinner"]`, verifying the AI generates appropriate recipes for each type
(e.g., eggs/oatmeal for breakfast, sandwiches/salads for lunch), and confirming the
weekly plan view shows all meal types grouped by day.

**Acceptance Scenarios**:

1. **Given** I request a meal plan with `meal_types=["breakfast", "dinner"]`, **When**
   the AI generates the plan, **Then** each day has both a breakfast and dinner slot
   with type-appropriate recipes.
2. **Given** I request a plan with `meal_types=["breakfast", "lunch", "dinner"]`,
   **When** I view the weekly plan, **Then** each day shows three meal slots grouped
   and labeled by type.
3. **Given** I request a plan with only `meal_types=["dinner"]` (default), **When**
   the plan is generated, **Then** behavior is identical to current — no regression.
4. **Given** a breakfast recipe like "Overnight Oats", **When** the grocery list is
   generated, **Then** breakfast ingredients (oats, milk, berries) appear in the
   grocery list alongside dinner ingredients.

---

### User Story 4 — Recurring Meal Slots (Priority: P4)

As a user, I want to set up recurring meals like "Taco Tuesday every week" so that
when a new weekly plan is generated, those slots are pre-populated and the AI plans
around them.

The user creates a recurring meal template — a combination of day, meal_type, and
recipe (or recipe title/cuisine hint). When generating a new plan, the worker checks
for active recurring templates and pre-fills those slots before asking the AI to
generate the remaining meals. The AI prompt includes the pre-filled slots as
constraints: "Tuesday dinner is already set to Tacos — generate recipes for the
remaining 6 days."

**Why this priority**: Recurring meals are a nice-to-have that adds consistency for
families with fixed traditions. However, the core system works well without them.
This requires a new model (`RecurringMealTemplate`) and changes to the generation
flow, making it more complex than P20. Lowest priority because it's additive
convenience, not a capability gap.

**Independent Test**: Can be tested by creating a recurring template for "Tuesday
dinner = Chicken Tacos", generating a new plan, and verifying Tuesday's dinner slot
is pre-filled with Chicken Tacos while the remaining days are AI-generated.

**Acceptance Scenarios**:

1. **Given** I have a recurring template "Tuesday dinner = Chicken Tacos", **When**
   a new weekly plan is generated, **Then** Tuesday's dinner slot has "Chicken Tacos"
   pre-filled and the AI generates the remaining 6 dinner slots.
2. **Given** I have recurring templates for "Monday breakfast = Oatmeal" and
   "Friday dinner = Pizza Night", **When** a plan is generated, **Then** both slots
   are pre-filled and the AI fills the rest.
3. **Given** I create a recurring template, **When** I view my recurring templates,
   **Then** I see a list with day, meal_type, recipe title, and options to edit or
   delete.
4. **Given** I delete a recurring template, **When** the next plan is generated,
   **Then** that slot is no longer pre-filled and the AI generates it freely.
5. **Given** a recurring template references a recipe, **When** generating a plan,
   **Then** the pre-filled slot's ingredients are included in the grocery list
   calculation.

---

### Edge Cases

- **Substitution chain**: User substitutes ingredient A → B, then B → C in the same
  recipe. Each substitution creates a new Recipe with `source_recipe_id` chain.
  Display should show "Modified from: [original title]" not the intermediate version.
- **Substitution + allergy**: AI must respect all household member allergies when
  suggesting substitutions. The substitution prompt must include allergen constraints.
- **"What can I make" with only staples**: If inventory contains only staples (salt,
  pepper, oil), the system should suggest recipes that work with minimal ingredients
  or prompt the user to add more items.
- **Multi-meal calorie/portion logic**: Breakfast typically serves different portions
  than dinner. The AI prompt should specify meal-type-appropriate servings (e.g., 2
  servings for dinner, 2 for breakfast but lighter portions).
- **Recurring template + deleted recipe**: If a recurring template references a recipe
  that no longer exists, the system should treat the template's `recipe_title` as a
  hint for AI generation rather than failing.
- **Recurring template conflicts**: Two templates for the same day/meal_type should
  not be allowed (enforced by unique constraint).
- **Empty inventory + "what can I make"**: Return a friendly empty state, not an error.
- **Substitution for optional ingredient**: If the user substitutes an optional
  ingredient, the system should note it was optional and ask if they want to skip it
  instead.
- **Multi-meal + recurring overlap**: A recurring template specifies Tuesday dinner,
  but the plan request includes breakfast and lunch. The recurring template only fills
  Tuesday dinner; breakfast and lunch are AI-generated.

## Requirements _(mandatory)_

### Functional Requirements

**Ingredient Substitution (US1)**

- **FR-001**: System MUST allow users to request an ingredient substitution on any
  recipe in an active meal plan.
- **FR-002**: System MUST call the AI with full recipe context (ingredients, steps,
  equipment) plus the substitution request.
- **FR-003**: System MUST return an updated recipe with modified ingredients
  (quantities, units) and updated cooking steps (instructions, temperatures, times).
- **FR-004**: System MUST create a new Recipe with `source_recipe_id` pointing to
  the original, preserving lineage.
- **FR-005**: System MUST recalculate the grocery list after substitution — remove
  old ingredient needs, add new ones.
- **FR-006**: System MUST warn when a substitution would introduce an allergen for
  any household member.
- **FR-007**: System MUST validate the substitution request — target ingredient
  must exist in the recipe.

**What Can I Make Right Now (US2)**

- **FR-008**: System MUST provide an endpoint that accepts current inventory and
  returns 3-5 recipe suggestions using primarily on-hand ingredients.
- **FR-009**: System MUST prioritize recipes using ingredients expiring soonest.
- **FR-010**: System MUST return recipe suggestions synchronously (no queue, no
  plan creation) via a direct LLM call.
- **FR-011**: System MUST allow the user to "cook" a suggestion, creating a
  standalone meal slot for tracking purposes.
- **FR-012**: System MUST return a helpful empty state when inventory is insufficient
  for suggestions.

**Multi-Meal-Type Planning (US3)**

- **FR-013**: System MUST accept an optional `meal_types` parameter on plan creation
  (default: `["dinner"]` for backward compatibility).
- **FR-014**: System MUST generate meal-type-appropriate recipes (e.g., breakfast
  recipes for breakfast slots, not dinner recipes).
- **FR-015**: System MUST create MealSlot records with the correct `meal_type` value
  for each generated recipe.
- **FR-016**: System MUST include all meal-type ingredients in the grocery list
  calculation.
- **FR-017**: System MUST display meal slots grouped by meal type in the weekly
  plan view.

**Recurring Meal Slots (US4)**

- **FR-018**: System MUST allow users to create, list, update, and delete recurring
  meal templates.
- **FR-019**: System MUST store recurring templates with day (0-6), meal_type, and
  either a recipe_id or recipe_title hint.
- **FR-020**: System MUST pre-fill meal slots from active recurring templates when
  generating a new plan.
- **FR-021**: System MUST include pre-filled slot constraints in the AI prompt so
  the AI generates around them.
- **FR-022**: System MUST include pre-filled slot ingredients in the grocery list
  calculation.
- **FR-023**: System MUST enforce uniqueness on (household_id, day, meal_type) for
  recurring templates.

### Key Entities

- **Recipe** (existing): Already has `source_recipe_id` for lineage tracking. The
  substitution feature creates new Recipe rows linked to originals. No schema changes
  needed.

- **MealSlot** (existing): Already has `meal_type: String(20)` with unique constraint
  on `(meal_plan_id, day, meal_type)`. Currently only "dinner" is used. Multi-meal
  planning uses "breakfast", "lunch", "dinner" values. No schema changes needed.

- **RecurringMealTemplate** (new): Stores per-household recurring meal definitions.
  Links to a day of week, meal_type, and optionally a Recipe or a free-text recipe
  title hint. Active flag allows disabling without deleting.

- **CreateMealPlan** (existing Pydantic model): Extended with optional `meal_types`
  field. Defaults to `["dinner"]` for backward compatibility.

- **QuickSuggestion** (new Pydantic model): Response model for "what can I make"
  suggestions. Contains recipe title, description, ingredient list (with on-hand
  flags), estimated prep/cook time.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Ingredient substitution returns a valid updated recipe with modified
  steps in <10 seconds (p95), leveraging the existing LLM infrastructure.
- **SC-002**: Substituted recipes maintain `source_recipe_id` lineage in 100% of
  cases.
- **SC-003**: "What can I make" suggestions return 3-5 recipes using ≥80% on-hand
  ingredients within 8 seconds (p95).
- **SC-004**: Multi-meal plans generate the correct number of slots per day matching
  the requested `meal_types` (e.g., 3 meal types × 7 days = 21 slots).
- **SC-005**: Recurring templates pre-fill correct slots in 100% of generated plans.
- **SC-006**: Grocery list accurately reflects all ingredient needs across all meal
  types and substituted recipes.
- **SC-007**: No regression in dinner-only plan generation (default behavior unchanged
  when `meal_types` is not specified).
- **SC-008**: Recurring template CRUD operations complete in <200ms (p95).
