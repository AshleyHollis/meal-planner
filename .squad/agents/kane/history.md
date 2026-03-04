# Kane — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4, Auth0 v4 BFF
- **Owner:** Ashley Hollis
- **Branch:** 001-meal-planner-mvp (PR #1)
- **State:** Frontend fully built. 37 frontend unit tests pass. Build clean (6 routes, 102kB shared JS).
- **Key files:** apps/web/src/services/api.ts, apps/web/src/services/runtimeConfig.ts, apps/web/src/middleware.ts
- **Auth pattern:** Auth0 v4 BFF — /auth/access-token endpoint, Bearer token on all API calls

## Learnings

### Phase 1 — Responsive Layout (Desktop Sidebar Nav)

- **What changed:** 7 files updated — `layout.tsx`, `page.tsx`, `meal-plan/page.tsx`, `meal-plan/[id]/page.tsx`, `inventory/page.tsx`, `grocery-list/[id]/page.tsx`, `WeeklyPlanView.tsx`.
- **Pattern used:** Tailwind responsive prefixes only (`lg:`, `xl:`). No custom CSS or media queries. No new dependencies.
- **Sidebar approach:** Added `DesktopSidebar` component in layout.tsx (`hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0`). Uses same `usePathname()` active state logic as `BottomNav`. User name + logout at sidebar bottom.
- **Mobile preserved:** `Header` got `lg:hidden`, `BottomNav` nav got `lg:hidden`, body padding kept `pb-20 lg:pb-0`. All mobile behavior unchanged.
- **Content offset:** Wrapped `Header` + `children` + `BottomNav` in `<div className="lg:pl-64">` to offset for sidebar width.
- **Container width:** All `<main>` elements updated to `max-w-2xl lg:max-w-7xl` for wider desktop canvas.
- **Build result:** ✅ Clean — 7 routes, 102kB shared JS, 0 errors. Only pre-existing `<a>` auth link warnings (not related to this work).
- **Inventory page:** Restructured to `lg:grid lg:grid-cols-2 lg:gap-8` with form on left and list on right — logic/state unchanged.

### Phase 2 & 3 — Meal Images + Store Branding

- **What changed:** 2 new lib files (`meal-images.ts`, `store-branding.ts`) + 5 component files updated (`MealSlotCard.tsx`, `WeeklyPlanView.tsx`, `GroceryList.tsx`, `page.tsx`) + `next.config.ts`.
- **Image approach:** `next/image` with `fill` + `object-cover` + `placeholder="empty"`. Unsplash CDN via photo ID lookup. Category matched by keyword scan of meal name (exact word then substring). Gradient overlay on image for legibility.
- **Fallback:** When category = "default" (no keyword match), `getMealImageUrl` returns `""` — components render a thin gradient color bar instead.
- **Store branding:** Colored circle badge in GroceryList section headers. Unknown stores default to first 2 chars of store name, gray background.
- **Desktop grocery layout:** `lg:grid lg:grid-cols-2 lg:divide-y-0` applied to grocery items list for 2-col layout on desktop.
- **Dashboard image:** Today's dinner slot image shown as a banner at top of Active Plan card. Falls back gracefully when no plan or no recipe for today.
- **Build result:** ✅ Clean — 7 routes, 0 errors. Only pre-existing `<a>` auth link warnings.

### Phase 4 — Polish and Build Verification

- **Files reviewed:** All 12 modified files from Phases 1–3 plus `grocery-list/page.tsx`.
- **Issues found and fixed:**
  1. `grocery-list/page.tsx` — both `<main>` containers (loading state and no-plan state) were missing `lg:max-w-7xl`. Fixed to `max-w-2xl px-4 py-8 lg:max-w-7xl`.
  2. `meal-images.ts` — `roast` category gradient had invalid Tailwind color `to-brown-700` (Tailwind has no `brown` palette). Fixed to `from-amber-600 to-amber-800`.
- **Consistency verified:**
  - All `<main>` containers: `max-w-2xl lg:max-w-7xl mx-auto` ✅
  - Desktop sidebar nav: all 4 routes match bottom nav ✅
  - Active route styling uses `pathname.startsWith(href)` in both nav components ✅
  - No raw `<img>` tags — all images use `next/image` with proper `alt` text ✅
  - All `'use client'` directives present where `usePathname`/`useState`/`useEffect`/`use()` are used ✅
  - Badge `"info"` variant is defined in `Badge.tsx` ✅
- **Build result:** ✅ Clean — 7 routes, 0 TypeScript errors, 0 new warnings. Pre-existing `<a>` auth link lint warnings remain (intentional — Auth0 BFF requires hard redirects, not Next.js Link).
- **Tests:** ✅ 37/37 passed — no regressions.

### Phase 5 — Comprehensive UX Overhaul (2026-03-04)

- **Context:** 9-item UX polish initiative: navigation redesign, design system, reusable components, meal plan enhancements, dashboard polish, empty states, inventory polish, meal plan detail improvements.
- **Orchestration:** Ripley added DELETE endpoint (enables delete button); Lambert conducted E2E selector audit (preservation checklist to maintain selectors during refactoring).
- **What changed:** 16 files (845 insertions, 187 deletions) — created Skeleton.tsx, EmptyState.tsx; redesigned layout.tsx navigation; enhanced Badge.tsx with status variants; applied empty states across 6+ pages.
- **Navigation:** Mobile bottom nav reduced from 8 to 5 primary items (Home, Meal Plan, Grocery, Inventory, More) with slide-up menu. Desktop sidebar reorganized into 3 grouped sections (Planning, Shopping, Me) with headers and left-bar active indicators.
- **Components:** New Skeleton component with text/circular/rectangular variants + pulse animation. New EmptyState component with icon, title, description, optional action. Enhanced Badge with active/completed/failed/draft variants including icons.
- **Meal plan list:** Added status filter tabs (All, Active, Completed, Failed, Draft) with counts, sort DESC by date, delete button for failed/completed plans (with confirmation), "Show more" pagination (10 per page).
- **Dashboard:** Enhanced hero card with gradient overlay, stats row (Meals This Week, Items Expiring, In Inventory), prominent expiry warning (orange-50 bg, border-2, emoji, inline CTA), quick action buttons in colored circles, gradient progress bar.
- **Inventory:** Storage location icons in section headers (🧊 Fridge, 🗄️ Pantry, ❄️ Freezer with counts), expiry color coding (red <3d, orange <7d, yellow/green >7d).
- **Meal plan detail:** Meal type labels above cards (🌅 Breakfast, 🍽️ Lunch, 🌙 Dinner), day summary with total prep+cook time, "Nothing planned" days with dashed border + gray-50 bg, prominent progress bar.
- **Technical:** All changes pure Tailwind CSS — no custom CSS files. TypeScript strict mode. All existing functionality preserved. E2E test selectors maintained per Lambert's preservation checklist.
- **Build result:** ✅ Clean — 12 routes, 0 TypeScript errors, build passes.
- **Integration:** Ripley's DELETE endpoint enabled via new deleteMealPlan API function; delete button now visible on failed/completed plans with confirmation flow.

### Phase 5 — Auto-complete Existing Plan Before New Generation

- **What changed:** `apps/web/src/app/meal-plan/page.tsx` — modified `handleGenerate` function.
- **Problem:** API returns 409 Conflict when user clicks "Generate New Plan" while an active or draft plan exists.
- **Fix:** Before calling `createMealPlan()`, check `plans` state for any plan with status "active" or "draft". If found, call `updatePlanStatus(planId, { status: "completed" })` first.
- **API detail:** `updatePlanStatus` takes `(planId: string, body: UpdatePlanStatusBody)` where `UpdatePlanStatusBody = { status: MealPlanStatus }`. Task description said plain string param but actual signature is object — always check TypeScript types.
- **Tests:** ✅ 87/87 passed — no regressions. TypeScript clean.
- **Commit:** `9f45365` on branch `003-personalization-ai`.

### Phase 7 — 005-grocery-enhancements (T014–T027)

- **What changed:** 9 files — 5 new, 4 modified. Commit `4779cfe` on branch `005-grocery-enhancements`.
- **Types (T014+T016):** Extended `GroceryItem` with `ingredient_name?`, `ingredient_category?`, `product?: ProductSummary | null`. Added `ProductSummary`, `Product`, `TripState` interfaces to `types/index.ts`. Used optional fields throughout for backwards compatibility.
- **API (T015):** Added `Product` to imports, `CreateProductBody`/`UpdateProductBody` request types, and 5 product API functions (getProducts, createProduct, updateProduct, deleteProduct, searchProducts) to `api.ts`.
- **ProductMappingForm (T017):** New `components/ProductMappingForm.tsx` — create/edit form with brand (required), product_name (required), size_desc, price, shop, notes. Uses updateProduct if existingProduct provided, otherwise createProduct. Inline validation, consistent Tailwind styling.
- **GroceryItem (T018):** Fixed UUID display bug — now shows `ingredient_name ?? ingredient_id`. Shows product details (brand·name, price badge, shop tag) when linked. Shows "Link Product" button inline when not linked. Added `tripChecked` prop for trip mode visual state.
- **tripStorage (T023):** New `services/tripStorage.ts` — localStorage trip state management with getTripState, setItemChecked, getTripProgress, clearTripsForList, isNewList. SSR-safe (`typeof window === "undefined"` guards).
- **ShopFilter (T024):** New `components/ShopFilter.tsx` — derives distinct shops from `product?.shop`, renders "All" + per-shop tabs + "Other". Shows item counts, active tab uses store brand color. `"__other__"` sentinel for items with no product shop.
- **TripTracker (T025):** New `components/TripTracker.tsx` — progress bar + item checklist for active shop filter. "Complete Trip" marks all trip-checked items globally via API then clears localStorage state.
- **GroceryList (T019+T026):** Integrated ShopFilter + TripTracker at top. `selectedShop` state drives filtering + TripTracker visibility. Passes `tripChecked` to GroceryItem. Added `onProductLinked` prop.
- **Products page (T020):** New `app/products/page.tsx` — full CRUD page. Debounced search (300ms), grouped by ingredient_name, inline edit/delete with confirmation, add form at top.
- **Pattern note:** `"__other__"` is the sentinel used for shop filter "Other" tab (items with no product or no product.shop). ShopFilter emits this, filterByShop in GroceryList handles it.
- **TypeScript result:** ✅ 0 errors. Lint: ✅ 0 errors (4 pre-existing auth `<a>` warnings, intentional).
- **node_modules missing on start:** Had to run `npm install` in `apps/web` before TypeScript check worked. Not pre-installed in this environment.

- **What changed:** 3 files updated, 1 file created — `meal-plan/[id]/page.tsx`, `history/page.tsx`, `layout.tsx`.
- **Task 1 — Replace WeeklyPlanView with MealSlotCard:** Updated plan detail page to render `MealSlotCard` for each slot instead of read-only `WeeklyPlanView`. Added `onMarkCooked` and `onMarkSkipped` callbacks that call `updateSlotStatus` API, then trigger `refetch()` from polling hook to refresh data.
- **Task 2 — Expandable recipe detail view:** Added `expandedSlots` state (Set<string>) and toggle handler. Below each `MealSlotCard`, render a "View Recipe" / "Hide Recipe" button. When expanded, show recipe description, ingredients list (with quantity/unit/ID — ingredient names not available in data), and cooking steps with step numbers and duration.
- **Task 3 — Create /history page:** Created `apps/web/src/app/history/page.tsx` mounting `MealHistoryList` component. Implemented pagination with `getMealHistory(page, 20)`, page state, hasMore detection, and loading states. Added History nav link to layout with clock icon.
- **Task 4 — Fix favorite state loading:** On plan detail page load, call `listFavorites()` and build `Set<string>` of recipe IDs. Pass `isFavorited={favoriteRecipeIds.has(recipe.id)}` to each `MealSlotCard`. Implemented `handleFavoriteToggle` that calls `addFavorite`/`removeFavorite` API and updates local state.
- **Patterns used:**
  - Grouped slots by day using `slotsByDay: Record<number, MealSlot[]>` then sorted keys for consistent render order.
  - Used `useMealPlanPolling` hook's `refetch` method (not `setPlan`) to refresh data after mark-cooked/skip actions.
  - HistoryIcon SVG uses clock symbol (viewBox 0 0 24 24, circle + clock hands path).
  - Expanded nav from 5 to 6 items — bottom nav still fits on mobile (56px min-height per item ensures 44px tap target).
  - Recipe detail shows ingredient IDs (not names) because `RecipeIngredient.ingredient_id` is a string ID — no join to Ingredient table in current data structure.
- **Build result:** ✅ Clean — TypeScript 0 errors, lint 4 warnings (pre-existing auth `<a>` tags), tests 87/87 passed.
- **Outcome:** Users can now mark meals as cooked/skipped, rate cooked meals, favorite recipes, view cooking instructions inline, and see meal history. All core personalization features wired up.

### Phase 8 — UX Overhaul (Comprehensive Frontend Polish)

- **What changed:** 20+ files — created 2 new UI components (Skeleton, EmptyState), enhanced Badge with status variants, overhauled navigation, updated all 9 key pages/components. Build clean (12 routes, 0 errors).
- **Reusable UI (T1):** Created `Skeleton.tsx` (pulse animation, 3 variants: text/circular/rectangular) and `EmptyState.tsx` (icon, title, description, optional action button/link). Enhanced `Badge.tsx` with status-specific variants (active/completed/failed/draft) including icons (● ✓ ✕ ○).
- **Navigation overhaul (T2):** Desktop sidebar now has 3 sections with headers (Planning, Shopping, Me). Mobile bottom nav reduced to 5 items with "More" slide-up menu for remaining items. Added Products icon (tag SVG). Active indicators enhanced (colored left bar on desktop, dot/bar on mobile). `useState` for "More" menu state.
- **Meal plan list page (T1+T3):** Status filter tabs (All, Active, Completed, Failed, Draft) with counts. Sort by date DESC. Delete button on failed plans with confirmation dialog. Better plan cards with colored left border by status, plan number, meal count summary. Show 10 by default with "Show more" button. Changed default mealTypes from `["dinner"]` to `["breakfast", "lunch", "dinner"]`. Added `deleteMealPlan` API function. EmptyState component for no plans.
- **Dashboard (T9):** Enhanced hero card with gradient overlay (from-black/70 via-black/30 to-transparent), better typography. Stats row (3 cards: Meals This Week, Items Expiring, In Inventory). Expiry warning more prominent with orange-50 bg, border-2, emoji, and inline CTA button. Quick actions as icon buttons in rounded-full colored backgrounds (blue/green/purple/orange-100). Progress bar with gradient (from-green-500 to-green-600).
- **Inventory (T7):** Storage location icons in section headers (🧊 Fridge, 🗄️ Pantry, ❄️ Freezer) with item counts. Expiry badge colors: red for <3 days, orange for <7 days, yellow for >7 days. Empty state component with 🧊 icon. Card styling on form (rounded-xl, border-gray-100, shadow-sm).
- **History (T5):** EmptyState component (📖 icon, "No Meals Yet", "Cook meals from your plan to build history"). Card styling on list (rounded-xl, border-gray-100, shadow-sm, hover:shadow-md).
- **Products (T5):** EmptyState component (🏷️ icon, "No Products Yet", "Map ingredients to specific store products"). Card styling on product items (rounded-xl, shadow-sm, hover:shadow-md, transition-shadow).
- **Meal plan detail (T8):** Meal type labels above cards (🌅 Breakfast, 🍽️ Lunch, 🌙 Dinner). Day summary with total prep+cook time. "Nothing planned" days with dashed border, gray-50 bg. Progress bar in header card with gradient, larger height (h-3), and bold counter. Header moved into rounded-xl card with badge.
- **Patterns used:**
  - Consistent card styling: `rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200`
  - Typography hierarchy: text-2xl/font-bold for page titles, text-lg/font-semibold for sections, text-sm/text-gray-600 for body, text-xs/text-gray-500 for labels
  - Status colors via border-l-4: green-500 (active), blue-500 (completed), red-500 (failed), gray-400 (draft)
  - EmptyState abstraction: icon (emoji string), title, description, optional action (either href+label or onAction+label)
  - Badge icons: active=●, completed=✓, failed=✕, draft=○
- **Build result:** ✅ Clean — 12 routes, 0 TypeScript errors, 4 lint warnings (pre-existing auth `<a>` tags, intentional for Auth0 BFF hard redirects).
- **Outcome:** Significantly improved UX with modern, polished UI. Consistent visual language across all pages. Better information hierarchy and user guidance via empty states. Enhanced navigation usability on both mobile and desktop.

### Phase 9 — UX Polish Layer (Toast, Progress, Dates, Hover, Mobile)

- **What changed:** 8 files — 2 new (Toast.tsx, date-utils.ts), 6 modified (globals.css, layout.tsx, meal-plan/page.tsx, GroceryItem.tsx, AddItemForm.tsx, InventoryList.tsx). Commit `6b60450` on branch `005-grocery-enhancements`.
- **Toast system:** Created `components/ui/Toast.tsx` — `ToastProvider` wraps the whole app in `layout.tsx`. `useToast()` hook available in any client component. Toasts slide in from right via `@keyframes toast-in` in `globals.css`. 3 variants: success (green), error (red), info (gray). Auto-dismiss at 3.5s. Positioned `bottom-24` on mobile (above bottom nav), `bottom-6` on desktop.
- **Usage:** Delete meal plan → "Plan deleted" (success). Add inventory item → "Item added" (success). Check grocery item → "✓ [name]" (success).
- **Progress indicator:** During plan generation, a 3-step animated stepper renders inside the generate card: "Creating" → "Recipes" → "Grocery". Steps advance via `setInterval` every 2s while `generating === true`. Steps render as colored progress bars that fill left-to-right.
- **Date formatting:** Created `lib/date-utils.ts` with `formatRelativeDate(dateString)`. Returns "Created today", "Created yesterday", "Created N days ago", or "Created [Month Day]". Applied to meal plan card subtitles.
- **Hover effects:** Meal plan cards upgraded from `transition-shadow` to `transition-all hover:scale-[1.01] active:scale-[0.99]`. Inventory list items: `hover:bg-gray-50` row highlight. Grocery items: `hover:bg-gray-50 active:bg-gray-100` row highlight.
- **Mobile grocery:** GroceryItem checkbox now wrapped in `<label>` with `min-h-[44px] min-w-[44px]` for touch-friendly tap target. Checkbox size increased from `h-4 w-4` to `h-5 w-5`.
- **Build result:** ✅ Clean — 12 routes, 0 TypeScript errors, 4 pre-existing auth `<a>` warnings (intentional).

### Phase 11 — Fix Dashboard Generate Plan (2026-03-09)

- **Root cause:** Dashboard `handleGenerate` called `createMealPlan()` directly without first checking for existing active/draft plans. API returns 409 Conflict in that case. The meal plan page already had this fix (auto-complete before create), but the dashboard did not.
- **Key insight:** `getActiveMealPlan()` only returns plans with status "active". A "draft" plan causes 409 but won't be found in the dashboard's `plan` state. The fix uses `listMealPlans()` inside `handleGenerate` to catch ALL active/draft plans (not just the one in state).
- **Changes to `apps/web/src/app/page.tsx`:**
  1. Added `listMealPlans`, `updatePlanStatus` to API imports.
  2. Added `MealTypeSelector` and `useToast` imports.
  3. Added `mealTypes` state, `generationStep` state, and `stepIntervalRef`.
  4. Added generation step `useEffect` (same 2s interval pattern as meal plan page).
  5. Fixed `handleGenerate`: call `listMealPlans()` → find active/draft → `updatePlanStatus(id, {status:'completed'})` → then `createMealPlan()`.
  6. Improved error extraction: reads `err.body.detail` from ApiError body (same as meal plan page).
  7. Replaced "Customize Cuisine" toggle pattern with always-visible `CuisineSelector` + `MealTypeSelector`.
  8. Added generation progress indicator (3-step progress bar, spinner, step labels).
  9. Added `showToast` on error for toast + inline error feedback.
- **Build:** ✅ 15 routes, 0 TypeScript errors. **Tests:** ✅ 104/104 passed.
- **Commit:** `f1d988a` on branch `005-grocery-enhancements`.


- **What changed:** 1 file — `components/MealHistoryList.tsx`. Enhanced history page with meal images and expandable detail view.
- **Meal images:** Added thumbnail images (56x56 rounded) on left of each history item using `getMealImageUrl` from `lib/meal-images.ts`. Unsplash URLs use standard `<img>` tag (not `next/image`) as they're external.
- **Expandable items:** Added `expandedId` state and click handler. Each item toggles between compact and expanded view. Chevron icon rotates 180° when expanded. Full `<button>` element wrapping item content for accessibility.
- **Expanded view:** Shows larger image (128px/160px), full recipe title as heading, formatted date with weekday, meal type, cuisine, and rating with empty stars (★★★★★ → ★★★☆☆). Two-column grid on mobile, side-by-side on tablet+. Gray-50 background distinguishes expanded section.
- **Visual improvements:** Increased thumbnail from 14x14 to 56x56 (h-14 w-14), added shadow-sm to images, improved badge spacing (gap-1.5), changed divider from gray-200 to gray-100, added active:bg-gray-100 for tactile feedback.
- **Transition patterns:** Chevron uses `transition-transform` with conditional `rotate-180`. Button uses `transition-colors` for smooth hover/active states. Maintains existing hover:bg-gray-50 pattern from other list items in the app.
- **Tests:** ✅ All 9 tests pass — renders empty state, displays items, shows badges, Load More button, pagination, and interactivity all working.
- **Build result:** ✅ TypeScript 0 errors, lint shows 2 new `<img>` warnings (expected for external Unsplash URLs), 4 pre-existing auth `<a>` warnings.
