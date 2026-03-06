---
name: "spec-workflow"
description: "End-to-end feature development pipeline: idea → spec → plan → tasks → implement → ship"
domain: "coordination"
confidence: "high"
source: "manual"
---

# Spec-Driven Development Workflow

This skill defines how the team takes a feature idea and turns it into shipped code. It mirrors the Smart Ralph pattern but uses Squad's agent architecture for parallel execution.

## Trigger

The coordinator activates this workflow when the user says any of:

- "Build feature X" / "Add feature X" / "I want to build X"
- "New feature: {description}"
- "Spec out {feature}"
- "Bishop, spec {feature}"
- Any request that describes a new capability requiring multiple user stories

## Pipeline Overview

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. SPEC     │ →  │  2. REVIEW   │ →  │  3. PLAN     │ →  │  4. TASKS    │ →  │ 5. IMPLEMENT │
│  Bishop      │    │  Dallas      │    │  (in spec)   │    │  (in spec)   │    │  All agents  │
│  researches  │    │  reviews     │    │  plan.md     │    │  tasks.md    │    │  fan-out     │
│  + writes    │    │  spec.md     │    │  already     │    │  already     │    │  in waves    │
│  spec.md     │    │              │    │  written     │    │  written     │    │              │
│  plan.md     │    │              │    │              │    │              │    │              │
│  tasks.md    │    │              │    │              │    │              │    │              │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘    └──────────────┘
```

**Key difference from sequential pipelines:** Bishop writes ALL three artifacts (spec.md, plan.md, tasks.md) in a single session. Dallas reviews after. Then implementation fans out immediately.

## Phase 1: Spec Creation (Bishop)

### Input

Feature ID and description, e.g.:

```
"006-cooking-experience: Build the cook-time experience with step-by-step
mode, voice control, and push notifications for prep tasks."
```

### What Bishop Does

1. **Research** — reads 15-20+ files across the codebase to understand patterns
2. **Creates `specs/{feature-id}/`** directory
3. **Writes `spec.md`** — user stories with acceptance scenarios
4. **Writes `plan.md`** — data models, API contracts, architecture
5. **Writes `tasks.md`** — ordered tasks with `[P]` parallel markers and verification checkpoints

### Output Quality Requirements

- Every task has exact file paths
- Every model has exact column types and constraints
- Every API endpoint has request/response shapes
- Parallel tasks marked with `[P]`
- Verification checkpoints (V1, V2, V3...) with exact commands
- Tasks grouped by user story

### Coordinator Behavior During Spec

- Spawn Bishop (sync or background depending on whether implementation follows)
- Simultaneously spawn Dallas to prepare for review (reads existing specs as reference)
- If user provided a description with multiple features, Bishop handles all in one spec

## Phase 2: Spec Review (Dallas)

### What Dallas Does

1. Reads the spec artifacts Bishop created
2. Checks for completeness, consistency, missing edge cases
3. Verifies task ordering and parallel markers
4. Either approves or requests changes

### Coordinator Behavior

- If approved → proceed to implementation immediately
- If changes requested → Bishop revises, Dallas re-reviews (max 2 rounds)
- Don't wait for user approval between spec and implementation — Dallas's approval is the gate

## Phase 3: Implementation (All Agents — Max Throughput)

### How the Coordinator Processes tasks.md

1. **Read tasks.md** — parse all tasks, identify phases and parallel markers
2. **Phase 1 tasks** — spawn agents for ALL `[P]` tasks simultaneously:
   - Model/migration tasks → Ripley (backend)
   - Pydantic model tasks → Ripley (backend)
   - TypeScript type tasks → Kane (frontend)
   - Test tasks → Lambert (tests)
3. **Verification checkpoint** — after Phase 1 tasks complete, run V1 commands
4. **Phase 2 tasks** — launch all parallel tasks in next phase
5. **Continue in waves** until all phases complete
6. **Final verification** — run all V-checkpoints

### Agent Routing for Tasks

| Task Pattern                         | Route To |
| ------------------------------------ | -------- |
| SQLAlchemy model, migration, Alembic | Ripley   |
| Pydantic models, API service, routes | Ripley   |
| Worker/generator changes             | Ripley   |
| TypeScript types, API client         | Kane     |
| React components, pages, UI          | Kane     |
| E2E tests, Playwright specs          | Lambert  |
| API unit tests, pytest               | Lambert  |
| Lint/build verification              | Parker   |
| UX completeness review               | Ash      |

### Post-Implementation

After all tasks complete:

1. Lambert runs full test suite
2. Ash runs Feature Completeness Review (ceremony)
3. Lambert runs Visual Smoke Test (ceremony)
4. Parker verifies build and lint
5. Scribe logs everything

## Feature ID Convention

Feature IDs follow the pattern: `{NNN}-{kebab-case-name}`

| ID   | Feature                |
| ---- | ---------------------- |
| 001  | meal-planner-mvp       |
| 002  | inventory-enhancements |
| 003  | personalization-ai     |
| 004  | planning-enhancements  |
| 005  | grocery-enhancements   |
| 006+ | (next features)        |

## Branch Strategy

Each feature gets its own branch: `{feature-id}` (e.g., `006-cooking-experience`). For parallel feature development, use git worktrees — same pattern as Smart Ralph:

```bash
git worktree add ../meal-planner-{feature-id} -b {feature-id}
```

## Smart Ralph Command Equivalents

| Smart Ralph Command                              | Squad Equivalent                                |
| ------------------------------------------------ | ----------------------------------------------- |
| `/ralph-specum:new 006-cooking-experience "..."` | `"Bishop, spec 006-cooking-experience: ..."`    |
| `/ralph-specum:status`                           | `"Ralph, status"` or `"Where are we?"`          |
| `/ralph-specum:implement --recovery-mode`        | `"Team, continue implementing from tasks.md"`   |
| `/ralph-specum:cancel`                           | `"Ralph, idle"`                                 |
| `/ralph-specum:research`                         | `"Bishop, research the codebase for feature X"` |
| `/ralph-specum:requirements`                     | `"Bishop, write spec.md for feature X"`         |
| `/ralph-specum:design`                           | `"Bishop, write plan.md for feature X"`         |
| `/ralph-specum:tasks`                            | `"Bishop, write tasks.md for feature X"`        |

## Example: Full Pipeline Execution

User says:

```
Bishop, spec 006-cooking-experience: "Build the cook-time experience with
step-by-step mode, voice control, and push notifications."
```

Coordinator:

1. Spawns Bishop (background) to create spec/plan/tasks
2. Spawns Dallas (background) to prepare for review
3. Shows launch table:
   ```
   📐 Bishop — creating spec for 006-cooking-experience
   🏗️ Dallas — preparing for spec review
   📋 Scribe — logging session
   ```
4. When Bishop completes → Dallas reviews (sync)
5. When Dallas approves → fan-out implementation:
   ```
   🔧 Ripley — Phase 1: models + migrations + API (4 parallel tasks)
   ⚛️ Kane — Phase 1: TypeScript types + API client (3 parallel tasks)
   🧪 Lambert — Phase 1: test scaffolding (2 parallel tasks)
   👁️ Ash — reading spec for UX review prep
   📋 Scribe — logging
   ```
6. Phase 1 completes → V1 checkpoint → Phase 2 launches → ...
7. All phases complete → Ash runs Feature Completeness Review
8. Done → Scribe commits, creates PR
