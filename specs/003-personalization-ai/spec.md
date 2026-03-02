# Feature Specification: Personalization AI

**Feature Branch**: `003-personalization-ai`  
**Created**: 2026-03-02  
**Status**: Draft  
**Input**: User description: "Add personalization features that improve AI meal plan quality: per-member food preferences (P6), meal history & favorites (P7), recipe ratings & feedback (P17), and cuisine type requests (P22)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Food Preferences (Priority: P1 🎯 MVP)

As a household member, I want to set my dietary restrictions, allergies, dislikes,
and liked ingredients so the AI never serves food I can't or won't eat and biases
toward ingredients I enjoy.

Each household member maintains their own preference profile. Allergies are
hard-blocked — the AI must never include an allergen in any recipe for a plan
that member will eat. Dietary restrictions (vegetarian, vegan, halal, gluten-free,
etc.) act as filters on the entire recipe pool. Dislikes are soft preferences —
strongly avoided but not absolute blocks. Likes bias the AI toward those
ingredients when building plans.

When generating a meal plan, the AI prompt includes ALL member preferences for
the household. The plan must satisfy the intersection of all hard constraints
(allergies, dietary restrictions) and balance soft preferences (likes/dislikes)
across members.

**Why this priority**: Without preferences, the AI is guessing blind. A plan that
includes allergens is dangerous; one full of disliked foods gets ignored. This is
the single highest-impact personalization feature and the foundation all other
stories build on.

**Independent Test**: Can be fully tested by creating household members with
different preferences, generating a meal plan, and verifying the AI output
respects all hard blocks and biases toward liked ingredients. Delivers standalone
value — plans immediately improve in relevance.

**Acceptance Scenarios**:

1. **Given** a household member has "peanut" marked as an allergy, **When** the AI
   generates a meal plan, **Then** no recipe in the plan contains peanuts or
   peanut-derived ingredients.
2. **Given** a household member has "vegetarian" as a dietary restriction, **When**
   the AI generates a meal plan, **Then** every recipe in the plan is vegetarian
   (no meat, no fish).
3. **Given** member A dislikes "cilantro" and member B likes "cilantro", **When**
   the AI generates a plan, **Then** cilantro usage is minimized (appears in ≤1
   meal per week) to respect the dislike while not fully eliminating it.
4. **Given** a member has "salmon" and "avocado" marked as likes, **When** the AI
   generates a plan, **Then** those ingredients appear more frequently than
   neutral ingredients of the same category.
5. **Given** two members have conflicting dietary restrictions (one vegan, one not),
   **When** the AI generates a plan, **Then** all meals satisfy the most
   restrictive constraint (vegan) since both members share meals.

---

### User Story 2 — Meal History & Favorites (Priority: P2)

As a household, I want the AI to know what we've cooked recently and which recipes
are our favorites, so it avoids repetitive plans and occasionally re-suggests meals
we love.

The system derives meal history from existing MealSlot records where status is
"cooked". The AI uses a configurable lookback window (default: 3 weeks) to avoid
repeating the same recipe. Users can mark any recipe as a "favorite" — favorites
get a higher probability of re-appearing (roughly once every 2-3 weeks) even if
recently cooked. A meal history page shows what the household has cooked over time.

**Why this priority**: After preferences, repetition is the biggest quality
complaint with AI meal planners. History-aware generation makes plans feel curated
rather than random. Builds on existing MealSlot.cooked_at data — minimal new
model surface.

**Independent Test**: Can be tested by marking meals as cooked over several weeks,
favoriting some recipes, generating a new plan, and verifying the plan avoids
recent non-favorite recipes while including at least one favorite. History page
can be tested independently by viewing past cooked meals.

**Acceptance Scenarios**:

1. **Given** the household cooked "Chicken Tikka Masala" last week, **When** the AI
   generates this week's plan, **Then** "Chicken Tikka Masala" does not appear in
   the new plan.
2. **Given** a recipe is marked as a favorite and was last cooked 3 weeks ago,
   **When** the AI generates a plan, **Then** the favorite has a higher
   probability of being included than a non-favorite recipe.
3. **Given** a household has cooked 20 meals over the past month, **When** I view
   the meal history page, **Then** I see a chronological list of cooked meals with
   dates and recipe names.
4. **Given** the lookback window is set to 2 weeks and a recipe was cooked 15 days
   ago, **When** the AI generates a plan, **Then** that recipe is eligible for
   re-inclusion.

---

### User Story 3 — Recipe Ratings & Feedback (Priority: P3)

As a household member, after cooking a meal I want to rate it (1-5 stars) and
optionally leave text feedback so the AI learns what we actually enjoyed and
adjusts future plans accordingly.

