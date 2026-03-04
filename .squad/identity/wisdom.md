---
last_updated: 2026-03-04T00:00:00Z
---

# Team Wisdom

Reusable patterns and heuristics learned through work. NOT transcripts — each entry is a distilled, actionable insight.

## Patterns

**Pattern:** Every meal shown anywhere must be clickable and display an image.
**Context:** Dashboard, history, meal plan detail, grocery list — all views showing meals. If one view has images, all views must have images for the same data.

**Pattern:** Features must feel complete to a user, not just technically functional.
**Context:** When implementing a user story, think about what a first-time user would expect. If they'd naturally try to click something, it must be clickable. If they'd expect to see an image, it must be there.

**Pattern:** Same action on multiple pages must use identical logic.
**Context:** "Generate Plan" existed on both dashboard and meal plan page with different implementations. The dashboard version broke silently because it didn't auto-complete existing plans. Extract shared hooks when the same API interaction appears in 2+ places.

**Pattern:** Error messages must show actual API detail, not generic text.
**Context:** "Failed to generate meal plan" tells the user nothing. Extract `err.body.detail` and show the real reason. Include a Retry button for transient failures. The Inventory page pattern (show detail + Retry) is the team standard.

**Pattern:** Every user-facing action button needs E2E test coverage.
**Context:** Dashboard "Generate Plan" broke and went undetected because E2E tests only covered the meal plan page version. If a button calls an API, it needs a test that clicks it.

**Pattern:** No fake actions — if a button says it does something, it must actually do it.
**Context:** "Cook This" button showed a success toast but didn't create any plan. Placeholder toasts are worse than no button at all. Either implement the action or remove the button.

**Pattern:** DRY shared utilities — extract functions used in 2+ places.
**Context:** `getNextMonday()` was defined identically in 2 files. `DAY_LABELS` in 3 places. Currency formatting inconsistent. Extract to `@/lib/` utils.

## Anti-Patterns

**Avoid:** Building exactly what the task says and nothing more.
**Why:** Users expect polished, complete features. "Minimal and surgical" produces MVP-quality output that feels unfinished. Always think about what a user would naturally expect beyond the explicit task.

**Avoid:** Showing images on some pages but not others for the same data.
**Why:** Inconsistency makes the app feel unfinished and confuses users about whether they're looking at the same data.

**Avoid:** Empty `catch {}` blocks that silently swallow errors.
**Why:** Users get no feedback when something fails. Always show a toast or error state so the user knows what happened and can try again.

**Avoid:** Using `scalar_one()` in async worker code.
**Why:** Target rows can be deleted between LLM call and DB write. Use `scalar_one_or_none()` + None guard for graceful handling.
