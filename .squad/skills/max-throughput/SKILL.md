---
name: "max-throughput"
description: "Maximize parallel agent work output — never do less when you can do more"
domain: "coordination"
confidence: "high"
source: "manual"
---

# Max Throughput Execution

The owner has explicitly stated: **maximize the amount of work done. Premium request cost is not a concern.** This skill overrides any cost-saving defaults.

## Core Philosophy

Every turn the coordinator takes should launch the **maximum possible number of agents in parallel**. Never serialize when you can parallelize. Never spawn one agent when three could start simultaneously. Never wait for results when anticipatory work can begin.

## Rules

### 1. Always Use Full Mode

Default to Full mode (multi-agent fan-out) for ALL work requests, not just "Team, ..." prefixed ones. The only exception is genuinely single-concern, single-file fixes. When in doubt, upgrade to Full mode.

### 2. Fan-Out Aggressively

For any task:

- Spawn the **primary agent** doing the work
- Spawn the **tester** to write tests from requirements simultaneously
- Spawn **Ash** (UX Reviewer) to read the user story and prepare review criteria
- Spawn the **Scribe** to log everything
- If the task touches both backend and frontend, spawn **both** Ripley and Kane in parallel

Never wait for one agent to finish before starting another unless there is a **hard data dependency** (Agent B needs a file Agent A hasn't created yet).

### 3. Anticipatory Spawning — Always

Don't just think about what's needed now. Think about what will be needed **after this work completes** and start it early:

| Current Work        | Anticipatory Spawn                   | Why                            |
| ------------------- | ------------------------------------ | ------------------------------ |
| Kane building UI    | Ash reading UX skill + user story    | Review starts faster           |
| Ripley building API | Kane reading API contracts           | Frontend can start mapping     |
| Any implementation  | Lambert writing test cases from spec | Tests ready when code lands    |
| Any code change     | Parker checking CI/build impact      | Deployment issues caught early |
| Bug fix             | Lambert writing regression test      | Prevents re-occurrence         |

### 4. Chain Follow-Ups Immediately

When agents complete, **do not stop and report to the user**. Instead:

1. Collect results
2. Immediately identify what's unblocked
3. Launch the next wave of agents
4. THEN report what happened and what's now in flight

The user sees continuous progress, not start-stop-start-stop.

### 5. Model Selection — Quality Over Cost

Since premium requests are explicitly approved:

- Use `claude-sonnet-4.6` for ALL code-writing agents (Kane, Ripley, Lambert)
- Use `claude-opus-4.6` for Dallas (Lead) — always
- Use `claude-sonnet-4.6` for Ash (UX Reviewer) — judgment matters
- Only use `claude-haiku-4.5` for Scribe and Parker (truly mechanical work)

### 6. Ralph Keeps the Pipeline Moving

When Ralph is active:

- Process ALL categories in parallel (not one at a time)
- Spawn agents for untriaged issues AND assigned issues AND CI failures simultaneously
- Never stop between rounds — continuous execution until the board is clear
- If the board is clear, scan for code quality issues, missing tests, or UX gaps to fill

### 7. Task Decomposition — Go Broader

When decomposing a user request, don't just identify the obvious work:

**Narrow decomposition (avoid):**

> "Add product search" → Spawn Kane to build search UI

**Broad decomposition (prefer):**

> "Add product search" → Spawn Kane (search UI) + Ripley (search API endpoint) + Lambert (E2E tests for search) + Ash (review search UX patterns) + Dallas (review search architecture) — ALL in parallel

### 8. Ceremonies Don't Block — They Run Alongside

Design Reviews should run **concurrently** with early implementation:

- Spawn the Lead for design review
- Simultaneously spawn agents to begin scaffolding, writing types, setting up test files
- If the design review changes the approach, agents pivot — but they've already done useful groundwork

### 9. Never Leave Agents Idle

After every batch:

1. Are there more tasks in the backlog? → Launch them
2. Are there quality improvements to make? → Launch them
3. Are there tests to write? → Launch them
4. Are there UX issues Ash identified? → Fix them
5. Is there documentation to update? → Launch it
6. Nothing left? → Run Ash for a full UX audit of the app

### 10. Spec-Driven Workflow Integration

When working from a tasks.md file:

- Identify ALL tasks that can run in parallel (tagged with `[P]`)
- Launch agents for ALL parallel tasks simultaneously
- As tasks complete, immediately launch the next unlocked tasks
- Track phase gates (V1, V2, V3...) and run verification tasks as soon as prerequisites finish
- Never wait for user confirmation between phases — keep the pipeline flowing

## Anti-Patterns

- **One agent at a time** — Never spawn a single agent when multiple could work
- **Waiting for user input between tasks** — Chain automatically unless blocked
- **Cost-saving model downgrades** — User said cost doesn't matter
- **Serializing due to shared files** — Drop-box pattern eliminates conflicts
- **Reporting before launching next work** — Launch first, report second
- **Skipping anticipatory work** — If you know a tester will be needed, start them now
