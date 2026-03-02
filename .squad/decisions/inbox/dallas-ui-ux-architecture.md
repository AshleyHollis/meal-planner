# Decision: UI/UX Architecture — Responsive Layout, Meal Images, Store Branding

**Author:** Dallas (Lead)  
**Date:** 2026-03-02  
**Status:** Decided  
**Requested by:** Ashley Hollis

---

## Context

The current frontend is locked at `max-w-2xl` (672px) on every page — it renders as a narrow phone column even on a 27" monitor. There are zero images anywhere; every card is text-only. Ashley wants meal photos, store branding in grocery lists, and a proper desktop experience that still works on mobile. She asked about maintaining two separate versions but is open to alternatives.

### Current State (verified from code)

- **Layout:** Every page uses `mx-auto max-w-2xl px-4`. Header also `max-w-2xl`.
- **Navigation:** Fixed bottom nav (4 items), always visible. No desktop adaptation.
- **Breakpoints:** Only `sm:` used once (dashboard quick links grid).
- **Images:** None. `public/` folder contains only `.gitkeep`.
- **Grocery:** Already groups items by `preferred_store` — good foundation for store branding.
- **Recipe type:** Has `title`, `description`, no `image_url` field.
- **Tailwind:** v4, no custom config (`globals.css` is just `@import "tailwindcss"`).
- **Dependencies:** No image-related deps. `next/image` available but unused.

---

## Decisions

### 1. Single Responsive Codebase — NOT Two Versions

**Decision:** One codebase with Tailwind responsive breakpoints. Reject the two-version approach.

**Rationale:** Two codebases means double the maintenance, double the bugs, and divergent feature sets within weeks. Tailwind's responsive utilities solve this cleanly. The current codebase is small enough (6 page routes, ~12 components) that retrofitting responsive classes is a 1-2 day effort, not a rewrite.

**Breakpoint strategy:**
| Range | Tailwind | Layout |
|-------|----------|--------|
| < 1024px | Default (mobile-first) | Bottom nav, single column, `max-w-2xl` content |
| ≥ 1024px | `lg:` | Sidebar nav, multi-column grids, `max-w-6xl` content |
| ≥ 1280px | `xl:` | Wider spacing only (no structural changes) |

**Key changes to `layout.tsx`:**
- Sidebar nav component: visible `lg:` and above, ~240px fixed left.
- Bottom nav: add `lg:hidden` to hide on desktop.
- Header: expand from `max-w-2xl` to full-width on `lg:`, integrate user menu.
- Content wrapper: `max-w-2xl lg:max-w-6xl` (mobile stays narrow, desktop expands).
- Body: `lg:pl-60` to offset content for sidebar.

### 2. Meal Images — Unsplash CDN with Curated Photo IDs

**Decision:** Hardcoded map of food category → Unsplash photo IDs. `next/image` for optimization. CSS gradient fallback.

**Rationale:** Ashley specifically asked for "food photos from shops." Real photos beat generated art or emoji for appetite appeal. Hardcoded photo IDs (not API calls) means:
- Zero runtime API calls, zero rate limits, zero API key management
- Deterministic — same category always shows same image
- Unsplash CDN is highly available and fast
- Unsplash license permits free use (must include attribution link)

**Architecture:**
```
src/lib/meal-images.ts
├── CATEGORY_PHOTOS: Record<string, string>  // ~20 categories → photo IDs
├── getMealImageUrl(mealTitle: string): string | null
│   ├── Extract keywords from title (pasta, chicken, salad, etc.)
│   ├── Match to category
│   └── Return Unsplash CDN URL with size params
└── FALLBACK_GRADIENTS: Record<string, string>  // category → CSS gradient
```

**`next.config.ts` change:**
```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'images.unsplash.com' },
  ],
},
```

**Component integration:**
- `MealSlotCard`: Add 160px image area above title. `next/image` with `fill` + `object-cover`. Falls back to gradient + meal initial.
- `WeeklyPlanView`: 64px thumbnail on each day row (desktop), hidden on mobile to save space.
- Dashboard hero: featured meal image if active plan exists.

**Attribution:** Small "Photos by Unsplash" link in app footer. Required by Unsplash license.

### 3. Store Branding — Styled Badges with Brand Colors

**Decision:** Colored circle avatars with store initials + brand colors. No real logos.

**Rationale:** Store logos require licensing agreements with each retailer. Colored initials are distinctive enough for quick visual scanning and cost nothing legally.

