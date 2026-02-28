---
spec: 001-meal-planner-mvp
phase: requirements
created: 2026-02-28
generated: auto
---

# Requirements: Meal Planner MVP

## Goal

AI-powered weekly meal planner for 2 adults that prioritizes expiring ingredients, generates equipment-specific cooking steps (Ninja Combi), produces multi-shop grocery lists, and supports plan-time/cook-time customization. MVP scope: P1-P4 (Inventory, AI Meal Planning, Grocery List, Customization).

## MVP Scope Decision

P1-P4 form a complete core loop: track what you have -> AI plans meals -> generate shopping list -> customize before/during cooking. P5-P27 are fast-follow enhancements. This is deliberate: ship the loop, validate it works, then layer features.

---

## User Stories

### US-1: Pantry, Fridge & Equipment Inventory (P1)

**As a** home cook
**I want to** track ingredients in my fridge/pantry with quantities and expiry dates, and register cooking equipment
**So that** the system knows what I have before suggesting meals

**Acceptance Criteria:**
- [ ] AC-1.1: Add item to fridge/pantry with name, quantity (canonical metric: g/ml/units), and optional expiry date. Item appears in inventory.
- [ ] AC-1.2: Items within 2 days of expiry are visually highlighted (amber). Expired items are highlighted (red) with discard/keep prompt.
- [ ] AC-1.3: Register cooking equipment (e.g., "Ninja Combi") with supported modes. Equipment appears in equipment list.
- [ ] AC-1.4: Update quantity of an existing inventory item (partial use).
- [ ] AC-1.5: Remove an item from inventory entirely.
- [ ] AC-1.6: View inventory grouped by storage location (fridge, pantry). Expiring-soon items sorted to top.
- [ ] AC-1.7: Ninja Combi pre-seeded with 14 cooking modes (Air Crisp, Combi Cook, Slow Cook, Steam, Bake, etc.) as structured EquipmentMode entities.
- [ ] AC-1.8: All inventory data scoped to authenticated user's household (Auth0).

### US-2: AI Weekly Meal Planning (P2)

**As a** home cook
**I want to** AI-generate a weekly meal plan for 2 adults that prioritizes expiring ingredients and uses my registered equipment
**So that** I eat what I have before it goes bad and get equipment-specific cooking instructions

**Acceptance Criteria:**
- [ ] AC-2.1: Request generates a 7-day dinner plan for 2 adults. (Breakfast/lunch slots exist but default to "skip" for MVP; full-day planning is P20.)
- [ ] AC-2.2: Meals using ingredients closer to expiry appear earlier in the week.
- [ ] AC-2.3: Each recipe includes step-by-step instructions organized by equipment (e.g., "Ninja Combi: Air Crisp 200C 15 min", "Stove top: pan-fry medium 8 min", "Prep: no equipment").
- [ ] AC-2.4: Ingredient quantities scaled for 2 servings.
- [ ] AC-2.5: AI uses hybrid LLM + constraint validation: LLM generates recipe JSON, post-processing validates against inventory, equipment, and serving constraints.
- [ ] AC-2.6: Recipes returned as structured JSON (Pydantic models, Schema.org Recipe property names).
- [ ] AC-2.7: Meal plan generation completes within 30 seconds (p95).
- [ ] AC-2.8: Meal plan has status lifecycle: draft -> active -> completed.

### US-3: Grocery List Generation (P3)

**As a** home cook
**I want to** generate a consolidated grocery list from my meal plan that subtracts what I already have
**So that** I buy only what I need without duplicates

**Acceptance Criteria:**
- [ ] AC-3.1: Grocery list = (meal plan total ingredients) minus (current inventory). Only missing quantities listed.
- [ ] AC-3.2: If recipe needs 500g chicken and I have 200g, list shows 300g chicken.
- [ ] AC-3.3: Same ingredient across multiple meals consolidated into single line item with total quantity.
- [ ] AC-3.4: Check off items during shopping. Checked state persists.
- [ ] AC-3.5: "Mark shopping complete" prompts user to enter expiry dates for purchased items, then adds them to inventory.
- [ ] AC-3.6: Grocery list grouped by store (basic grouping for MVP; detailed product/brand mapping is P18).
- [ ] AC-3.7: Grocery list updates automatically when meal plan changes (swap, remove, modify meals).

### US-4: Meal Customization at Plan Time and Cook Time (P4)

**As a** home cook
**I want to** customize meals when planning (swap, modify) and when cooking (adjust effort/time)
**So that** I can adapt to real life without abandoning the plan

