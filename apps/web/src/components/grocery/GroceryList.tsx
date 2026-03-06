"use client";

import { useState } from "react";

import type { GroceryList as GroceryListType } from "@/types";
import { GroceryItem } from "./GroceryItem";
import { getStoreBrand } from "@/lib/store-branding";
import {
  getItemShop,
  normalizeShopName,
  OTHER_SHOP_LABEL,
  OTHER_SHOP_VALUE,
} from "@/lib/shop-utils";
import { ShopFilter } from "@/components/ShopFilter";
import { TripTracker } from "@/components/TripTracker";
import { CompleteShoppingDialog } from "@/components/grocery/CompleteShoppingDialog";
import {
  clearTripState,
  getTripState,
  setItemChecked,
} from "@/services/tripStorage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByStore(
  items: GroceryListType["items"],
): Record<string, GroceryListType["items"]> {
  const groups: Record<string, GroceryListType["items"]> = {};

  for (const item of items) {
    const store = getItemShop(item) ?? OTHER_SHOP_LABEL;
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
  if (selectedShop === OTHER_SHOP_VALUE) {
    return items.filter((item) => !getItemShop(item));
  }
  return items.filter((item) => {
    const itemShop = getItemShop(item);
    return itemShop !== null
      ? normalizeShopName(itemShop) === normalizeShopName(selectedShop)
      : false;
  });
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

function GroceryList({
  groceryList,
  onChanged,
  onProductLinked,
}: GroceryListProps) {
  const { items } = groceryList;
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [tripCheckedIds, setTripCheckedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    // Restore trip state for selected shop on mount
    return new Set<string>();
  });
  const [tripCompletionItems, setTripCompletionItems] = useState<
    GroceryListType["items"]
  >([]);
  const [showTripCompleteDialog, setShowTripCompleteDialog] = useState(false);

  function handleItemTripCheck(itemId: string, checked: boolean) {
    if (selectedShop) {
      setItemChecked(groceryList.id, selectedShop, itemId, checked);
    }
    setTripCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  function handleShopChange(shop: string | null) {
    setSelectedShop(shop);
    if (shop) {
      const state = getTripState(groceryList.id, shop);
      setTripCheckedIds(new Set(state?.checkedItemIds ?? []));
    } else {
      setTripCheckedIds(new Set());
    }
  }

  function handleTripCompletionRequested(
    checkedItems: GroceryListType["items"],
  ) {
    setTripCompletionItems(checkedItems);
    setShowTripCompleteDialog(true);
  }

  function handleTripComplete() {
    if (selectedShop) {
      clearTripState(groceryList.id, selectedShop);
    }
    setShowTripCompleteDialog(false);
    setTripCompletionItems([]);
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

      {selectedShop && (
        <TripTracker
          groceryListId={groceryList.id}
          shop={selectedShop}
          items={filteredItems}
          onItemTripCheck={handleItemTripCheck}
          onCompleteTripRequest={handleTripCompletionRequested}
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
                    selectedShop ? tripCheckedIds.has(item.id) : undefined
                  }
                  onTripCheck={selectedShop ? handleItemTripCheck : undefined}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <CompleteShoppingDialog
        open={showTripCompleteDialog}
        onClose={() => setShowTripCompleteDialog(false)}
        groceryListId={groceryList.id}
        checkedItems={tripCompletionItems}
        onComplete={handleTripComplete}
      />
    </div>
  );
}

export { GroceryList };
export type { GroceryListProps };