After a MealSlot is marked as "cooked", the UI prompts the user to rate the
recipe. Ratings and feedback are stored per MealSlot (not per Recipe) to capture
context-specific reactions. The AI prompt includes rating summaries: recipes rated
≤2 stars are avoided, recipes rated ≥4 stars are preferred, and text feedback
keywords (e.g., "too spicy", "kids loved it") inform flavor/complexity tuning.

**Why this priority**: Ratings close the feedback loop — without them, the AI
repeats mistakes. However, ratings require cooked meals to exist (US2 history)
and preferences to be set (US1) to be most useful. Lower priority because the
system functions well without ratings; they refine quality over time.

**Independent Test**: Can be tested by marking a meal as cooked, submitting a
rating and feedback, generating a new plan, and verifying the AI prompt includes
the rating data. Low-rated recipes should not reappear; high-rated flavors should
be favored.

**Acceptance Scenarios**:

1. **Given** I mark a meal as "cooked", **When** I view the meal slot, **Then** I
   see a prompt to rate the recipe from 1-5 stars with an optional text feedback
   field.
2. **Given** I rated "Burnt Ends Mac & Cheese" as 2 stars with feedback "too heavy",
   **When** the AI generates the next plan, **Then** that recipe does not appear
   and the AI avoids similarly heavy/rich recipes.
3. **Given** I rated "Lemon Herb Salmon" as 5 stars, **When** the AI generates
   future plans, **Then** that recipe and similar flavor profiles appear more
   frequently.
4. **Given** I have not yet rated a cooked meal, **When** I navigate away without
   rating, **Then** the meal remains unrated and no rating is assumed — the AI
   treats it as neutral.

---

### User Story 4 — Cuisine Type Requests (Priority: P4)

As a user generating a meal plan, I want to optionally specify cuisine preferences
(e.g., "Mexican this week" or "mostly Italian, some Asian") so the AI produces
plans aligned with my current cravings.

When requesting a plan, the user can select one or more cuisine types from a
predefined list (Mexican, Italian, Asian, Indian, Mediterranean, American,
Comfort Food, etc.) or enter free-text. Mixed requests are supported with optional
weighting (e.g., "70% Mexican, 30% Italian"). Generated recipes are tagged with
their cuisine type for filtering and future reference. Cuisine preferences are
per-plan, not persistent — each plan generation starts fresh.

**Why this priority**: Cuisine requests are a nice-to-have that adds variety and
user control. However, the AI already generates diverse plans with preferences
(US1) and history (US2). This is the lowest priority because it's additive polish,
not a quality fix.

**Independent Test**: Can be tested by requesting a plan with "Mexican" selected,
verifying all or most recipes have Mexican cuisine characteristics, and checking
that generated recipes are tagged with the cuisine type.

**Acceptance Scenarios**:

1. **Given** I select "Mexican" as cuisine preference, **When** the AI generates a
   plan, **Then** at least 5 of 7 daily meals have Mexican cuisine characteristics
   (e.g., use tortillas, beans, chiles, cumin).
2. **Given** I select "Italian" and "Asian" with equal weight, **When** the AI
   generates a plan, **Then** the plan contains a roughly even mix of Italian and
   Asian-inspired recipes.
3. **Given** I type "Southern comfort food" as free-text cuisine, **When** the AI
   generates a plan, **Then** the AI interprets and applies the request (e.g.,
   fried chicken, mac & cheese, collard greens).
4. **Given** I do not specify any cuisine preference, **When** the AI generates a
   plan, **Then** the plan has natural variety across cuisines (current default
   behavior, no regression).

---

### Edge Cases

- **Conflicting preferences**: Member A is vegan, member B wants steak. The AI
  must satisfy the most restrictive dietary constraint (vegan) since household
  members share meals. The system should surface a warning to the user when
  constraints eliminate most recipes.
- **All recipes blocked**: If preferences + history + low ratings eliminate all
  known recipes, the AI must still generate a plan. Fallback: relax history
  lookback first, then relax dislikes, never relax allergies.
- **Empty preference profile**: Members with no preferences set should not block
  plan generation. The AI treats them as having no constraints.
- **Rating spam / outliers**: A single 1-star rating should not permanently block
  a recipe. Require ≥2 low ratings to trigger avoidance, or decay ratings over
  time.
- **Cuisine + dietary conflict**: User requests "BBQ" cuisine but has a vegan
  restriction. The AI should generate vegan BBQ-style recipes, not ignore the
  dietary restriction.
- **Large households**: 6+ members with diverse preferences may over-constrain
  the recipe space. The system should warn when the feasible recipe set is very
  small.