**Acceptance Criteria:**
- [ ] AC-4.1: Swap meals between days in the weekly plan. Grocery list updates accordingly.
- [ ] AC-4.2: Remove an ingredient from a planned meal. Recipe steps and grocery list update.
- [ ] AC-4.3: At cook time, indicate "limited time" and receive simplified cooking steps (fewer steps, faster techniques, simpler equipment modes).
- [ ] AC-4.4: At cook time, indicate "more effort" and receive enhanced steps (marinating, toasting, side dish suggestions).
- [ ] AC-4.5: Cook-time adaptation completes within 10 seconds (p95).
- [ ] AC-4.6: Save a cook-time customized version as a personal variation for future use (optional action).
- [ ] AC-4.7: Mark a meal as "cooked" to signal completion. (Auto-deduction of inventory is P14; MVP just records the event.)

---

## Functional Requirements

| ID | Requirement | Priority | User Story | Acceptance Criteria |
|----|-------------|----------|------------|---------------------|
| FR-01 | Add/edit/remove fridge and pantry items with name, quantity (g/ml/units), optional expiry | High | US-1 | Item CRUD operations succeed; quantities stored in canonical metric units |
| FR-02 | Visually distinguish: expiring within 2 days (amber), expired (red), safe (default) | High | US-1 | Color/badge correctly applied based on current date vs expiry |
| FR-03 | Register cooking equipment with name and supported modes | High | US-1 | Equipment and modes persist; available for meal plan generation |
| FR-04 | Pre-seed Ninja Combi with 14 modes (Air Crisp, Combi Cook, Slow Cook, Steam, Bake, Grill, Dehydrate, Proof, Sear/Saute, Steam Meals, Combi Crisp, Pizza, Toast, Air Fry) | High | US-1 | Modes available on first use without manual entry |
| FR-05 | Generate AI weekly meal plan (7 dinners for 2 adults) prioritizing expiring ingredients | High | US-2 | Expiring items used earlier in week; plan covers 7 days |
| FR-06 | Recipe cooking steps organized by equipment with mode/temp/time | High | US-2 | Each step references equipment or "prep"; Ninja Combi steps include specific mode |
| FR-07 | Recipe quantities scaled for 2 servings | High | US-2 | All ingredient quantities reflect 2-serving size |
| FR-08 | Hybrid LLM + constraint validation for recipe generation | High | US-2 | LLM output validated against inventory/equipment; invalid recipes rejected and regenerated |
| FR-09 | Consolidated grocery list = plan needs minus inventory | High | US-3 | Quantities correct after subtraction; no negative values |
| FR-10 | Consolidate same ingredient across meals into single line | High | US-3 | e.g., chicken from 3 recipes = one "chicken 1.2kg" line |
| FR-11 | Check off grocery items during shopping | High | US-3 | Checked state persists across page refreshes |
| FR-12 | Mark shopping complete -> add purchased items to inventory with expiry prompts | High | US-3 | New inventory items created with user-entered expiry dates |
| FR-13 | Swap meals between days; grocery list auto-updates | High | US-4 | Drag/tap to swap; grocery list recalculates |
| FR-14 | Remove/modify ingredients in planned meals; cascade to grocery list | High | US-4 | Removed ingredient disappears from grocery list (if no other meal uses it) |
| FR-15 | Cook-time adaptation: simplify or elaborate recipe steps via AI | High | US-4 | User selects time/effort level; AI returns adjusted steps within 10s |
| FR-16 | Save cook-time variation as personal recipe | Medium | US-4 | Saved variation appears in user's recipe library for future selection |
| FR-17 | Mark meal as "cooked" | High | US-4 | Status transitions from "planned" to "cooked"; timestamp recorded |
| FR-18 | Auth0 authentication (BFF pattern for frontend, JWT for API) | High | All | Unauthenticated requests rejected; user data scoped to household |
| FR-19 | Mobile-first responsive design | High | All | Usable on 375px viewport; touch targets >= 44px |
| FR-20 | Meal plan status lifecycle: draft -> active -> completed | Medium | US-2 | Only one active plan per household at a time |

---

## Non-Functional Requirements

