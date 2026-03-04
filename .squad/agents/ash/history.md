---
last_updated: 2026-03-04T00:00:00Z
---

# Ash — UX Reviewer History

Project-specific learnings from UX reviews.

## Learnings

<!-- Append entries after each review session. Format: **Learning:** description. **Session:** date. -->

**Learning:** The most common silent failure pattern in this codebase is `catch { // silently fail for POC }` — at least 6 components (GroceryItem, InventoryList ×2, Products page) ship this to users without any feedback. Every audit must specifically grep for this pattern. **Session:** 2026-03-05

**Learning:** Two linked detail pages do not exist (`/inventory/[id]` and `/products/[id]`) despite both having absolute-inset `<Link>` overlays on their list items. Whenever a list item is made clickable, confirm the destination page actually exists. **Session:** 2026-03-05

**Learning:** Currency is formatted three different ways in the same user flow (grocery list → grocery item → products): hardcoded `$`, `Intl.NumberFormat("en-AU")`, and various inline `toFixed(2)` calls. Currency formatting should be centralised in a single lib utility. **Session:** 2026-03-05

**Learning:** Empty states across this codebase are inconsistent — some use the `EmptyState` component correctly (Meal Plan list, History, Inventory), but Quick Suggestions, Recurring Meals, Grocery Index, and Products search results all use bare `<p>` text. Every empty container must use `EmptyState` with icon + title + description + CTA. **Session:** 2026-03-05

**Learning:** The desktop sidebar lacks a Home/Dashboard link. Only the header logo navigates there. Mobile correctly has Home in the bottom nav. Always check desktop nav parity when reviewing navigation. **Session:** 2026-03-05

**Learning:** The "Cook This" button on Quick Suggestions shows a success toast but makes no API call — a classic fake action anti-pattern. Any button that claims to do something must actually do it or not exist at all. **Session:** 2026-03-05

**Learning:** Error retry patterns are inconsistent. Only the Inventory page has a Retry button. Dashboard, History, Quick Suggestions, Recurring Meals, Preferences, and Grocery List detail all show errors with no retry affordance. Retry should be the default, not the exception. **Session:** 2026-03-05

**Learning:** The `WeeklyPlanView.tsx` component is built and unused — the meal plan detail page inlines its own equivalent. Dead code components should be deleted or adopted; they create confusion for future reviewers. **Session:** 2026-03-05
