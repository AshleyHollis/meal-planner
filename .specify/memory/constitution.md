<!--
  Sync Impact Report
  Version change: N/A → 1.0.0
  Added principles:
    - I. Shared Infrastructure
    - II. Test-First Development
    - III. Observability by Default
    - IV. Secret-Zero Trust
    - V. Code Quality Gates
    - VI. Simplicity & YAGNI
  Added sections:
    - Tech Stack Requirements
    - Development Workflow
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ (no changes needed, constitution check is dynamic)
    - .specify/templates/spec-template.md ✅ (no changes needed)
    - .specify/templates/tasks-template.md ✅ (no changes needed)
  Follow-up TODOs: None
-->

# Meal Planner Constitution

## Core Principles

### I. Shared Infrastructure

All infrastructure-as-code (Terraform), Kubernetes cluster resources, and shared
CI/CD pipeline definitions MUST live in the `AshleyHollis/shared-infra` repository.
Application-specific Kubernetes manifests (deployments, services, configmaps) remain
in this repo under `k8s/`. This separation ensures that meal-planner and yt-summarizer
do not trample each other's infrastructure.

- Terraform modules for shared Azure resources (AKS, ACR, Key Vault, DNS) MUST be
  defined in shared-infra and referenced by application repos.
- Application-specific Terraform (e.g., Azure SQL Database, Storage accounts, SWA)
  MAY live in this repo under `infra/` but MUST NOT duplicate shared resources.
- Changes to shared infrastructure MUST be coordinated across consuming projects.

### II. Test-First Development (NON-NEGOTIABLE)

Tests MUST be run before marking ANY task complete. End-to-end tests are REQUIRED
for final verification and MUST NOT be skipped.

- Run the project test script before completing any task.
- Pre-commit checks MUST pass before pushing.
- E2E tests MUST be run with Aspire orchestration active.
- Red-Green-Refactor: write failing tests first, then implement, then refactor.

### III. Observability by Default

Every service MUST emit structured logs and OpenTelemetry traces from day one.
Observability is not an afterthought.

- Python services: `structlog` with `get_logger(__name__)` and context fields.
- All HTTP services: OpenTelemetry instrumentation (FastAPI, httpx, SQLAlchemy).
- Frontend: structured console logging in development, error boundaries in production.
- .NET Aspire dashboard MUST be the primary local observability surface.

### IV. Secret-Zero Trust

ALL secrets MUST be stored in Azure Key Vault and provisioned via Terraform.
No manual secret creation. No secrets in environment variables, config files,
or source code.

- External Secrets Operator pulls secrets into Kubernetes from Key Vault.
- Local development uses Aspire-injected configuration or Azurite emulation.
- CI/CD authenticates via GitHub OIDC federated credentials (no long-lived tokens).

### V. Code Quality Gates (NON-NEGOTIABLE)

Pre-commit hooks and CI checks are mandatory. Code MUST NOT be merged without
passing all quality gates.

- **Python**: ruff format + ruff check (100-char line length, imports sorted),
  bandit security scan, type hints on all public interfaces.
- **TypeScript**: ESLint + Prettier (singleQuote, semi, printWidth 100),
  strict TypeScript compilation, npm audit.
- **Line length**: 100 characters for both Python and TypeScript.
- **Pre-commit**: YAML lint, JSON check, actionlint, ruff, prettier,
  script permissions.
- **CI phases**: Lint → Security → Unit Tests → K8s Validation → Image Build.

### VI. Simplicity & YAGNI

Start with the simplest solution that works. Do not build for hypothetical
future requirements.

- No premature abstractions: three similar lines are better than a premature helper.
- No feature flags or backwards-compatibility shims when you can just change the code.
- No over-engineered error handling for scenarios that cannot happen.
- Complexity MUST be justified in the plan's Complexity Tracking table.

## Tech Stack Requirements

The meal-planner MUST use the same technology stack as yt-summarizer to maintain
consistency and enable shared tooling.

| Layer              | Technology                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| Frontend           | Next.js (App Router) + React + TypeScript + Tailwind CSS v4             |
| Backend API        | FastAPI (Python 3.11+) + SQLAlchemy 2.0 async + Pydantic v2             |
| Database           | Azure SQL Database (MS SQL Server); local dev uses SQL Server container |
| Workers            | Python background workers polling Azure Queue Storage                   |
| Auth               | Auth0 (BFF pattern for frontend, JWT validation for API)                |
| Storage            | Azure Blob Storage + Azure Queue Storage; local dev uses Azurite        |
| Orchestration      | .NET Aspire (local dev), ArgoCD + Kustomize (production)                |
| IaC                | Terraform (shared-infra repo for cluster, this repo for app-specific)   |
| CI/CD              | GitHub Actions with OIDC auth to Azure                                  |
| Container Registry | Azure Container Registry (shared via shared-infra)                      |
| Package Managers   | npm (frontend), uv (Python services)                                    |
| Observability      | OpenTelemetry + structlog + Aspire dashboard                            |

## Development Workflow

All development follows this workflow to maintain quality and velocity.

- **Local development**: .NET Aspire orchestrates all services (Next.js, FastAPI,
  workers, SQL Server, Azurite). Start with `aspire run`.
- **Branch strategy**: Feature branches from main, PR-based review, ArgoCD preview
  environments per PR.
- **Migrations**: Alembic for database schema changes, run via
  `uv run alembic revision --autogenerate -m "description"`.
- **Deployment**: Push to main triggers CI → Terraform → K8s overlay update →
  ArgoCD sync → SWA deploy → health checks.
- **Preview environments**: PRs get isolated K8s namespaces and SWA preview slots
  with Playwright E2E validation.
- **Code style**: Python uses `dataclass` for payloads, async `AsyncSession` for DB,
  named exports in TypeScript, PascalCase for components/types, camelCase for
  variables/functions.

## Governance

This constitution supersedes all other development practices for the meal-planner
project. Amendments require:

1. A PR with the proposed change to this file.
2. Documentation of the rationale and impact.
3. A migration plan if the change affects existing code.
4. Version bump following semantic versioning (MAJOR for principle removals,
   MINOR for additions, PATCH for clarifications).

All PRs and code reviews MUST verify compliance with these principles. Complexity
beyond what is described here MUST be justified in writing.

**Version**: 1.0.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-02-28
