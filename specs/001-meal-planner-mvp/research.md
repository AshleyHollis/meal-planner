---
spec: 001-meal-planner-mvp
phase: research
created: 2026-02-28
generated: auto
---

# Research: 001-meal-planner-mvp

## Executive Summary

The Meal Planner MVP occupies genuine white space: no existing app combines expiry-prioritized AI meal planning, equipment-specific cooking steps (Ninja Combi), and multi-shop grocery lists. The tech stack is locked by the project constitution: Next.js (App Router) + FastAPI + Azure SQL + Auth0 + .NET Aspire -- matching the production-proven yt-summarizer project. Existing Azure infrastructure (subscription 28aefbe7-e2af-4b4a-9ce1-92d6672c31bd), GitHub Actions CI/CD, Auth0 tenant, AKS cluster, and ACR are already deployed and shared. A hybrid LLM + constraint validation approach handles recipe generation, using Schema.org-aligned data models with first-class Ingredient entities. P1-P4 form the true MVP core loop.

## External Research

### Competitor Analysis

**Tier 1: AI-First Meal Planners**

| App               | AI Meal Gen       | Pantry Tracking | Expiry Priority | Equipment Steps | Price    |
| ----------------- | ----------------- | --------------- | --------------- | --------------- | -------- |
| **Ollie**         | Yes (LLM)         | Photo scan      | No              | No              | $9.99/mo |
| **Eat This Much** | Yes (macro-based) | No              | No              | No              | ~$5/mo   |
| **Mealime**       | Partial (curated) | No              | No              | No              | $5.99/mo |

**Tier 2: Pantry/Waste Apps**

| App            | Pantry Tracking       | Expiry Alerts | Recipe from Inventory |
| -------------- | --------------------- | ------------- | --------------------- |
| **NoWaste**    | Fridge/freezer/pantry | Yes           | AI suggestions        |
| **KitchenPal** | Full                  | Yes           | By ingredient search  |
| **CozZo**      | Shopping + inventory  | Yes           | Yes (shutting down)   |

**Competitive Gap Confirmed**: No single app combines all five: inventory with expiry, AI meal planning prioritizing expiry, equipment-specific steps, multi-shop grocery lists, and dual plan/cook-time customization.

### Best Practices

- **Hybrid LLM + constraint validation** for recipe generation (CHI 2025). LLM generates; post-processing validates.
- **Schema.org Recipe property names** align with LLM training data -- improves structured output quality.
- **Ingredients as first-class entities** (not embedded) for inventory math, shopping consolidation, substitution.
- **Canonical metric units** (g, ml, units) internally; convert for display only.
- **Static ingredient substitution table** for MVP; AI augments at runtime.
- **List-based weekly view** (not calendar grid) better for mobile MVP.
- **Paprika-style auto-timer detection** from recipe text for cooking mode UX.

### Pitfalls to Avoid

1. **Inventory accuracy decay** is the #1 adoption risk. Auto-deduction after cooking and auto-add after shopping are critical.
2. **LLM hallucination** of unrealistic recipes. Constraint validation layer is essential.
3. **Scope creep**: 27 user stories is massive. P1-P4 are the core loop; P5+ are enhancements.
4. **No public Coles/Woolworths APIs** -- manual product catalogue for MVP.
5. **Ninja Combi has no smart connectivity/API** -- integration is informational only.

## Existing Infrastructure (yt-summarizer Reference)

### Production-Proven Tech Stack

The yt-summarizer project (`C:\Users\ashle\Source\GitHub\AshleyHollis\yt-summarizer`) is the reference architecture. The meal-planner MUST follow the same patterns per the constitution.

**Already deployed and shared (Azure subscription 28aefbe7-e2af-4b4a-9ce1-92d6672c31bd):**

