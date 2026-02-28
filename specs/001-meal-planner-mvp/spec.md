# Feature Specification: Meal Planner MVP

**Feature Branch**: `001-meal-planner-mvp`
**Created**: 2026-02-28
**Status**: Draft
**Input**: AI-powered weekly meal planner with pantry tracking, expiry-based waste reduction, Ninja Combi cooking steps, multi-shop product catalogue, and plan-time/cook-time customization for 2 adults

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
cooking equipment (primarily the Ninja Combi), and sources ingredients from my
preferred shops.

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
plan that accounts for what I already have, so I can efficiently shop without
buying duplicates.

The system compares what the meal plan requires against what's already in my
fridge/pantry and produces a list of only what I need to buy. Items show the
specific product, brand, and shop, and are grouped by shop for efficient
multi-store trips.

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
Timers send push notifications when complete — even if I've left the app — so
I know when to come back and do the next step, or when the meal is ready to eat.

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
3. **Given** a timer is running, **When** it reaches zero, **Then** the app sends
   a push notification with the step name and what to do next (e.g., "Chicken is
   done — remove from Ninja Combi and let rest for 5 min"), even if the app is
   in the background or the screen is off.
4. **Given** a meal has multiple timed steps in sequence, **When** one timer
   completes, **Then** the push notification tells me what the next action is
   (e.g., "Flip the chicken and cook for another 8 min") so I know exactly what
   to do without opening the app.
5. **Given** the final timer in a recipe completes, **When** the notification
   fires, **Then** it says the meal is ready to eat (e.g., "Dinner is ready!
   Honey Garlic Chicken — serve and enjoy").
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

### User Story 14 - Inventory Auto-Deduction After Cooking (Priority: P14)

As a home cook, I want the system to automatically deduct the ingredients I used
when I cook a meal, so my inventory stays accurate without me manually updating
every item.

When I mark a meal as "cooked", the system knows the recipe's ingredient list and
quantities. It deducts those amounts from my fridge, pantry, or freezer inventory.
If I made any substitutions (P8) or cook-time modifications (P4), the deduction
reflects the actual ingredients used, not the original recipe.

**Why this priority**: Without auto-deduction, inventory drifts out of sync within
a single week. The user would have to manually update every ingredient after every
meal, which is tedious and error-prone. Inaccurate inventory undermines the AI's
ability to plan future meals and generate correct grocery lists.

**Independent Test**: Can be tested by adding known quantities to inventory, cooking
a meal with a known recipe, and verifying the inventory quantities decrease by the
correct amounts.

**Acceptance Scenarios**:

1. **Given** I have 1kg of chicken in my fridge and a recipe uses 500g, **When** I
   mark the meal as cooked, **Then** my fridge shows 500g of chicken remaining.
2. **Given** I substituted beef for chicken at cook time, **When** I mark the meal
   as cooked, **Then** beef is deducted (not chicken) from my inventory.
3. **Given** a recipe uses 2 tablespoons of olive oil from my pantry, **When** I
   mark the meal as cooked, **Then** the olive oil quantity in my pantry is reduced
   accordingly.
4. **Given** the recipe calls for an ingredient I don't have tracked in inventory
   (e.g., salt), **When** I mark the meal as cooked, **Then** the system skips
   that ingredient without error and does not create a negative inventory entry.
5. **Given** I scaled the recipe up for guests, **When** I mark the meal as cooked,
   **Then** the deducted quantities reflect the scaled amounts, not the default
   serving size.

---

### User Story 15 - Staples & Always-Have Items (Priority: P15)

As a home cook, I want to mark certain items as "staples" — things I always want
to have on hand (salt, olive oil, butter, bread, milk, eggs) — so the grocery
list reminds me to restock them when they're running low, even if no recipe this
week specifically calls for them.

I set a minimum threshold for each staple (e.g., "always have at least 1L of
milk"). When my inventory drops below that threshold, the item automatically
appears on my grocery list. This prevents extra trips to the store for basics
I forgot to buy.

**Why this priority**: Forgetting staples is one of the most common reasons for
unplanned grocery runs. A meal planner that only tracks recipe-specific
ingredients misses the essentials that make a kitchen functional day-to-day.

**Independent Test**: Can be tested by marking "milk" as a staple with a minimum
of 1L, reducing inventory to 500ml, and verifying milk appears on the grocery
list even without a recipe requiring it.

**Acceptance Scenarios**:

1. **Given** I have marked "milk" as a staple with a minimum of 1L, **When** my
   milk inventory drops below 1L, **Then** milk appears on my grocery list with
   the quantity needed to reach 1L.
2. **Given** I have 10 staples configured, **When** I generate a grocery list
   from a meal plan, **Then** low staples are included alongside the meal plan
   ingredients, clearly labelled as "Staples to restock."
3. **Given** I buy milk and update my inventory to 2L, **When** I view my grocery
   list, **Then** milk no longer appears (it's above the minimum threshold).
4. **Given** I want to add a new staple, **When** I mark an existing inventory
   item as a staple and set a minimum quantity, **Then** it is monitored going
   forward.

---

### User Story 16 - Prep & Defrost Reminders (Priority: P16)

As a home cook, I want the system to send me push notifications for things I need
to do ahead of time — like defrosting meat the night before or starting a
marinade in the morning — so I don't forget and end up unable to cook the planned
meal.

The AI knows when a recipe requires advance preparation (defrosting, marinating,
soaking, slow-cooking start times) and schedules push notifications at the right
time. For example, if Wednesday's dinner uses frozen chicken, I get a notification
Tuesday evening: "Take the chicken out of the freezer for tomorrow's Honey Garlic
Chicken."

**Why this priority**: Forgetting to defrost or prep is a top reason planned meals
fall apart. The meal plan already contains this information (P11 defrost notes,
P4 recipe steps) — it just needs to proactively remind the user at the right
moment rather than relying on them to check the plan.

**Independent Test**: Can be tested by creating a meal plan with a recipe that
uses a frozen ingredient, and verifying a push notification is scheduled for the
evening before with the correct defrost instruction.

**Acceptance Scenarios**:

1. **Given** Wednesday's dinner uses frozen chicken, **When** Tuesday at 7pm
   arrives, **Then** I receive a push notification: "Take the chicken out of the
   freezer for tomorrow's Honey Garlic Chicken."
2. **Given** a recipe requires marinating for 4 hours, **When** the day of that
   meal arrives, **Then** I receive a notification at the right time (e.g., 2pm
   for a 6pm dinner): "Start marinating the chicken for tonight's dinner."
3. **Given** I have multiple prep tasks for different days, **When** I view my
   upcoming reminders, **Then** I can see all scheduled prep notifications in
   a list.
4. **Given** I swap a meal to a different day (P4), **When** the plan updates,
   **Then** the prep reminders automatically reschedule to match the new day.
5. **Given** I dismiss or snooze a reminder, **When** I snooze it, **Then** it
   re-notifies me after the snooze period.

---

### User Story 17 - Recipe Feedback & AI Learning (Priority: P17)

As a home cook, I want to rate meals after cooking them and provide feedback on
what worked and what didn't, so the AI learns my household's tastes and improves
its suggestions over time.

After cooking, I can give a quick rating (thumbs up/down or 1-5 stars) and
optionally leave a note (e.g., "Ninja Combi timing was 5 min too long", "needed
more garlic", "kids loved this one"). The AI uses this feedback to adjust future
meal plans — suggesting more meals similar to highly-rated ones, avoiding
patterns from poorly-rated ones, and correcting equipment-specific settings.

**Why this priority**: The AI's suggestions are only as good as the feedback loop.
Favorites (P7) capture "I want this again" but not "this was mediocre" or "the
cooking time was wrong." Feedback turns the AI from a static recipe generator
into a system that genuinely learns your household's preferences over time.

**Independent Test**: Can be tested by cooking several meals, rating them
differently, and verifying the AI's next meal plan reflects the feedback (e.g.,
more meals similar to 5-star ratings, fewer similar to 1-star ratings).

**Acceptance Scenarios**:

1. **Given** I have just cooked a meal, **When** I am prompted for feedback,
   **Then** I can give a quick rating (thumbs up/down) with a single tap.
2. **Given** I want to provide detailed feedback, **When** I tap "add notes",
   **Then** I can write a free-text note about what to change (e.g., "reduce
   Ninja Combi time by 5 min").
3. **Given** I rated a meal poorly and noted "too spicy", **When** the AI
   generates future plans, **Then** it reduces the spice level in similar
   recipes or avoids that flavour profile.
4. **Given** I noted "Ninja Combi Air Crisp was 5 min too long" on a recipe,
   **When** the AI generates a similar recipe in the future, **Then** it adjusts
   the Air Crisp time accordingly.
5. **Given** I have rated 20+ meals over several weeks, **When** I view my
   feedback history, **Then** I can see my ratings and notes alongside the meal
   history (P7).

---

### User Story 18 - Multi-Shop Product Catalogue & Specials (Priority: P18)

As a home cook who shops at multiple stores (Coles, Woolworths, Aldi, etc.), I
want the system to know which shops I use, what products each shop sells for
a given ingredient (brand, size, price), and what's on special this week — so
the grocery list tells me exactly what to buy and where, and the AI can plan
around the best deals.

An abstract ingredient like "BBQ sauce" maps to concrete products: "Masterfoods
BBQ Sauce 500ml" at Coles for $4.50, "Fountain BBQ Sauce 500ml" at Woolworths
for $3.80. Different brands may affect cooking — a thicker sauce needs different
quantities, a sweeter one changes the recipe balance. The AI accounts for these
differences when generating cooking steps.

I can register my preferred shops, build up a product catalogue over time (the
system learns what I buy), and flag specials from any shop before generating a
meal plan.

**Why this priority**: Real households don't shop at a single store. Different
stores have different prices, brands, and availability. A grocery list that says
"500ml BBQ sauce" is less useful than one that says "Masterfoods BBQ Sauce 500ml
— Coles $4.50 / Fountain BBQ Sauce 500ml — Woolworths $3.80 (on special)."
Product-level awareness also lets the AI adjust recipes based on the actual
product purchased.

**Independent Test**: Can be tested by registering two shops, adding products
for "BBQ sauce" at each, flagging one as on special, generating a meal plan,
and verifying the grocery list shows the specific product and shop with the
special highlighted.

**Acceptance Scenarios**:

1. **Given** I have registered Coles and Woolworths as my shops, **When** I add
   a product for "chicken thighs", **Then** I can specify the brand, size, and
   price at each shop (e.g., "Coles Finest Chicken Thighs 1kg — $12" and
   "Woolworths Free Range Chicken Thighs 800g — $10").
2. **Given** I have products mapped at multiple shops, **When** I view the
   grocery list, **Then** each item shows the specific product, brand, size,
   and shop — not just the generic ingredient name.
3. **Given** "Fountain BBQ Sauce" is on special at Woolworths, **When** the AI
   generates a meal plan using BBQ sauce, **Then** it prioritizes that product
   and adjusts the recipe if the brand differs from what was originally planned
   (e.g., different quantity needed due to different bottle size).
4. **Given** a recipe uses "BBQ sauce" and I purchased "Masterfoods Smoky BBQ
   Sauce" (which is thicker than the default), **When** I view the cooking
   steps, **Then** the AI notes any adjustment needed (e.g., "Masterfoods is
   thicker — use 2 tbsp instead of 3").
5. **Given** I flag items as on special at Woolworths and Coles, **When** the AI
   generates a plan, **Then** it considers specials across all shops (expiry
   still takes priority over price).
6. **Given** I have built up a product catalogue over several weeks, **When** I
   add a new ingredient to a recipe, **Then** the system suggests products I've
   previously bought and their shop/price.
7. **Given** I have specials from last week, **When** a new week starts, **Then**
   the old specials are cleared and I can enter new ones for each shop.

---

### User Story 19 - Offline Mode (Priority: P19)

As a home cook who shops at stores where mobile signal is often poor and cooks
in my kitchen, I want the app to work fully offline so I can access my grocery
list, recipes, and meal plan without an internet connection.

The current week's meal plan, all associated recipes, the grocery list, and
my inventory are cached locally. I can check off grocery items, view recipe
steps, start timers, and use hands-free mode without internet. When connectivity
returns, changes sync automatically with the server so my household member
sees the updates.

**Why this priority**: Two of the three primary use locations — the grocery store
and the kitchen — often have unreliable internet. If the app fails when the user
needs it most, they'll stop using it. Offline support makes the app dependable
in real conditions.

**Independent Test**: Can be tested by loading the app with a meal plan, turning
off internet connectivity, and verifying the grocery list, recipes, and timers
all function correctly. Then reconnect and verify changes sync.

**Acceptance Scenarios**:

1. **Given** I have an active meal plan, **When** I lose internet connectivity,
   **Then** I can still view all meals, recipes, and cooking steps for the
   current week.
2. **Given** I am offline at the shop, **When** I check off items on the grocery
   list, **Then** the changes are saved locally and sync when I reconnect.
3. **Given** I am cooking offline, **When** I start a timer, **Then** the timer
   runs and alerts me when complete (push notification may not work offline,
   but the in-app alert does).
4. **Given** I was offline and made changes, **When** I reconnect, **Then** my
   changes sync to the server and my household member sees them.
5. **Given** both household members were offline and made conflicting changes,
   **When** both reconnect, **Then** the system merges changes sensibly (e.g.,
   both checked off different items — both are marked done).

---

### User Story 20 - Full-Day Meal Planning (Priority: P20)

As a home cook, I want the weekly meal plan to cover breakfast, lunch, and dinner
— not just dinners — so I have a complete picture of what to eat and what to buy
for the entire week.

Each day in the plan has three meal slots: breakfast, lunch, and dinner. The AI
generates meals for all three slots, but I can leave any slot blank or mark it
as "eating out" if I don't need a plan for that meal. The grocery list accounts
for all planned meals across all slots.

**Why this priority**: Planning only dinners leaves most of the day unplanned.
Ingredients for lunch and breakfast still need to be bought, and without planning
them, users either overbuy or make extra trips. Full-day planning gives the
complete picture needed for a single, efficient weekly shop.

**Independent Test**: Can be tested by generating a full week plan and verifying
each day has breakfast, lunch, and dinner slots. Verify the grocery list includes
ingredients from all three meal types.

**Acceptance Scenarios**:

1. **Given** I request a weekly meal plan, **When** the AI generates it, **Then**
   each day has slots for breakfast, lunch, and dinner with suggested meals.
2. **Given** I don't want a planned breakfast on weekdays, **When** I configure
   my preferences, **Then** I can set breakfast to "skip" or "repeat" (same
   simple breakfast every day, e.g., toast and eggs) for weekdays.
3. **Given** I am eating out for lunch on Wednesday, **When** I mark Wednesday
   lunch as "eating out", **Then** no recipe is generated for that slot and the
   grocery list excludes those ingredients.
4. **Given** a full day of meals, **When** I view the grocery list, **Then**
   ingredients from breakfast, lunch, and dinner are all consolidated.
5. **Given** I want simple breakfasts, **When** the AI generates breakfast
   suggestions, **Then** they are quick, low-effort meals (e.g., overnight oats,
   toast, smoothie) unless I request otherwise.

---

### User Story 21 - Freezable Recipe Tagging & Freeze-Before-Expiry (Priority: P21)

As a home cook, I want recipes tagged as "freezable" so I know which meals I can
batch cook and freeze, and I want the AI to suggest moving ingredients to the
freezer before they expire if they're not planned for use this week.

Some recipes freeze well (soups, casseroles, bolognese) and others don't (salads,
stir-fries with crispy vegetables). Knowing which recipes are freezable lets me
deliberately cook extra and freeze portions for busy nights. Separately, if I
have chicken in my fridge expiring in 3 days and no meal planned to use it, the
AI should suggest "freeze the chicken now to extend its life" rather than letting
it go to waste.

**Why this priority**: This closes two gaps. First, it enables deliberate batch-
to-freezer meal prep (cook 4 portions, eat 2, freeze 2). Second, it adds a
fallback for the waste reduction system — when the AI can't plan a meal around
expiring ingredients, freezing them is the next best option.

**Independent Test**: Can be tested by generating a meal plan, verifying freezable
recipes are tagged, and checking that an expiring ingredient not used in any
planned meal triggers a "freeze it" suggestion.

**Acceptance Scenarios**:

1. **Given** the AI generates a recipe for bolognese, **When** I view the recipe,
   **Then** it is tagged as "freezable" with a recommended freeze duration
   (e.g., "freezes well for up to 3 months").
2. **Given** I cooked 4 portions of bolognese and ate 2, **When** I record
   leftovers, **Then** I can choose "freeze 2 portions" and they are added to my
   freezer inventory with a freeze date and recommended use-by date.
3. **Given** I have chicken in my fridge expiring in 3 days and no meal this week
   uses it, **When** I view my inventory or the AI generates a plan, **Then**
   the system suggests "Freeze the chicken now — it will keep for 3 months in the
   freezer."
4. **Given** I have frozen bolognese portions in my freezer, **When** the AI
   generates a future meal plan, **Then** it can suggest using those portions
   as a quick dinner on a busy night.
5. **Given** a recipe is tagged as not freezable, **When** I cook extra portions,
   **Then** the system warns me that leftovers should be consumed within the
   fridge shelf life rather than frozen.

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
- What happens when an ingredient is unavailable at a shop? The user can mark an
  item as unavailable, and the AI suggests a substitute, an alternative product
  from another shop, or replans the affected meals.
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
- What happens when auto-deduction would make an inventory item go negative?
  (e.g., recipe says 500g chicken but only 400g tracked) The system deducts
  what's available, sets the item to zero, and does not create a negative balance.
- What happens when a staple's minimum threshold is unreasonably high? The system
  should cap the grocery list suggestion at a reasonable purchase quantity and
  note the threshold may need adjusting.
- What happens when a prep reminder fires but the user has already swapped that
  meal for a different one? The reminder should check the current plan state
  before firing and suppress itself if the meal has changed.
- What happens when the user gives contradictory feedback? (e.g., rates the same
  type of meal 5 stars one week and 1 star the next) The AI should weight recent
  feedback more heavily and consider contextual notes rather than just the rating.
- What happens when specials conflict with preferences? (e.g., pork is on special
  but a household member dislikes pork) Preferences and restrictions always
  override price considerations.
- What happens when the same ingredient is available at multiple shops at
  different prices? The grocery list should show both options and let the user
  choose, or default to the cheapest / on-special option.
- What happens when a product is mapped at one shop but not another? The grocery
  list shows the mapped product for the shop that has it and falls back to a
  generic ingredient name for shops without a mapping.
- What happens when the user switches brands mid-week (bought a different BBQ
  sauce than planned)? They can update the product used, and the AI adjusts any
  remaining recipe steps for the new brand's characteristics.
- What happens when the user is offline and their household member makes changes
  online? The offline user continues with their cached version and changes merge
  when they reconnect, with a notification of what changed.
- What happens when breakfast and lunch plans create a very long grocery list?
  The AI should keep breakfast and lunch simple and repetitive by default to
  minimize additional ingredients beyond what dinner requires.
- What happens when the user marks all three meal slots as "eating out" for a
  day? No recipes or grocery items are generated for that day.
- What happens when the AI suggests freezing an item but the freezer is full?
  The suggestion should note the current freezer capacity and let the user decide.
- What happens when a recipe is frozen and later thawed for use? The item moves
  from freezer back to fridge inventory with an updated (shorter) use-by date.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add, edit, and remove items from fridge
  and pantry inventories with name, quantity, and optional expiry date.
- **FR-002**: System MUST visually distinguish items expiring within 2 days,
  expired items, and items with no expiry concern.
- **FR-003**: System MUST allow users to register and manage cooking equipment
  with names and supported cooking modes (e.g., Ninja Combi supports Air Crisp,
  Combi Cook, Slow Cook, Steam, Bake, etc.).
- **FR-004**: System MUST generate AI-powered weekly meal plans covering
  breakfast, lunch, and dinner for 2 adults, prioritizing ingredients closest
  to expiry.
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
  involves a duration, supporting multiple simultaneous timers with push
  notifications that tell the user what to do next or that the meal is ready.
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
- **FR-029**: System MUST automatically deduct recipe ingredient quantities from
  inventory when a meal is marked as cooked, reflecting any substitutions or
  modifications made.
- **FR-030**: System MUST allow users to mark inventory items as "staples" with
  a minimum threshold quantity, and automatically add them to the grocery list
  when inventory falls below the threshold.
- **FR-031**: System MUST send push notifications for advance preparation tasks
  (defrosting, marinating, soaking) at the appropriate time before the meal,
  and reschedule them automatically when meals are moved.
- **FR-032**: System MUST allow users to rate meals after cooking (quick rating
  plus optional free-text notes) and use this feedback to improve future AI
  meal plan suggestions.
- **FR-033**: AI MUST incorporate recipe feedback to adjust equipment-specific
  settings (e.g., cooking times, temperatures) in future similar recipes.
- **FR-034**: System MUST allow users to register multiple shops and map
  ingredients to specific products (brand, size, price) at each shop.
- **FR-035A**: System MUST allow users to flag products as "on special" at any
  shop before generating a meal plan, and the AI MUST prioritize those products
  (after expiring inventory).
- **FR-035B**: Grocery lists MUST show specific products with brand, size, and
  shop — not just generic ingredient names — and be groupable by shop.
- **FR-035C**: AI MUST adjust recipe cooking steps when a different brand/product
  is used, if the product characteristics affect cooking (e.g., quantity
  adjustments for different sizes, technique changes for different consistencies).
- **FR-035**: System MUST cache the current week's meal plan, recipes, grocery
  list, and inventory for full offline use, with automatic sync on reconnection.
- **FR-036**: System MUST support three meal slots per day (breakfast, lunch,
  dinner), with the ability to skip, repeat, or mark any slot as "eating out."
- **FR-037**: System MUST tag recipes as "freezable" or "not freezable" with
  recommended freeze duration.
- **FR-038**: System MUST suggest freezing expiring ingredients that are not
  planned for use in the current week's meals, as an alternative to waste.
- **FR-039**: Grocery list and inventory changes made offline MUST sync
  automatically when connectivity is restored, with sensible conflict resolution.

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
- **Meal Plan**: A weekly plan containing 7 days of meals across three daily slots
  (breakfast, lunch, dinner). Belongs to a household. Has a status
  (draft/active/completed).
- **Meal**: A single meal within a plan (e.g., Monday dinner, Tuesday breakfast).
  Has a slot type (breakfast/lunch/dinner) and a status (planned/eating-out/skipped).
  References a recipe and can be customized at plan time.
- **Recipe**: A set of ingredients and equipment-specific cooking steps generated
  by AI. Can be an AI original or a user-modified variation. Has a "freezable"
  tag (yes/no) with recommended freeze duration when applicable.
- **Cooking Step**: A single instruction within a recipe, associated with a specific
  piece of equipment (or no equipment for prep steps). Includes settings like
  temperature, time, and mode.
- **Grocery List**: A consolidated shopping list derived from a meal plan. Contains
  line items with specific products, brands, sizes, and shops — not just generic
  ingredient names. Quantities reflect what's needed after subtracting inventory.
  Items are groupable by shop for efficient multi-store trips.
- **Leftover**: A record of uneaten food after cooking a meal. Has a quantity and
  estimated use-by date. Stored as an inventory item in the fridge.
- **Food Preference**: A like, dislike, or dietary restriction associated with a
  specific household member (not the household as a whole). Has a type
  (like/dislike/restriction), a value (ingredient name, cuisine type, or
  category). The AI considers all members' preferences when generating plans,
  with restrictions always overriding preferences.
- **Meal History Entry**: A record of a meal that was cooked. Has a date, reference
  to the recipe used (including any cook-time modifications), a favorite flag,
  a rating (thumbs up/down or 1-5 stars), and optional free-text feedback notes.
- **Staple Item**: An inventory item marked as always-needed. Has a reference to
  the inventory item and a minimum threshold quantity. When inventory drops below
  the threshold, the item is automatically added to the grocery list.
- **Prep Reminder**: A scheduled notification for advance preparation tasks tied
  to a specific meal in the plan. Has a trigger time, a message describing the
  action (e.g., "defrost chicken"), and a reference to the meal. Automatically
  reschedules when the meal is moved.
- **Shop**: A grocery store the household shops at (e.g., Coles, Woolworths, Aldi).
  Has a name. A household can have multiple preferred shops.
- **Product**: A specific purchasable item at a shop. Maps an abstract ingredient
  to a concrete brand, size, and price at a specific shop (e.g., "Masterfoods BBQ
  Sauce 500ml" at Coles for $4.50). Different products for the same ingredient
  may have different cooking characteristics that the AI accounts for in recipe
  steps.
- **Weekly Special**: A product flagged as on sale for the current week at a
  specific shop. Has a reference to the product and optional discount info.
  Cleared weekly. The AI prioritizes these products (after expiring inventory)
  when generating meal plans.

## Assumptions

- The default household is 2 adults. The system supports multiple members per
  household with individual accounts. Supporting multiple households per user
  is a future enhancement.
- The household shops at multiple stores (e.g., Coles, Woolworths, Aldi). No
  integration with store APIs is needed; product and price data is entered
  manually by the user and builds up over time as a personal product catalogue.
- The Ninja Combi is the primary cooking equipment, but the system supports
  any equipment the user registers.
- "Simple/easy meals" is a preference communicated to the AI, not a hard system
  constraint. Users can override with more complex meals if desired.
- Meal plans cover breakfast, lunch, and dinner. Snack planning is not included.
  Users can skip or set meal slots to repeat (e.g., same breakfast every weekday)
  to keep it simple.
- Expiry dates are manually entered by the user. No barcode scanning or
  automatic detection for MVP.
- The app is mobile-first but also works on desktop. No native mobile app;
  it is a responsive web application accessed via mobile browser.
- Expiry alerts are in-app only (no push notifications). Alerts appear when the
  user opens the app. Cooking timers are the exception — they use push
  notifications via the Web Push API (service worker) so they work even when
  the app is in the background or the screen is off.
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
- Weekly specials are entered manually by the user per shop. No store API or
  catalogue scraping is needed. The user checks each store's app/catalogue and
  enters what's relevant.
- The product catalogue is built up organically over time. The user doesn't need
  to pre-populate every product before using the app — they add products as they
  shop and the catalogue grows. The AI can still generate plans with generic
  ingredients when no specific product is mapped.
- Offline mode uses service worker caching (PWA pattern). The app does not need
  to be a native mobile app; a well-configured PWA with offline support is
  sufficient.
- Freezable tagging is AI-determined based on recipe type. Users can override
  the tag if they disagree (e.g., mark a recipe as freezable that the AI
  tagged as not freezable).

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
