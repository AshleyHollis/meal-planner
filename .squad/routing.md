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
| New feature, spec, plan, tasks, requirements      | Bishop   | "Build feature X", "Spec out Y", "Add feature Z"                |
| Session logging                                   | Scribe   | Automatic — never needs routing                                 |
| Human notification (blocked, error, done)         | Any      | Use `squad-human-notification` skill via Discord MCP            |

## Rules

### ⚠️ CRITICAL: Coordinator Proactivity (Highest Priority)

0. **NEVER pause to ask "should I continue?"** — If the user said "implement", "build", "fix", or "Team, do X", that means ALL of it. Complete every phase, tier, and follow-up WITHOUT stopping for confirmation. The only valid reasons to stop: (a) ambiguous NEW requirements, (b) destructive actions on production, (c) genuinely nothing left to do.
   0a. **NEVER call task_complete mid-plan.** Check: Is the plan fully executed? All tiers done? Tests pass? Code pushed? CI green? Only then mark complete.
   0b. **After each agent batch completes:** Immediately identify and launch the next batch. Report results AND next actions in the same message. The user should never have to say "keep going".

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

### Spec Pipeline

12. **"Build feature X" → spec pipeline.** When the user describes a new feature, activate the `spec-workflow` skill. Spawn Bishop to create spec/plan/tasks, spawn Dallas to prepare for review. After Bishop completes, Dallas reviews (sync). After Dallas approves, fan-out all agents for implementation using tasks.md waves.
13. **"Bishop, spec X" → spec only.** If the user explicitly names Bishop, spawn Bishop alone for spec work. Still spawn Dallas for review after.
14. **Spec → Implementation is automatic.** After Dallas approves specs, the coordinator immediately starts implementation. Don't wait for user confirmation — Dallas's approval is the gate.

### Chaining and Continuous Execution

15. **Chain immediately** — When agents complete, don't stop. Identify what's unblocked, launch the next wave of agents, THEN report to the user.
16. **Process tasks.md in waves** — When working from a task file, identify ALL `[P]` (parallel) tasks in the current phase and launch agents for all of them simultaneously. As tasks complete, launch the next unlocked phase immediately.
17. **Ralph never stops** — When Ralph is active, process ALL work categories in parallel (untriaged + assigned + CI failures simultaneously). Never stop between rounds.
18. **No idle agents** — After every batch, check: more tasks? quality improvements? missing tests? UX gaps? documentation? If anything exists, launch it. Don't wait for the user to ask.

### Discord Notifications (Mandatory)

23. **Every agent MUST send Discord notifications** — Read the `squad-human-notification` skill before starting work. Agents must notify on: phase/task completion, errors blocking progress, questions needing input, and CI/pipeline results. Use the node.js script method (in the skill) which always works, even when Discord MCP tools aren't loaded.
24. **Coordinator sends summary notifications** — After collecting results from agent batches, the coordinator sends a Discord summary to `#meal-planner` with what completed and what's next. This ensures the user gets push notifications on their phone even when away from the terminal.
25. **Questions go to Discord first** — When an agent needs user input and `ask_user` isn't available (background mode), post the question to Discord and check for replies before making a default decision.

19. **Never stop after pushing** — After pushing code, the coordinator MUST monitor the CI pipeline to completion. If CI fails, diagnose and fix immediately. Do not report success or wait for the user to notice failures.
20. **Preview deployment gate** — After CI passes, monitor the Preview workflow. Verify it deploys successfully and E2E tests pass in the preview environment.
21. **Visual smoke test is mandatory** — After preview deployment succeeds, auto-trigger the Visual Smoke Test ceremony (Rule 9). Feature work is NOT complete until the full pipeline passes: CI → Preview → E2E → Visual Smoke Test.
22. **Pipeline failures are highest priority** — If a pipeline fails after a push, fixing it takes precedence over all other queued work. Route the fix to the appropriate agent (Ripley for backend, Kane for frontend, Parker for infra).