| ID | Requirement | Metric | Target | Source |
|----|-------------|--------|--------|--------|
| NFR-01 | Meal plan generation latency | p95 response time | < 30 seconds | US-2 / UX |
| NFR-02 | Cook-time adaptation latency | p95 response time | < 10 seconds | US-4 / UX |
| NFR-03 | CRUD operation latency | p95 response time | < 500ms | General API |
| NFR-04 | Structured logging | All services emit structlog + OpenTelemetry traces | 100% coverage | Constitution III |
| NFR-05 | Test coverage | Unit + integration tests pass before merge | 100% pass rate | Constitution II |
| NFR-06 | E2E tests | Playwright E2E with Aspire orchestration | All critical paths covered | Constitution II |
| NFR-07 | Secret management | All secrets in Azure Key Vault via Terraform | Zero secrets in code/env | Constitution IV |
| NFR-08 | Code quality gates | ruff, ESLint, Prettier, bandit, pip audit | All pass in CI | Constitution V |
| NFR-09 | Line length | Python and TypeScript | 100 characters max | Constitution V |
| NFR-10 | LLM cost per plan | Cost per weekly plan generation | < $0.15 | Budget |
| NFR-11 | Mobile viewport | Minimum supported width | 375px (iPhone SE) | FR-19 |
| NFR-12 | Availability | Uptime target (shared AKS) | 99% monthly | Infrastructure |
| NFR-13 | Data isolation | Household data never leaks cross-household | Row-level filtering by household_id on all queries | Security |

---

## Data Model Requirements

### Entities (MVP Scope)

| Entity | Key Fields | Constraints |
|--------|-----------|-------------|
| **Household** | id, name, default_servings (default: 2), created_at | One active household per user for MVP |
| **HouseholdMember** | id, household_id (FK), auth0_user_id, display_name, role | Unique auth0_user_id; role = "owner" or "member" |
| **Ingredient** | id, name, category, default_unit, default_storage, typical_shelf_life_days | First-class entity; canonical reference for inventory and recipes |
| **InventoryItem** | id, household_id (FK), ingredient_id (FK), quantity, unit, location (fridge/pantry), expiry_date, created_at | Quantity >= 0; unit in {g, ml, units}; location enum |
| **Equipment** | id, household_id (FK), name, is_active | Soft-delete via is_active flag |
| **EquipmentMode** | id, equipment_id (FK), name, category, min_temp, max_temp | Pre-seeded for Ninja Combi; user-extensible |
| **MealPlan** | id, household_id (FK), week_start_date, status (draft/active/completed), created_at | One active plan per household; week_start_date is Monday |
| **MealSlot** | id, meal_plan_id (FK), recipe_id (FK, nullable), day (1-7), meal_type (breakfast/lunch/dinner), status (planned/cooked/skipped) | Unique constraint on (meal_plan_id, day, meal_type) |
| **Recipe** | id, household_id (FK, nullable), title, description, servings, prep_time_min, cook_time_min, is_ai_generated, source_recipe_id (FK, nullable, self-ref for variations) | AI-generated recipes have household_id = NULL until saved as variation |
| **RecipeIngredient** | id, recipe_id (FK), ingredient_id (FK), quantity, unit, is_optional | Links recipe to ingredients with quantities |
| **RecipeStep** | id, recipe_id (FK), step_order, instruction, equipment_mode_id (FK, nullable), temperature, duration_min | Nullable equipment_mode_id = prep step (no equipment) |
| **GroceryList** | id, meal_plan_id (FK), created_at | One grocery list per meal plan |
| **GroceryItem** | id, grocery_list_id (FK), ingredient_id (FK), quantity_needed, unit, is_checked | Derived from plan minus inventory |

### Key Relationships

```
Household (1) ---< HouseholdMember (N)
Household (1) ---< InventoryItem (N)
Household (1) ---< Equipment (N)
Household (1) ---< MealPlan (N)
Equipment (1) ---< EquipmentMode (N)
Ingredient (1) ---< InventoryItem (N)
Ingredient (1) ---< RecipeIngredient (N)
Ingredient (1) ---< GroceryItem (N)
MealPlan (1) ---< MealSlot (N)
MealPlan (1) ---< GroceryList (1)
Recipe (1) ---< RecipeIngredient (N)
Recipe (1) ---< RecipeStep (N)
Recipe (1) ---< MealSlot (N)
GroceryList (1) ---< GroceryItem (N)
RecipeStep (N) >--- EquipmentMode (1, nullable)
```

### Design Decisions

- **Ingredient as first-class entity**: Separate from InventoryItem. Enables inventory math, shopping consolidation, and substitution. Seeded with common grocery items.
- **Canonical metric units**: Store g/ml/units internally. Convert for display only.
- **Schema.org Recipe property names**: Align with LLM training data for better structured output quality.
- **No freezer location for MVP**: Only fridge and pantry. Freezer tracking is P11.
- **No product/brand mapping for MVP**: Grocery items reference Ingredient, not Product. Brand/shop/price mapping is P18.
- **No household sharing for MVP**: Single-user household. Multi-user is P12.

---

## Integration Requirements