| Resource        | Details                                               |
| --------------- | ----------------------------------------------------- |
| AKS Cluster     | Single-node, cost-optimized                           |
| ACR             | `acrytsummprdci.azurecr.io` (shared container registry) |
| Key Vault       | Centralized secrets management                        |
| Auth0 Tenant    | Already configured with BFF pattern                   |
| GitHub OIDC     | Federated identity for CI/CD (no long-lived secrets)  |
| Cloudflare DNS  | `*.apps.ashleyhollis.com` wildcard                    |
| ArgoCD          | GitOps controller on AKS                              |
| Terraform State | Azure Blob Storage backend                            |

### Tech Stack (Constitutional, NON-NEGOTIABLE)

| Layer            | Technology                                                         | Reference            |
| ---------------- | ------------------------------------------------------------------ | -------------------- |
| Frontend         | Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 | `apps/web/`          |
| Backend API      | FastAPI 0.115+ + SQLAlchemy 2.0 async + Pydantic v2 + Uvicorn      | `services/api/`      |
| Database         | Azure SQL (serverless); SQL Server 2025 locally                    | Alembic migrations   |
| Workers          | Python background workers polling Azure Queue Storage              | `services/workers/`  |
| Shared           | Shared Python package for DB models, config, logging               | `services/shared/`   |
| Auth             | Auth0 (@auth0/nextjs-auth0 BFF, JWT validation for API)            | Already configured   |
| Storage          | Azure Blob Storage + Azure Queue Storage; Azurite locally          | Terraform + Aspire   |
| Orchestration    | .NET Aspire (local), ArgoCD + Kustomize (production)               | `services/aspire/`   |
| IaC              | Terraform (shared-infra for cluster, /infra for app-specific)      | `infra/terraform/`   |
| CI/CD            | GitHub Actions (19 workflows, 9-phase CI)                          | `.github/workflows/` |
| Deployment       | AKS (backend) + Azure Static Web Apps (frontend)                   | ArgoCD GitOps        |
| DNS              | Cloudflare + Gateway API                                           | Auto-TLS certs       |
| Observability    | OpenTelemetry + structlog + Aspire dashboard                       | All services         |
| Package Managers | npm (frontend), uv (Python)                                        | Per-service          |
| Testing          | pytest + Vitest + Playwright                                       | All layers           |

### Project Structure (from yt-summarizer)

```
meal-planner/
├── apps/
│   └── web/                    # Next.js frontend (→ Azure Static Web Apps)
│       ├── src/app/            # App Router pages
│       ├── src/components/     # React components
│       ├── src/services/       # API client methods
│       ├── e2e/                # Playwright E2E tests
│       └── staticwebapp.config.json
├── services/
│   ├── api/                    # FastAPI REST API (→ AKS)
│   │   ├── src/api/routes/     # API endpoints
│   │   ├── src/api/models/     # Pydantic request/response
│   │   ├── src/api/services/   # Business logic
│   │   └── tests/              # pytest
│   ├── workers/                # Background jobs (→ AKS)
│   │   └── [worker-name]/      # One module per worker type
│   ├── shared/                 # Shared Python package
│   │   ├── shared/db/models/   # SQLAlchemy models
│   │   ├── shared/db/connection.py
│   │   ├── shared/config.py    # Pydantic settings
│   │   ├── shared/logging/     # structlog setup
│   │   └── migrations/         # Alembic
│   └── aspire/                 # .NET Aspire orchestration
│       └── AppHost/AppHost.cs
├── infra/terraform/            # App-specific Terraform
├── k8s/                        # Kubernetes manifests
│   ├── base/                   # Base kustomization
│   ├── overlays/prod/          # Production patches
│   └── overlays/preview/       # PR preview patches
├── .github/
│   ├── workflows/              # CI/CD pipelines
│   └── actions/                # Reusable actions
├── scripts/                    # CI helpers, local validation
├── docs/                       # Architecture, runbooks
└── .specify/                   # Spec Kit framework
```

### Proven Patterns to Reuse

