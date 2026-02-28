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

### User Story 6 - Food Preferences & Dislikes (Priority: P6)

As a home cook, I want to set food preferences and dislikes for my household so
the AI never suggests meals with ingredients or cuisines we don't enjoy.

I can specify things we love (e.g., "Thai food", "pasta"), things we dislike
(e.g., "coriander", "liver"), and any dietary restrictions (e.g., "no shellfish").
The AI respects these preferences in every meal plan it generates.

**Why this priority**: Without preferences, the AI will generate meals that get
rejected and swapped frequently, undermining trust in the system. Preferences
reduce friction and make the AI feel personalized from day one.

**Independent Test**: Can be tested by setting a dislike (e.g., "coriander"),
generating a meal plan, and verifying no recipes include that ingredient.

**Acceptance Scenarios**:

1. **Given** I have set "coriander" as a dislike, **When** the AI generates a
   meal plan, **Then** no recipe includes coriander as an ingredient.
2. **Given** I have set "Thai food" as a preference, **When** the AI generates
   a meal plan, **Then** Thai-inspired meals appear more frequently than they
   would by default.
3. **Given** I have set "no shellfish" as a dietary restriction, **When** the AI
   generates a recipe, **Then** shellfish is never included, even as an optional
   or substitute ingredient.
4. **Given** I want to update my preferences, **When** I add or remove a
   preference, **Then** future meal plans reflect the change immediately.

---

### User Story 7 - Meal History & Favorites (Priority: P7)

As a home cook, I want the system to remember what I've cooked before so the AI
avoids repeating recent meals, and I can mark meals as favorites to request them
again easily.

The system tracks every meal I cook (date, recipe, any cook-time modifications).
When generating new plans, the AI avoids meals cooked in the last 2-3 weeks
unless I've favorited them. I can browse my history and re-add any past meal
to a future plan.

**Why this priority**: Repetition is a top reason people abandon meal planners.
History tracking keeps variety high, and favorites let users build a personal
cookbook of proven winners over time.

**Independent Test**: Can be tested by cooking several meals over multiple weeks,
verifying the AI avoids recent meals in new plans, and marking a meal as favorite
to confirm it can be re-requested.

**Acceptance Scenarios**:

1. **Given** I cooked "chicken stir-fry" last week, **When** the AI generates
   this week's plan, **Then** "chicken stir-fry" does not appear unless I have
   explicitly favorited it and requested repeats.
2. **Given** I have cooked 20+ meals over several weeks, **When** I view my meal
   history, **Then** I can see a chronological list of past meals with dates.
3. **Given** I mark a meal as a favorite, **When** I request a new meal plan,
   **Then** I can optionally ask the AI to include one or more favorites in the
   plan.
4. **Given** I am browsing my meal history, **When** I select a past meal,
   **Then** I can add it directly to a future meal plan (with the original or
   modified recipe).

---

### User Story 8 - Ingredient Substitution (Priority: P8)

As a home cook, I want to substitute ingredients in any recipe at any time — while
planning, while shopping, or while cooking — and have the AI update the recipe
steps accordingly.

For example, if I'm planning wraps for Tuesday, I can easily swap the meat from
chicken to beef. The AI updates the cooking steps (different times/temperatures
for beef vs chicken on the Ninja Combi), adjusts the grocery list, and updates
any affected inventory calculations. This works at any point in the workflow,
not just at the store.

**Why this priority**: Ingredient flexibility is essential for real-world cooking.
Preferences change, items go out of stock, or you simply feel like something
different. Without easy substitution, users work around the system instead of
with it.

**Independent Test**: Can be tested by opening a recipe, substituting one
ingredient for another, and verifying the cooking steps, grocery list, and
inventory calculations all update correctly.

**Acceptance Scenarios**:

1. **Given** I am viewing a recipe with chicken as a key ingredient, **When** I
   tap on chicken and select "substitute", **Then** the AI suggests alternative
   proteins with updated cooking instructions for each.
2. **Given** I substitute beef for chicken in a recipe, **When** I view the
   cooking steps, **Then** the Ninja Combi temperature and time are updated to
   reflect beef cooking requirements.