- **Ingredient ambiguity**: "Dairy-free" dislike vs. "lactose intolerant" allergy
  must be distinguished. Allergies are hard blocks; dislikes are soft.
- **History lookback with sparse data**: New households with <3 weeks of history
  should not penalize — AI uses whatever history exists.

## Requirements _(mandatory)_

### Functional Requirements

**Preferences (US1)**

- **FR-001**: System MUST allow each household member to set dietary restrictions
  from a predefined list (vegetarian, vegan, halal, kosher, gluten-free,
  dairy-free, keto, paleo).
- **FR-002**: System MUST allow each household member to add ingredient-level
  allergies that are hard-blocked from all generated recipes.
- **FR-003**: System MUST allow each household member to add ingredient-level
  dislikes (soft avoidance) and likes (positive bias).
- **FR-004**: System MUST scope all preferences to the household member, stored
  against HouseholdMember.
- **FR-005**: System MUST include all household member preferences in the AI
  prompt when generating a meal plan.
- **FR-006**: System MUST enforce that no recipe in a generated plan contains a
  hard-blocked allergen for any household member.
- **FR-007**: System MUST expose CRUD API endpoints for managing member preferences.

**History & Favorites (US2)**

- **FR-008**: System MUST derive meal history from MealSlot records with
  status="cooked" and cooked_at timestamp.
- **FR-009**: System MUST support a configurable lookback window (default 3 weeks)
  for recipe repetition avoidance.
- **FR-010**: System MUST allow users to mark/unmark a recipe as a "favorite"
  (boolean toggle on a per-household basis).
- **FR-011**: System MUST bias AI generation toward favorite recipes, targeting
  ~1 favorite per plan when favorites exist.
- **FR-012**: System MUST provide an API endpoint returning meal history for a
  household (paginated, sorted by date descending).

**Ratings & Feedback (US3)**

- **FR-013**: System MUST allow a household member to rate a cooked meal slot from
  1-5 stars.
- **FR-014**: System MUST allow optional free-text feedback (max 500 characters)
  on a cooked meal slot.
- **FR-015**: System MUST store ratings per MealSlot (not per Recipe) to capture
  context-specific feedback.
- **FR-016**: System MUST include rating summaries in the AI prompt: avoid recipes
  with average rating ≤2, prefer recipes with average rating ≥4.
- **FR-017**: System MUST not require a rating — unrated meals are treated as
  neutral.

**Cuisine Requests (US4)**

- **FR-018**: System MUST allow optional cuisine type selection when requesting a
  meal plan.
- **FR-019**: System MUST support a predefined cuisine list (Mexican, Italian,
  Asian, Indian, Mediterranean, American, Comfort Food) plus free-text input.
- **FR-020**: System MUST support multi-cuisine requests with optional weighting.
- **FR-021**: System MUST tag generated recipes with their cuisine type.
- **FR-022**: System MUST pass cuisine preferences to the AI prompt as generation
  constraints.

### Key Entities

- **MemberPreference**: Stores per-member dietary restrictions, allergies, dislikes,
  and likes. Linked to HouseholdMember. Each preference has a type (dietary_restriction,
  allergy, dislike, like) and a value (ingredient_id for allergies/dislikes/likes,
  enum string for dietary restrictions).

- **RecipeFavorite**: Tracks which recipes a household has favorited. Linked to
  Recipe and Household. Simple boolean/existence record — if a row exists, the
  recipe is a favorite.

- **MealSlotRating**: Stores the 1-5 star rating and optional text feedback for a
  cooked meal slot. Linked to MealSlot and the rating member (HouseholdMember).
  One rating per member per meal slot.

- **CuisineType** (enum/tag): Predefined cuisine labels applied to recipes and
  used in plan generation requests. Stored as a string column on Recipe and as a
  request parameter on MealPlan generation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Generated meal plans contain zero allergen violations for any
  household member (100% hard-block compliance).
- **SC-002**: No recipe from the lookback window (default 3 weeks) appears in a
  newly generated plan unless it is a favorite.
- **SC-003**: At least 1 favorite recipe appears in generated plans when the
  household has ≥3 favorites (measured over 5 consecutive plan generations).
- **SC-004**: Recipes with average rating ≤2 stars do not appear in generated plans.
- **SC-005**: When a cuisine type is specified, ≥70% of recipes in the generated
  plan match that cuisine.
- **SC-006**: Preference CRUD operations complete in <200ms (p95).
- **SC-007**: AI prompt construction including preferences, history, ratings, and
  cuisine adds <500ms to plan generation time.
- **SC-008**: Users can set preferences and generate an improved plan within 3
  minutes of first use (onboarding flow).
