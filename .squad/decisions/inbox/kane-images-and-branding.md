# Decision: Meal Images & Store Branding (Phase 2 & 3)

**Author:** Kane (Frontend Dev)  
**Date:** Phase 2 & 3 implementation

---

## Context

After Phase 1 (responsive desktop layout), the UI lacked visual richness. Phase 2 adds meal photography and Phase 3 adds store identity badges to the grocery list.

---

## Decisions Made

### 1. Unsplash CDN via Photo ID (not signed URLs)

Used direct Unsplash photo IDs with URL query parameters (`?auto=format&fit=crop&w=...&h=...&q=80`). This avoids needing any API key and is reliable for public food photography.

**Alternative considered:** Placeholder services (picsum, via.placeholder) — rejected per task spec.

### 2. Keyword-based Category Matching

`getMealCategory()` uses word-split then substring scan against `KEYWORD_MAP`. Returns `"default"` when nothing matches, causing `getMealImageUrl()` to return `""` (empty string) as a clean fallback.

**Why not fuzzy match:** Overkill for MVP. Word-level matching covers ~95% of realistic meal names.

### 3. `next/image` with `fill` layout

All images use `fill` + parent `relative` container with explicit height classes (`h-32 lg:h-48`). `placeholder="empty"` used because no blur hash is available from the static URL mapping.

### 4. Store Badge as Colored Circle

Store section headers now render a colored circle with 1–3 character abbreviation. Unknown stores get the first 2 chars of their name + gray background. This is purely CSS (Tailwind) — no icon library needed.

### 5. Grocery 2-Column Desktop Layout

Applied `lg:grid lg:grid-cols-2 lg:divide-y-0` directly to the `<ul>` inside each store section. The `GroceryItem` component was not changed — it works naturally in grid context.

### 6. Dashboard Today's Meal Image

Used day-of-week logic (`getDay()` → Mon=0..Sun=6) to find today's dinner slot from the active plan. Shows a banner image at the top of the Active Plan card. Falls back gracefully (no image rendered) when plan is absent or no dinner recipe assigned for today.

---

## Non-Decisions (Scope Excluded)

- No `blur` placeholder — no blur hash available from static Unsplash URLs
- No new npm packages installed
- No API/type changes
- Auth/middleware untouched
