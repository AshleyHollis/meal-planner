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

| Field            | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| **Trigger**      | auto                                                                     |
| **When**         | after                                                                    |
| **Condition**    | E2E tests pass and preview deployment is green                           |
| **Facilitator**  | tester                                                                   |
| **Participants** | tester, frontend-dev                                                     |
| **Time budget**  | focused                                                                  |
| **Enabled**      | ✅ yes                                                                   |

**Agenda:**

1. Navigate to Azure preview environment using Playwright MCP browser tools
2. Test each user story's primary UI flows visually (authenticated + unauthenticated)
3. Verify data displays correctly — no raw IDs, proper formatting, correct badges
4. Check for visual regressions on existing pages (Dashboard, Inventory, Meal Plans, History)
5. Capture accessibility snapshots or screenshots as evidence
6. File blocking issues for any visual bugs found — feature is NOT complete until resolved

**Gate:** Feature cannot be marked complete or PR merged until this ceremony passes. Any visual bugs are blocking.
