# Ceremonies

> Team meetings that happen before or after work. Each squad configures their own.

## Design Review

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| **Trigger**      | auto                                                          |
| **When**         | before                                                        |
| **Condition**    | multi-agent task involving 2+ agents modifying shared systems |
| **Facilitator**  | lead                                                          |
| **Participants** | all-relevant                                                  |
| **Time budget**  | focused                                                       |
| **Enabled**      | ✅ yes                                                        |

**Agenda:**

1. Review the task and requirements
2. Agree on interfaces and contracts between components
3. Identify risks and edge cases
4. Assign action items

---

## Retrospective

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| **Trigger**      | auto                                               |
| **When**         | after                                              |
| **Condition**    | build failure, test failure, or reviewer rejection |
| **Facilitator**  | lead                                               |
| **Participants** | all-involved                                       |
| **Time budget**  | focused                                            |
| **Enabled**      | ✅ yes                                             |

**Agenda:**

1. What happened? (facts only)
2. Root cause analysis
3. What should change?
4. Action items for next iteration

---

## Visual Smoke Test

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| **Trigger**      | auto                                           |
| **When**         | after                                          |
| **Condition**    | E2E tests pass and preview deployment is green |
| **Facilitator**  | tester                                         |
| **Participants** | tester, frontend-dev                           |
| **Time budget**  | focused                                        |
| **Enabled**      | ✅ yes                                         |

**Agenda:**

1. Navigate to Azure preview environment using Playwright MCP browser tools
2. Test each user story's primary UI flows visually (authenticated + unauthenticated)
3. Verify data displays correctly — no raw IDs, proper formatting, correct badges
4. Check for visual regressions on existing pages (Dashboard, Inventory, Meal Plans, History)
5. Capture accessibility snapshots or screenshots as evidence
6. File blocking issues for any visual bugs found — feature is NOT complete until resolved

**Gate:** Feature cannot be marked complete or PR merged until this ceremony passes. Any visual bugs are blocking.

---

## Feature Completeness Review

| Field            | Value                                         |
| ---------------- | --------------------------------------------- |
| **Trigger**      | auto                                          |
| **When**         | after                                         |
| **Condition**    | all tasks in a user story are marked complete |
| **Facilitator**  | ux-reviewer                                   |
| **Participants** | ux-reviewer, lead, frontend-dev               |
| **Time budget**  | focused                                       |
| **Enabled**      | yes                                           |

**Agenda:**

1. Walk through the feature as a user would — not as a developer
2. Check: Is every data entity clickable? Do images appear consistently across all pages?
3. Check: Are there dead ends, missing actions, fake buttons, or confusing flows?
4. Check: Does this feature meet the `ux-completeness` skill standards?
5. Check: Are empty states, loading states, and error states properly designed?
6. Check: Is formatting consistent (currency, dates, labels) across all pages?
7. File blocking issues for anything that falls short — assign to Kane or Ripley

**Gate:** Feature cannot be marked complete until Ash (UX Reviewer) approves. UX issues are blocking.

---

## Spec Review

| Field            | Value                                         |
| ---------------- | --------------------------------------------- |
| **Trigger**      | auto                                          |
| **When**         | after                                         |
| **Condition**    | Bishop completes spec.md + plan.md + tasks.md |
| **Facilitator**  | lead                                          |
| **Participants** | lead, spec-architect                          |
| **Time budget**  | focused                                       |
| **Enabled**      | yes                                           |

**Agenda:**

1. Review spec.md — are user stories complete with acceptance scenarios?
2. Review plan.md — are data models, API contracts, and architecture sound?
3. Review tasks.md — are tasks ordered correctly, parallel markers accurate, file paths exact?
4. Check for missing edge cases, security concerns, or regressions
5. Approve or request specific changes (max 2 revision rounds)

**Gate:** Implementation cannot begin until Dallas (Lead) approves the spec. If approved, implementation starts immediately — no user confirmation needed.
