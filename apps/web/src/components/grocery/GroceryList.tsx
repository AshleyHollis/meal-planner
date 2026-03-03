"use client";

import { useState } from "react";

import type { GroceryList as GroceryListType } from "@/types";
import { GroceryItem } from "./GroceryItem";
import { getStoreBrand } from "@/lib/store-branding";
import { ShopFilter } from "@/components/ShopFilter";
import { TripTracker } from "@/components/TripTracker";
import { getTripState } from "@/services/tripStorage";

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

function filterByShop(
  items: GroceryListType["items"],
  selectedShop: string | null,
): GroceryListType["items"] {
  if (selectedShop === null) return items;
  if (selectedShop === "__other__") {
    return items.filter((item) => !item.product?.shop);
  }
  return items.filter(
    (item) =>
      item.product?.shop?.toLowerCase().trim() ===
      selectedShop.toLowerCase().trim(),
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroceryListProps {
  groceryList: GroceryListType;
  onChanged?: () => void;
  onProductLinked?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GroceryList({ groceryList, onChanged, onProductLinked }: GroceryListProps) {
  const { items } = groceryList;
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [tripCheckedIds, setTripCheckedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    // Restore trip state for selected shop on mount
    return new Set<string>();
  });

  function handleItemTripCheck(itemId: string, checked: boolean) {
    setTripCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  function handleShopChange(shop: string | null) {
    setSelectedShop(shop);
    // Restore trip state for this shop
    if (shop && shop !== "__other__") {
      const state = getTripState(groceryList.id, shop);
      setTripCheckedIds(new Set(state?.checkedItemIds ?? []));
    } else {
      setTripCheckedIds(new Set());
    }
  }

  function handleTripComplete() {
    setSelectedShop(null);
    setTripCheckedIds(new Set());
    onChanged?.();
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        No items on the grocery list.
      </p>
    );
  }

  const filteredItems = filterByShop(items, selectedShop);
  const grouped = groupByStore(filteredItems);
  const storeNames = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <ShopFilter
        items={items}
        selectedShop={selectedShop}
        onFilterChange={handleShopChange}
      />

      {selectedShop && selectedShop !== "__other__" && (
        <TripTracker
          groceryListId={groceryList.id}
          shop={selectedShop}
          items={filteredItems}
          onTripComplete={handleTripComplete}
          onItemTripCheck={handleItemTripCheck}
        />
      )}

      {storeNames.map((store) => {
        const brand = getStoreBrand(store);
        return (
          <section key={store}>
            <div className="mb-2 flex items-center gap-3">
              <span
                className={`${brand.color} ${brand.textColor} flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold`}
              >
                {brand.abbreviation}
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{store}</h3>
            </div>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 lg:grid lg:grid-cols-2 lg:divide-y-0">
              {grouped[store].map((item) => (
                <GroceryItem
                  key={item.id}
                  item={item}
                  onChanged={onProductLinked ?? onChanged}
                  tripChecked={
                    selectedShop && selectedShop !== "__other__"
                      ? tripCheckedIds.has(item.id)
                      : undefined
                  }
                />
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