3. **Given** I substitute an ingredient in a planned meal, **When** I view the
   grocery list, **Then** the old ingredient is removed and the new one is added
   (accounting for what's already in inventory).
4. **Given** I am cooking and realize I'm out of an ingredient, **When** I tap
   "substitute" on that ingredient, **Then** the AI suggests alternatives based
   on what I currently have in my fridge/pantry.

---

### User Story 9 - Integrated Cooking Timers (Priority: P9)

As a home cook, I want to tap any cooking step that involves a duration and start
a timer, so I don't have to set separate timers on my phone or equipment.

When a recipe step says "Ninja Combi: Air Crisp at 200C for 15 min", I can tap
it to start a 15-minute countdown. Multiple timers can run simultaneously for
steps happening in parallel (e.g., Ninja Combi and stove top at the same time).
Timers alert me with a sound when complete.

**Why this priority**: Timers remove the cognitive load of tracking multiple
cooking steps. Since many meals involve parallel equipment use, built-in timers
keep the cook focused on the food, not the clock.

**Independent Test**: Can be tested by opening a recipe with timed steps, starting
a timer, and verifying it counts down and alerts when complete. Test with multiple
simultaneous timers.

**Acceptance Scenarios**:

1. **Given** a cooking step says "Air Crisp at 200C for 15 min", **When** I tap
   the step, **Then** a 15-minute countdown timer starts and is visible on screen.
2. **Given** I have two cooking steps running in parallel on different equipment,
   **When** I start timers for both, **Then** both timers are visible simultaneously
   and count down independently.
3. **Given** a timer is running, **When** it reaches zero, **Then** the app plays
   an audible alert and shows a notification (even if the app is in the background).
4. **Given** a timer is running, **When** I navigate to another part of the app,
   **Then** the timer continues running and remains accessible.

---

### User Story 10 - Hands-Free Voice Assistant (Priority: P10)

As a home cook with messy hands, I want to navigate recipes and control the app
using voice commands so I don't have to touch my phone while cooking.

I can say "next step" to advance through recipe steps, "start timer" to begin
a countdown, "repeat" to hear the current step again, and "what's next" to
preview the upcoming step. The app reads steps aloud and responds to voice
commands.

**Why this priority**: Cooking is a hands-on activity. Touching a phone with
wet, greasy, or flour-covered hands is impractical. Voice control makes the app
usable during the messiest part of the workflow — actually cooking.

**Independent Test**: Can be tested by opening a recipe in hands-free mode,
using voice commands to navigate through steps, start timers, and hear
instructions read aloud.

**Acceptance Scenarios**:

1. **Given** I am viewing a recipe, **When** I activate hands-free mode, **Then**
   the current cooking step is read aloud and the app begins listening for voice
   commands.
2. **Given** hands-free mode is active, **When** I say "next step", **Then** the
   app advances to the next cooking step and reads it aloud.
3. **Given** hands-free mode is active, **When** I say "start timer", **Then**
   a timer starts for the current step's duration (if the step has one).
4. **Given** hands-free mode is active, **When** I say "what do I need", **Then**
   the app reads the list of ingredients for the current recipe.
5. **Given** hands-free mode is active, **When** I say "repeat", **Then** the
   app re-reads the current step.

---

### User Story 11 - Freezer Tracking (Priority: P11)

As a home cook, I want to track items in my freezer separately from the fridge
and pantry, because frozen items have different shelf lives and the AI should
know what I have frozen when planning meals.

Freezer items have longer expiry windows than fridge items but still expire.
The AI should factor in defrost time when suggesting frozen ingredients (e.g.,
"take the chicken out of the freezer tonight for tomorrow's meal"). I can also
freeze leftovers and batch-cooked meals.

**Why this priority**: The freezer is a key part of kitchen inventory that the
fridge/pantry story doesn't cover. Frozen meals and ingredients are common for
households that batch cook or buy in bulk, and ignoring the freezer leads to
inaccurate inventory and missed opportunities.

**Independent Test**: Can be tested by adding items to the freezer, generating
a meal plan, and verifying the AI suggests frozen items with appropriate defrost
instructions.

**Acceptance Scenarios**:

1. **Given** I have chicken in my freezer, **When** the AI plans a meal using
   that chicken for Wednesday, **Then** the plan includes a note to defrost the
   chicken the night before (Tuesday).
2. **Given** I have a batch-cooked meal in my freezer, **When** the AI generates
   a plan, **Then** it can suggest using that frozen meal as a quick option on
   a busy night.
3. **Given** I have cooked a meal with leftovers, **When** I record the leftovers,
   **Then** I can choose to store them in the fridge (short expiry) or freezer
   (longer expiry).
4. **Given** I have items in my freezer approaching their frozen shelf life,
   **When** I view my inventory, **Then** those items are flagged for use soon,
   just like expiring fridge items.

---

### User Story 12 - Shared Household & Grocery List (Priority: P12)

As part of a two-person household, I want both adults to have their own accounts
that share the same household data (inventory, equipment, meal plans, grocery
lists) so either of us can shop, cook, or plan.

Each person logs in with their own account and has their own food preferences
and dislikes. But the household inventory, equipment, meal plans, and grocery
lists are shared. When one person checks off a grocery item at Coles, the other
person sees it update in real time. Either person can add items to inventory,
plan meals, or record leftovers.

**Why this priority**: In a two-person household, either adult may do the shopping
or cooking on any given day. If the data is locked to one account, the other
person can't participate, making the app impractical for shared household use.

**Independent Test**: Can be tested by creating two accounts in the same household,
verifying both see the same inventory and grocery list, and confirming that
checking off an item on one device is reflected on the other.

**Acceptance Scenarios**:

1. **Given** two users belong to the same household, **When** Person A adds an
   item to the pantry, **Then** Person B sees it in their inventory view.
2. **Given** a shared grocery list, **When** Person A checks off "milk" while
   shopping, **Then** Person B sees "milk" checked off in real time.
3. **Given** Person A dislikes coriander and Person B likes it, **When** the AI
   generates a meal plan, **Then** it respects both preferences (e.g., serves
   coriander on the side or avoids it entirely depending on household rules).
4. **Given** a household with two members, **When** Person B is invited to join,
   **Then** they can join via an invitation link and immediately see all shared
   household data.
5. **Given** either person is cooking, **When** they record leftovers or update
   inventory, **Then** the changes are visible to both household members.

---

### User Story 13 - "What Can I Make Right Now?" (Priority: P13)

As a home cook looking for a quick snack or impromptu meal, I want to ask the
system "what can I make right now?" and get instant suggestions based on what's
currently in my fridge, pantry, and freezer — without affecting my weekly plan.

This is an ad-hoc mode separate from the weekly meal plan. I tell the system how
much time I have (e.g., "10 minutes", "30 minutes") and it suggests quick meals
or snacks using only what's already available. It still prioritizes expiring
ingredients. Results are simple suggestions, not full planned meals.

**Why this priority**: Not every eating occasion is a planned dinner. Snacks,
quick lunches, and "I'm hungry now" moments are common. Providing instant
suggestions keeps users engaged with the app daily, not just during weekly
planning.

**Independent Test**: Can be tested by seeding inventory with various ingredients,
requesting suggestions with a 15-minute time constraint, and verifying the
suggestions only use available ingredients and are achievable in 15 minutes.

**Acceptance Scenarios**:

1. **Given** I have eggs, bread, and cheese in my inventory, **When** I ask
   "what can I make in 10 minutes?", **Then** the AI suggests quick options like
   a grilled cheese or scrambled eggs on toast.
2. **Given** I have avocado expiring today, **When** I ask "what can I make right
   now?", **Then** the suggestions prioritize recipes that use the avocado.
3. **Given** the AI suggests a snack, **When** I select it and cook it, **Then**
   the inventory is updated to reflect the ingredients used (but the weekly meal
   plan is not affected).
4. **Given** I specify "10 minutes" as my available time, **When** the AI suggests
   meals, **Then** none of the suggestions require more than 10 minutes of total
   preparation and cooking time.

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
- What happens when preferences conflict with expiring ingredients? (e.g., the
  only expiring item is something the user dislikes) The AI should note the
  conflict and suggest alternatives that still minimize waste, or flag the item
  for the user to decide.
- What happens when the user has cooked every meal in their favorites and history
  recently? The AI generates new meal suggestions while noting it has exhausted
  the user's recent repertoire.
- What happens when a substitution changes the cooking equipment needed? (e.g.,
  swapping raw chicken for pre-cooked chicken removes the Ninja Combi step) The
  AI updates the full recipe including equipment steps.
- What happens when voice recognition misinterprets a command? The app should
  confirm destructive actions (like "skip step") and allow "undo" via voice.
- What happens when both household members edit the meal plan simultaneously?
  The most recent change wins, with a notification to the other person.
- What happens when one household member's preferences directly conflict with
  the other's? (e.g., Person A loves seafood, Person B has a seafood restriction)
  Restrictions always take priority over preferences.
- What happens when the freezer has items but no defrost time is available?
  The AI should not suggest frozen items for same-day meals unless they can be
  cooked from frozen.
- What happens when the user asks "what can I make?" but the inventory is nearly
  empty? The system should honestly say there aren't enough ingredients and
  suggest adding items or doing a grocery run.

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
- **FR-015**: System MUST allow users to set food preferences (likes), dislikes,
  and dietary restrictions that the AI respects in all meal plan generation.
- **FR-016**: System MUST track meal cooking history with dates and recipes used.
- **FR-017**: System MUST allow users to mark meals as favorites for easy
  re-selection in future plans.
- **FR-018**: AI MUST avoid suggesting meals cooked in the last 2-3 weeks unless
  the user explicitly requests a favorite.
- **FR-019**: System MUST be designed mobile-first, optimized for use while
  shopping at the store and cooking in the kitchen.
- **FR-020**: System MUST display in-app alerts for items approaching expiry,
  with contextual recipe suggestions that use those items.
- **FR-021**: System MUST allow ingredient substitution at any point in the
  workflow (planning, shopping, cooking) and automatically update recipe steps,
  grocery lists, and inventory calculations.
- **FR-022**: System MUST provide tappable cooking timers on any recipe step that
  involves a duration, supporting multiple simultaneous timers with audible alerts.
- **FR-023**: System MUST provide a hands-free voice assistant mode for recipe
  navigation during cooking, supporting commands for step navigation, timer
  control, and ingredient read-back.
- **FR-024**: System MUST support freezer as a third storage location alongside
  fridge and pantry, with appropriate shelf life expectations and defrost
  time considerations in meal planning.
- **FR-025**: System MUST support multi-user households where inventory, equipment,
  meal plans, and grocery lists are shared, while food preferences are per-person.
- **FR-026**: Grocery list updates MUST be visible to all household members in
  real time.
- **FR-027**: System MUST provide an ad-hoc "what can I make right now?" mode
  that suggests quick meals or snacks based on current inventory and available
  time, without affecting the weekly meal plan.
- **FR-028**: Dietary restrictions MUST always take priority over preferences
  when household members have conflicting food opinions.

### Key Entities

- **Household**: A shared unit containing multiple members. Owns the shared
  inventory (fridge, pantry, freezer), equipment registry, meal plans, and
  grocery lists. Has a default serving size based on number of members.
- **Household Member**: A person within a household. Has their own authentication
  (Auth0 account), personal food preferences/dislikes/restrictions. Can be
  invited to join a household via invitation link.
- **Inventory Item**: An ingredient in the fridge, pantry, or freezer. Has a name,
  quantity (with unit), storage location (fridge/pantry/freezer), and optional
  expiry date. Frozen items have longer shelf life expectations.
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
- **Food Preference**: A like, dislike, or dietary restriction associated with a
  specific household member (not the household as a whole). Has a type
  (like/dislike/restriction), a value (ingredient name, cuisine type, or
  category). The AI considers all members' preferences when generating plans,
  with restrictions always overriding preferences.
- **Meal History Entry**: A record of a meal that was cooked. Has a date, reference
  to the recipe used (including any cook-time modifications), and a favorite flag.

## Assumptions

- The default household is 2 adults. The system supports multiple members per
  household with individual accounts. Supporting multiple households per user
  is a future enhancement.
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
- The app is mobile-first but also works on desktop. No native mobile app;
  it is a responsive web application accessed via mobile browser.
- Expiry alerts are in-app only (no push notifications for MVP). Alerts appear
  when the user opens the app.
- "Last 2-3 weeks" for meal repetition avoidance is a soft guideline for the
  AI, not a hard constraint. Users can override by requesting favorites.
- Voice assistant uses the Web Speech API (browser-native) for MVP. No
  third-party voice service integration needed.
- Real-time grocery list sync uses the existing infrastructure (no separate
  real-time service needed for MVP; polling or server-sent events is acceptable).
- "What can I make right now?" suggestions are lightweight AI calls that do not
  create meal plan entries or full recipes unless the user chooses to cook one.
- Freezer defrost times are AI-estimated based on item type and quantity. No
  precise defrost science is needed for MVP.

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