**Architecture:**
```
src/lib/store-branding.ts
├── STORE_BRANDS: Record<string, { color: string; bg: string; abbr: string }>
│   ├── Costco:      { color: '#005DAA', bg: '#E8F0FE', abbr: 'CO' }
│   ├── Woolworths:  { color: '#125F2A', bg: '#E8F5E9', abbr: 'W' }
│   ├── Coles:       { color: '#E01A22', bg: '#FDE8E8', abbr: 'C' }
│   ├── Aldi:        { color: '#00477E', bg: '#E3F2FD', abbr: 'A' }
│   ├── IGA:         { color: '#D32F2F', bg: '#FFEBEE', abbr: 'IG' }
│   ├── Trader Joe's:{ color: '#C8102E', bg: '#FFF0F0', abbr: 'TJ' }
│   └── default:     { color: '#6B7280', bg: '#F3F4F6', abbr: '?' }
└── getStoreBrand(storeName: string): StoreBrand
```

**Component integration:**
- `GroceryList`: Replace plain `<h3>` store headers with branded header bars — colored left border, store avatar circle, store name.
- `GroceryItem`: Optional small store dot indicator on individual items.

### 4. Page-Level Layout Changes

**Dashboard (`page.tsx`):**
- Mobile: Current single-column (keep as-is).
- Desktop `lg:`: Hero section with active plan + featured meal image. Quick links become a 3-column card grid with larger cards showing more detail (item counts, progress bars).

**Meal Plan (`WeeklyPlanView`):**
- Mobile: Current vertical day list (keep as-is).
- Desktop `lg:`: 7-column calendar grid — all days visible at once. Each cell shows meal image thumbnail + title + status. This is more natural than a 2-column Mon-Wed/Thu-Sun split because users think in terms of a weekly calendar.

**Grocery List (`GroceryList`):**
- Mobile: Current single-column store sections (keep as-is).
- Desktop `lg:`: Store sections with branded headers. Items in 2-column grid within each store section. Checked-off items collapse to bottom with reduced opacity.

**Inventory (`InventoryList`):**
- Mobile: Current list (keep as-is).
- Desktop `lg:`: Card grid, 3 columns. Each card shows ingredient name, quantity, expiry badge with more breathing room.

---

## Implementation Order

| Phase | Scope | Effort | Dependencies |
|-------|-------|--------|-------------|
| **P1** | Responsive layout (sidebar nav, content widths, page grids) | 1 day | None |
| **P2** | Meal images (`meal-images.ts`, `next.config.ts`, MealSlotCard, WeeklyPlanView) | 1 day | P1 |
| **P3** | Store branding (`store-branding.ts`, GroceryList headers) | 0.5 day | P1 |
| **P4** | Polish (spacing, hover states, transitions, dark mode prep) | 0.5 day | P1-P3 |

**Total estimate:** 3 days of focused frontend work.

---

## What We're NOT Doing

1. **No new npm dependencies.** Tailwind 4 + `next/image` cover everything.
2. **No backend changes.** All changes are frontend-only. Recipe `image_url` field can come later when AI generates images per-recipe.
3. **No dark mode yet.** Layout groundwork here makes it easy to add later via `dark:` variants.
4. **No real store logos.** Licensing complexity isn't worth it for MVP.
5. **No Unsplash API integration.** Hardcoded photo IDs only. API integration is a future enhancement if we want per-recipe unique photos.
6. **No custom Tailwind config.** Tailwind 4's default breakpoints (`lg: 1024px`, `xl: 1280px`) and spacing scale are sufficient.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Unsplash photo IDs become invalid | Low | Medium | Fallback gradient always renders. Audit IDs quarterly. |
| Desktop layout breaks existing mobile | Medium | High | Mobile-first approach: all new classes use `lg:` prefix. Existing classes untouched. E2E tests run at 375px viewport. |
| Store branding colors clash with app theme | Low | Low | Use muted brand colors (pastel backgrounds, not full-saturation). |
| `next/image` layout shift | Medium | Medium | Set explicit `width`/`height` or use `fill` with aspect-ratio containers. |

---

## Validation Criteria

Before merging responsive layout work:
1. Desktop (1280px): Sidebar visible, bottom nav hidden, multi-column grids render.
2. Mobile (375px): No visual regression from current state. Bottom nav visible.
3. Tablet (768px): Falls back to mobile layout (no awkward in-between state).
4. All existing Vitest unit tests pass.
5. Lighthouse mobile score ≥ 90 (no image-caused regression).
