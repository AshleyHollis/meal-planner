# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Architecture, scope, CORS diagnosis | Dallas | API design, middleware debugging, tech decisions |
| Backend API, FastAPI, SQLAlchemy, worker | Ripley | Fix endpoints, CORS middleware, worker config, DB queries |
| Frontend, Next.js, React, TypeScript, UI | Kane | Components, pages, API client, Auth0 BFF, runtime config |
| K8s, CI/CD, Terraform, deployment | Parker | Pipeline fixes, AKS debugging, image verification, ArgoCD |
| E2E tests, Playwright, test seeding | Lambert | Fix skipped tests, seed data strategy, test assertions |
| Code review | Dallas | Review PRs, check quality, approve/reject |
| Testing strategy | Lambert | Test coverage, edge cases, verify fixes |
| Scope & priorities | Dallas | What to build next, trade-offs, decisions |
| Session logging | Scribe | Automatic — never needs routing |

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for status checks.
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a fix is being built, spawn Lambert to verify it simultaneously.
7. **CORS/API issues** — Ripley owns the fix, Dallas reviews, Parker verifies deployment.
8. **E2E test failures** — Lambert diagnoses, Ripley fixes API-side, Parker fixes infra-side.
