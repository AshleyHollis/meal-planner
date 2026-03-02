"use client";

import type { GroceryList as GroceryListType } from "@/types";
import { GroceryItem } from "./GroceryItem";
import { getStoreBrand } from "@/lib/store-branding";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByStore(
  items: GroceryListType["items"],
): Record<string, GroceryListType["items"]> {
  const groups: Record<string, GroceryListType["items"]> = {};

  for (const item of items) {
    const store = item.preferred_store ?? "Other";
    if (!groups[store]) {
      groups[store] = [];
    }
    groups[store].push(item);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroceryListProps {
  groceryList: GroceryListType;
  onChanged?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GroceryList({ groceryList, onChanged }: GroceryListProps) {
  const { items } = groceryList;

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        No items on the grocery list.
      </p>
    );
  }

  const grouped = groupByStore(items);
  const storeNames = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {storeNames.map((store) => {
        const brand = getStoreBrand(store);
        return (
        <section key={store}>
          <div className="mb-2 flex items-center gap-3">
            <span className={`${brand.color} ${brand.textColor} flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold`}>
              {brand.abbreviation}
            </span>
            <h3 className="text-lg font-semibold text-gray-900">{store}</h3>
          </div>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 lg:grid lg:grid-cols-2 lg:divide-y-0">
            {grouped[store].map((item) => (
              <GroceryItem key={item.id} item={item} onChanged={onChanged} />
            ))}
          </ul>
        </section>
        );
      })}
    </div>
  );
}

export { GroceryList };
export type { GroceryListProps };