| Integration | Protocol | Details |
|-------------|----------|---------|
| **Auth0** | OIDC/JWT | Frontend: @auth0/nextjs-auth0 BFF pattern. API: JWT validation middleware on all endpoints. Already configured. |
| **Azure SQL** | ODBC (async) | SQLAlchemy 2.0 async + Alembic migrations. Serverless tier in prod, SQL Server 2025 locally via Aspire. |
| **LLM API** | REST/HTTPS | Anthropic Claude or OpenAI. Called from backend (FastAPI service layer). Structured JSON output via Pydantic model prompting. |
| **Azure Queue Storage** | SDK | Meal plan generation enqueued as async job. Worker polls queue, generates plan, writes result. Azurite locally. |
| **Azure Blob Storage** | SDK | (Future) Recipe images, export data. Not needed for MVP. |
| **Azure Key Vault** | External Secrets Operator | All secrets (DB connection, LLM API key, Auth0 secrets) provisioned via Terraform. |

### API Endpoints (MVP)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /api/v1/inventory | List household inventory items | JWT |
| POST | /api/v1/inventory | Add inventory item | JWT |
| PATCH | /api/v1/inventory/{id} | Update quantity/expiry | JWT |
| DELETE | /api/v1/inventory/{id} | Remove item | JWT |
| GET | /api/v1/equipment | List household equipment + modes | JWT |
| POST | /api/v1/equipment | Register equipment | JWT |
| POST | /api/v1/meal-plans | Generate weekly meal plan (enqueues job) | JWT |
| GET | /api/v1/meal-plans/{id} | Get meal plan with recipes | JWT |
| PATCH | /api/v1/meal-plans/{id}/slots/{slot_id} | Swap/modify meal slot | JWT |
| POST | /api/v1/meal-plans/{id}/slots/{slot_id}/adapt | Cook-time adaptation | JWT |
| PATCH | /api/v1/meal-plans/{id}/slots/{slot_id}/status | Mark cooked/skipped | JWT |
| GET | /api/v1/meal-plans/{id}/grocery-list | Get grocery list | JWT |
| PATCH | /api/v1/grocery-items/{id} | Check off / uncheck item | JWT |
| POST | /api/v1/grocery-lists/{id}/complete | Mark shopping complete -> update inventory | JWT |
| GET | /api/v1/ingredients | Search/autocomplete ingredients | JWT |
| GET | /health/live | Liveness probe | None |
| GET | /health/ready | Readiness probe (DB check) | None |

### Async Workflow: Meal Plan Generation

1. Frontend POST /api/v1/meal-plans -> API returns 202 Accepted + plan ID (status: draft)
2. API enqueues message to Azure Queue with plan ID, household context
3. Worker dequeues message, calls LLM with inventory + equipment + constraints
4. Worker validates LLM output (Pydantic), retries on validation failure (max 3)
5. Worker writes recipes + meal slots + grocery list to DB, updates plan status to "active"
6. Frontend polls GET /api/v1/meal-plans/{id} until status != "draft" (or use SSE)

---

## Out of Scope (MVP)

| Item | Planned Phase | Notes |
|------|---------------|-------|
| Leftover tracking | P5 | Record leftovers, AI incorporates into future plans |
| Food preferences & dislikes | P6 | Per-member likes/dislikes/restrictions |
| Meal history & favorites | P7 | Avoid repeats, mark favorites |
| Ingredient substitution (AI-powered) | P8 | Swap ingredients with auto-updated steps |
| Cooking timers | P9 | In-app countdown timers with push notifications |
| Voice assistant (hands-free) | P10 | Web Speech API for cooking mode |
| Freezer tracking | P11 | Third storage location with defrost time |
| Multi-user household | P12 | Shared inventory, real-time grocery sync |
| "What can I make right now?" | P13 | Ad-hoc suggestions from current inventory |
| Auto-deduction after cooking | P14 | Inventory auto-decrements on "cooked" |
| Staples & always-have items | P15 | Min threshold restock alerts |
| Prep & defrost reminders | P16 | Push notifications for advance prep |
| Recipe feedback & AI learning | P17 | Ratings + feedback loop |
| Multi-shop product catalogue | P18 | Brand/size/price per shop |
| Offline mode (PWA) | P19 | Service worker caching |
| Full-day planning (breakfast/lunch) | P20 | Currently defaults to dinner only |
| Freezable recipe tagging | P21 | Freeze-before-expiry suggestions |
| Cuisine categories & requests | P22 | "I want Mexican this week" |
| Ingredient auto-complete | P23 | Smart defaults from grocery DB |
| Per-trip shopping mode | P24 | Filter grocery list by shop |
| Recurring meal slots | P25 | "Taco Tuesday every week" |
| Cooking mode UI | P26 | Step-by-step large-text cooking view |
| Plan deviation tracking | P27 | "I ate something else" |

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Auth0 tenant | Deployed | BFF pattern configured, test users exist |
| AKS cluster | Deployed | Shared with yt-summarizer |
| ACR (acrytsummprd.azurecr.io) | Deployed | Shared container registry |
| Azure Key Vault | Deployed | Shared secrets management |
| GitHub Actions CI/CD | Configured | 9-phase pipeline, OIDC auth |
| ArgoCD | Deployed | GitOps on AKS |
| Cloudflare DNS | Configured | *.apps.ashleyhollis.com wildcard |
| LLM API key | Required | Anthropic Claude or OpenAI key; provision to Key Vault |
| Azure SQL (serverless) | To provision | App-specific Terraform in /infra |
| Azure Queue Storage | To provision | App-specific Terraform in /infra |
| .NET Aspire orchestration | To scaffold | Local dev: SQL Server 2025 + Azurite + FastAPI + Next.js |
| Ingredient seed data | To create | Common grocery items with defaults (category, shelf life, unit) |
| Ninja Combi mode seed data | To create | 14 modes with temp ranges |