**API Endpoints:**

```python
@router.post("/api/v1/resources", response_model=ResponseModel, status_code=201)
async def create_resource(
    body: RequestModel,
    service: ResourceService = Depends(get_service),
) -> ResponseModel:
    return await service.create(body)
```

**Database (async SQLAlchemy):**

```python
async with AsyncSession(engine) as session:
    result = await session.execute(select(Model).where(Model.id == id))
    item = result.scalar_one_or_none()
```

**Structured Logging:**

```python
logger = get_logger(__name__)
logger.info("event_name", entity_id=id, status="processing")
```

**Health Checks:**

```python
@router.get("/health/live")
async def health_check(): return {"status": "ok"}

@router.get("/health/ready")
async def readiness_check(db=Depends(get_db)):
    await db.connect()
    return {"status": "ready"}
```

### CI/CD Pipeline (9-Phase)

| Phase | Purpose             | Tools                      |
| ----- | ------------------- | -------------------------- |
| 1     | Python Lint         | ruff                       |
| 2     | Frontend Quality    | ESLint, TypeScript, Vitest |
| 3     | Security Scan       | bandit, pip audit          |
| 4     | Python Tests        | pytest with xdist          |
| 5     | K8s Validation      | kustomize, kubeval         |
| 6     | Docker Build        | Multi-stage build → ACR    |
| 7     | Terraform Validate  | terraform validate         |
| 8     | Secret Scanning     | gitleaks                   |
| 9     | Workflow Validation | actionlint, pre-commit     |

### GitHub Secrets (Already Configured)

- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (OIDC)
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- `SWA_DEPLOYMENT_TOKEN`, `SWA_PRODUCTION_TOKEN`
- `CLOUDFLARE_API_TOKEN`
- `SQL_ADMIN_PASSWORD`
- `APP_ID`, `APP_PRIVATE_KEY` (GitHub App)

## Codebase Analysis

### Current State

Fully greenfield. No source code exists. Directory structure:

```
meal-planner/
├── .claude/commands/        # Speckit command definitions
├── .specify/memory/constitution.md  # Project governance
├── specs/001-meal-planner-mvp/
│   ├── spec.md              # 1414 lines, 27 user stories
│   └── checklists/
├── .gitignore
└── .git/                    # 27 commits (spec evolution)
```

### Existing Specification

- **27 user stories** (P1-P27) with acceptance scenarios
- **47 functional requirements** (FR-001 to FR-047)
- **14 key entities** defined
- **15 assumptions** documented
- **33 edge cases** addressed
- **6 success criteria** with measurable outcomes

## Data Model

### Core Entities (ERD)

```
Household (1) ----< HouseholdMember (N)

InventoryItem (N) >---- Ingredient (1)
InventoryItem: quantity, unit, expiryDate, location {fridge, pantry, freezer}

Equipment (1) ----< EquipmentMode (N)
EquipmentMode: name, category, minTemp, maxTemp

Recipe (1) ----< RecipeIngredient (N) >---- Ingredient (1)
RecipeIngredient: quantity, unit, processing[], optional, substitutionGroupId

Recipe (1) ----< RecipeStep (N)
RecipeStep: order, instruction, equipmentModeId?, temperature, duration

MealPlan (1) ----< MealSlot (N) >---- Recipe (1)
MealSlot: day, mealType {breakfast, lunch, dinner, snack}

MealPlan (1) ----< GroceryList (1) ----< GroceryItem (N)
GroceryItem: ingredientId, quantity, unit, shop, brand, checked

Ingredient (1) ----< IngredientSubstitution (N)
```

### Ninja Combi Equipment Profile

14 cooking modes. No smart connectivity/API. Pre-seed as structured EquipmentMode entities.

## Quality Commands

