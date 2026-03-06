"use client";

import type { GroceryItem } from "@/types";
import { getShopDisplayName } from "@/lib/shop-utils";
import {
  getTripProgress,
  getTripState,
  setItemChecked,
} from "@/services/tripStorage";

interface TripTrackerProps {
  groceryListId: string;
  shop: string;
  items: GroceryItem[];
  onItemTripCheck?: (itemId: string, checked: boolean) => void;
  onCompleteTripRequest?: (checkedItems: GroceryItem[]) => void;
}

function TripTracker({
  groceryListId,
  shop,
  items,
  onItemTripCheck,
  onCompleteTripRequest,
}: TripTrackerProps) {
  const progress = getTripProgress(groceryListId, shop, items.length);

  function handleItemCheck(itemId: string, checked: boolean) {
    if (!onItemTripCheck) {
      setItemChecked(groceryListId, shop, itemId, checked);
    }
    onItemTripCheck?.(itemId, checked);
  }

  function handleCompleteTrip() {
    const state = getTripState(groceryListId, shop);
    const checkedItems = items.filter((item) =>
      state?.checkedItemIds.includes(item.id),
    );

    if (checkedItems.length === 0) {
      return;
    }

    onCompleteTripRequest?.(checkedItems);
  }

  const { checked, total, percentage } = progress;

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">
          Shopping trip · {getShopDisplayName(shop)}
        </span>
        <span className="text-xs text-blue-600">
          {checked}/{total} items
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-blue-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Item checklist */}
      <ul className="mb-3 space-y-1">
        {items.map((item) => {
          const state = getTripState(groceryListId, shop);
          const isChecked = state?.checkedItemIds.includes(item.id) ?? false;
          return (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleItemCheck(item.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span
                className={`text-sm ${isChecked ? "text-blue-400 line-through" : "text-blue-900"}`}
              >
                {item.ingredient_name ?? item.ingredient_id}
              </span>
              <span className="text-xs text-blue-500">
                {item.quantity_needed} {item.unit}
              </span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleCompleteTrip}
        disabled={checked === 0}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Complete Trip
      </button>
    </div>
  );
}

export { TripTracker };
export type { TripTrackerProps };