---

## Assumptions

- Single-user household for MVP. Multi-user (P12) comes later.
- Dinner-only planning for MVP. Breakfast/lunch slots exist in schema but default to "skip." Full-day planning is P20.
- No barcode scanning. Expiry dates entered manually.
- No store API integration. Grocery list groups by store name only (user-entered). Product-level mapping is P18.
- Mobile-first responsive web app (PWA later). No native app.
- Expiry alerts are in-app only. No push notifications for MVP (push is P9/P16).
- LLM provider decided at implementation time (Anthropic Claude or OpenAI). API key in Key Vault.
- "Simple/easy meals" is a soft AI prompt preference, not a hard constraint.
- Ingredient seed data is a curated list of ~200-300 common Australian grocery items. Users can add custom items.
- Real-time sync not needed for single-user MVP. Standard request/response is sufficient.

---

## Glossary

- **Canonical metric units**: Internal storage in grams (g), millilitres (ml), or discrete units. Converted for display.
- **BFF pattern**: Backend-for-Frontend. Auth0 session managed in Next.js server-side; API receives JWT tokens.
- **Constraint validation**: Post-LLM validation layer that checks generated recipes against inventory availability, equipment compatibility, and serving size.
- **Equipment mode**: A specific cooking function on a piece of equipment (e.g., Ninja Combi "Air Crisp" with temp range 150-230C).
- **Household**: The data isolation boundary. All inventory, equipment, plans, and lists belong to a household.
- **Meal slot**: A (day, meal_type) position in a weekly plan. e.g., Monday dinner, Tuesday breakfast.
- **Hybrid LLM + constraint validation**: LLM generates creative recipe content; deterministic code validates constraints.
- **Schema.org Recipe**: Standard vocabulary (prepTime, cookTime, recipeIngredient, recipeInstructions) that aligns with LLM training data.

---

## Success Criteria

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-1 | First meal plan generated within 15 minutes of first use | Time from signup to first plan, measured in E2E test |
| SC-2 | 80%+ of planned meals use inventory or near-expiry ingredients | Count meals referencing existing inventory items / total meals |
| SC-3 | Cook-time customization takes < 30 seconds | User action to adapted recipe, measured in E2E test |
| SC-4 | Grocery list has zero duplicate entries for items in inventory | Automated test: seed inventory, generate list, assert no overlap |
| SC-5 | Weekly plan-shop-cook cycle completable 3 weeks running | Manual validation of full lifecycle |

---

## Unresolved Questions

- **LLM provider**: Anthropic Claude vs OpenAI. Both work. Decide during implementation based on structured output quality and cost. Not a blocking question.
- **Ingredient seed data source**: Need a curated Australian grocery item list. May need manual curation from Coles/Woolworths categories. ~200-300 items for MVP.
- **Grocery list "grouped by store"**: For MVP with no product catalogue, how does the user associate an ingredient with a store? Decision: simple optional "preferred_store" field on GroceryItem. User can edit. Default: ungrouped.

---

## Next Steps

1. Approve these requirements (run `specify plan` to generate implementation plan)
2. Scaffold project structure from yt-summarizer reference architecture
3. Provision Azure SQL + Azure Queue Storage via Terraform
4. Implement P1 (Inventory) with full test coverage
5. Implement P2 (AI Meal Planning) with LLM integration
6. Implement P3 (Grocery List) derived from plan
7. Implement P4 (Customization) plan-time and cook-time