| Type           | Command                                            | Notes                   |
| -------------- | -------------------------------------------------- | ----------------------- |
| Python Lint    | `uv run ruff check`                                | 100-char lines          |
| Python Format  | `uv run ruff format`                               | Auto-format             |
| Python Tests   | `uv run pytest`                                    | With xdist for parallel |
| Frontend Lint  | `npm run lint`                                     | ESLint + Prettier       |
| Frontend Tests | `npm run test`                                     | Vitest                  |
| E2E Tests      | `npx playwright test`                              | With Aspire running     |
| Build Frontend | `npm run build`                                    | next build              |
| DB Migrate     | `uv run alembic upgrade head`                      | Schema changes          |
| DB Revision    | `uv run alembic revision --autogenerate -m "desc"` | New migration           |
| Aspire Start   | `dotnet run --project services/aspire/AppHost`     | Full stack local        |

## Feasibility Assessment

| Aspect              | Assessment  | Notes                                              |
| ------------------- | ----------- | -------------------------------------------------- |
| Technical Viability | **High**    | Proven stack, existing infra, established patterns |
| Effort Estimate     | **L**       | 27 user stories; P1-P4 core loop is M-sized        |
| Risk Level          | **Low**     | Stack is production-proven in yt-summarizer        |
| Infra Cost          | **Minimal** | Shared AKS cluster, serverless Azure SQL           |

## Recommendations for Requirements

1. **Scope P1-P4 as true MVP** (Inventory, AI Meal Plan, Grocery List, Customization). P5+ as fast-follow.
2. **Follow constitution tech stack exactly** -- FastAPI + Azure SQL + Auth0 + .NET Aspire. No deviations.
3. **Scaffold from yt-summarizer patterns** -- same project structure, CI/CD, Terraform, K8s manifests.
4. **Use hybrid LLM + constraint validation** for meal plan generation.
5. **Prioritize inventory entry UX** -- autocomplete, frictionless add, auto-deduction.
6. **Start list-based weekly view**, not calendar grid.
7. **Generate recipes as structured JSON** via Pydantic models + LLM API.
8. **Pre-seed Ninja Combi modes** as structured equipment data.
9. **Design multi-shop grocery list from the start** -- primary grouping by store.
10. **Reuse existing GitHub Actions, Auth0, Terraform modules** from yt-summarizer.

## Open Questions (Resolved)

| Question                    | Resolution                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| Constitution vs simplicity? | Follow constitution. Stack is production-proven.                                |
| Auth for personal app?      | Use Auth0 (already deployed, BFF pattern ready).                                |
| Database?                   | Azure SQL (serverless). Shared infra already exists.                            |
| LLM provider?               | Anthropic Claude or OpenAI (both available via yt-summarizer patterns).         |
| Ingredient granularity?     | Separate entries ("chicken breast" vs "chicken thigh") -- affects cooking time. |
| Leftover representation?    | Separate entity with recipe reference (cleaner than overloading InventoryItem). |
| Ninja Combi modes?          | Pre-seeded, user-editable later.                                                |

## Sources

### AI & Meal Planning

- [Ollie AI](https://ollie.ai/)
- [CHI 2025 - LLM + Constrained Optimization](https://dl.acm.org/doi/10.1145/3706599.3719960)
- [DualAgent-Rec](https://arxiv.org/abs/2601.19121)

### Reference Architecture

- yt-summarizer: `C:\Users\ashle\Source\GitHub\AshleyHollis\yt-summarizer`
- Azure subscription: `28aefbe7-e2af-4b4a-9ce1-92d6672c31bd`
- Shared infra: `AshleyHollis/shared-infra`

### Data Modeling

- [Schema.org Recipe](https://schema.org/Recipe)
- [Open Recipe Format](https://open-recipe-format.readthedocs.io/en/latest/)
- [Ninja Combi SFP700 Guide](https://support.ninjakitchen.com/hc/en-us/articles/12422629276188)

### Voice & UX

- [Web Speech API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Screen Wake Lock API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
