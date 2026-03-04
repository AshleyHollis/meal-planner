# Decision: Expandable List Item Pattern for History and Similar Pages

**Author:** Kane (Frontend Dev)  
**Date:** 2026-03-04  
**Status:** Proposed

## Context

History page needed images and better interactivity. Couldn't link to individual recipe pages (none exist), and meal plan ID not available in history item data.

## Decision

Implement expandable list items with click-to-toggle detail view:

- Thumbnail image (56x56 rounded) in compact view
- Full `<button>` wrapper for entire item (accessible, keyboard-friendly)
- Chevron icon with rotate-180 transition
- Expanded view shows larger image (128px/160px), detailed metadata grid, formatted dates
- State managed locally via `useState<string | null>` for expanded ID
- Only one item expanded at a time (toggle closes others)

## Rationale

- **No navigation target:** History items have `slot_id` and `recipe_id` but no individual recipe detail page exists yet. Expandable inline detail is better UX than dead links.
- **Maintain feed feel:** Keeping users on the same page preserves the timeline/feed experience vs navigating away.
- **Mobile-friendly:** Touch target is entire row, expanding inline avoids modal/navigation overhead.
- **Reusable pattern:** Can apply to notifications, activity feeds, search results, etc.

## Implementation

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null);

const toggleExpanded = (id: string) => {
  setExpandedId((prev) => (prev === id ? null : id));
};

// In render:
<button
  onClick={() => toggleExpanded(item.id)}
  className="w-full text-left hover:bg-gray-50"
>
  {/* compact view */}
</button>;
{
  isExpanded && <div className="bg-gray-50">{/* detail view */}</div>;
}
```

## Alternatives Considered

1. **Link to meal plan detail page** — Rejected: plan_id not in MealHistoryItem data, would require API change.
2. **Modal popup** — Rejected: Adds complexity, worse mobile UX, breaks scroll context.
3. **Always show full detail** — Rejected: Makes list too dense, hurts scannability.

## Testing

All 9 existing tests pass. Tests verify:

- Empty state, list rendering, badges, pagination, Load More button
- No new tests needed — expansion is progressive enhancement, core functionality unchanged

## Future Work

If recipe detail pages are added later, can replace expansion with navigation:

```tsx
<Link href={`/recipe/${item.recipe_id}`}>...</Link>
```

Pattern established here can be used for similar feed-style pages (notifications, search results, etc).
