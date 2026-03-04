# Work Routing

How to decide who handles what.

## Routing Table

| Work Type                                         | Route To | Examples                                                        |
| ------------------------------------------------- | -------- | --------------------------------------------------------------- |
| Architecture, scope, CORS diagnosis               | Dallas   | API design, middleware debugging, tech decisions                |
| Backend API, FastAPI, SQLAlchemy, worker          | Ripley   | Fix endpoints, CORS middleware, worker config, DB queries       |
| Frontend, Next.js, React, TypeScript, UI          | Kane     | Components, pages, API client, Auth0 BFF, runtime config        |
| K8s, CI/CD, Terraform, deployment                 | Parker   | Pipeline fixes, AKS debugging, image verification, ArgoCD       |
| E2E tests, Playwright, test seeding               | Lambert  | Fix skipped tests, seed data strategy, test assertions          |
| Visual smoke testing (preview env)                | Lambert  | Playwright MCP browser testing in Azure preview                 |
| Code review                                       | Dallas   | Review PRs, check quality, approve/reject                       |
| Testing strategy                                  | Lambert  | Test coverage, edge cases, verify fixes                         |
| Scope & priorities                                | Dallas   | What to build next, trade-offs, decisions                       |
| UX completeness, feature feel, visual consistency | Ash      | Feature feels incomplete, missing interactions, inconsistent UI |
| Session logging                                   | Scribe   | Automatic — never needs routing                                 |

## Rules

### Core Parallelism (Max Throughput Mode — ACTIVE)

1. **ALWAYS fan-out** — default to Full mode (multi-agent parallel) for ALL work, not just "Team, ..." requests. The `max-throughput` skill is active — read it before every routing decision.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for status checks.
4. **When two agents could handle it**, spawn BOTH. Cost is not a concern. More agents = more throughput.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate ALL downstream work.** Don't just spawn for the current task — spawn for everything that will be needed next:
   - Implementation task → also spawn Lambert (tests), Ash (UX review prep), Scribe (logging)
   - Backend API change → also spawn Kane (frontend integration prep)
   - Frontend change → also spawn Ash (UX review), Lambert (E2E tests)
   - Bug fix → also spawn Lambert (regression test)
7. **CORS/API issues** — Ripley owns the fix, Dallas reviews, Parker verifies deployment. All spawn in parallel.
8. **E2E test failures** — Lambert diagnoses, Ripley fixes API-side, Parker fixes infra-side. All spawn in parallel.

### Quality Gates

9. **Visual smoke test gate** — After E2E tests pass and preview is green, Lambert MUST run visual smoke tests using Playwright MCP browser tools before the feature is marked complete. Kane fixes any visual bugs found. Feature is blocked until smoke tests pass. (Decision 15)
10. **UX completeness gate** — After Kane completes a user story, Ash MUST review for feature completeness using the `ux-completeness` skill. Issues filed by Ash are blocking — feature is not done until Ash approves.
11. **Anticipate UX review** — When spawning Kane for frontend work, also spawn Ash to prepare for review. Ash reads the user story and skill standards while Kane implements.

### Chaining and Continuous Execution

12. **Chain immediately** — When agents complete, don't stop. Identify what's unblocked, launch the next wave of agents, THEN report to the user.
13. **Process tasks.md in waves** — When working from a task file, identify ALL `[P]` (parallel) tasks in the current phase and launch agents for all of them simultaneously. As tasks complete, launch the next unlocked phase immediately.
14. **Ralph never stops** — When Ralph is active, process ALL work categories in parallel (untriaged + assigned + CI failures simultaneously). Never stop between rounds.
15. **No idle agents** — After every batch, check: more tasks? quality improvements? missing tests? UX gaps? documentation? If anything exists, launch it. Don't wait for the user to ask.
