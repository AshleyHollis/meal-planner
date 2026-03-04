---
name: "ux-completeness"
description: "Standards for what makes a feature feel complete to a user"
domain: "frontend-ux"
confidence: "high"
source: "manual"
---

# UX Completeness Standards

Every feature must feel complete from a user's perspective, not just technically functional. Apply these standards to all frontend work.

## Core Principles

### 1. Every Data Entity Is Clickable

Meals, recipes, ingredients, products — if it appears as text or a card, it links to its detail view. If no detail view exists yet, create one or use an expandable inline detail.

**Check:** Can the user tap/click on every noun they see? If not, fix it.

### 2. Images Everywhere

If one view shows a meal image, ALL views showing that meal must show an image. No inconsistency between pages.

| View | Must Show Image? |
|------|-----------------|
| Dashboard hero | Yes |
| Dashboard recent meals | Yes |
| Meal plan weekly grid | Yes |
| History list | Yes |
| Grocery list (recipe context) | Yes, thumbnail |
| Search results | Yes |

**Check:** Search for all places an entity is rendered. Does every instance have a visual representation?

### 3. Consistent Interaction Patterns

If you can delete on one page, you can delete everywhere it's relevant. If one page has search, similar pages should too. Buttons that exist on one page for an entity should exist on all pages showing that entity.

**Check:** Pick any action (delete, edit, favorite, rate). Is it available everywhere the entity appears?

### 4. No Dead Ends

Every page has clear next actions. No orphan screens. Every list item leads somewhere. Back navigation always works.

**Check:** Can the user always move forward or backward? Is there always a call-to-action?

### 5. Progressive Disclosure

Show summary first, click for detail. Don't overwhelm with information, but don't hide it either.

**Check:** Is the default view scannable? Can users drill into any item for more?

### 6. Empty States Are Designed

Never show a blank page or empty container without explanation. Every empty state has:
- An icon or illustration
- A title explaining what goes here
- A description of how to populate it
- A call-to-action button (when applicable)

### 7. Loading States Exist

Every async operation shows a loading indicator. Use skeleton loaders for content areas, spinners for actions.

**Check:** Throttle network in dev tools. Does every page look intentional while loading?

### 8. Error States Are Helpful

Show what went wrong AND what the user can do about it. Include retry buttons for transient failures. Show actual API error messages, never generic "Something went wrong."

### 9. Feedback for Every Action

Every user action gets immediate feedback:
- Button clicks: loading state or disabled state
- Form submissions: success toast or inline error
- Deletions: confirmation dialog + success toast
- Toggles: visual state change

**Check:** Click every button. Does something visible happen immediately?

## Anti-Patterns

- **Building exactly what the task says and nothing more** — Tasks are implementation guides, not UX specifications. Always think about what a user would expect.
- **Showing raw IDs or technical data** — UUIDs, timestamps in ISO format, enum values like "DRAFT" instead of "Draft"
- **Images on some pages but not others** — Inconsistency makes the app feel unfinished
- **Non-clickable text that looks interactive** — Blue text, underlined text, or card-like elements that don't respond to clicks
- **Fake actions** — Buttons that show a toast but don't actually do anything (e.g., "Cook This" that doesn't create a plan)
- **Generic error messages** — "Failed to load" without explanation or retry option
- **Silent failures** — Empty catch blocks, swallowed errors, no feedback on failure
- **Inconsistent formatting** — Currency as "$1.50" on one page and "AUD 1.50" on another
