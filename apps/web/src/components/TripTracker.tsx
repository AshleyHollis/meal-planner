"use client";

import { useEffect, useState } from "react";

import type { GroceryItem } from "@/types";
import { checkGroceryItem } from "@/services/api";
import {
  getTripProgress,
  getTripState,
  setItemChecked,
  clearTripsForList,
} from "@/services/tripStorage";

interface TripTrackerProps {
  groceryListId: string;
  shop: string;
  items: GroceryItem[];
  onTripComplete?: () => void;
  onItemTripCheck?: (itemId: string, checked: boolean) => void;
}

function TripTracker({
  groceryListId,
  shop,
  items,
  onTripComplete,
  onItemTripCheck,
}: TripTrackerProps) {
  const [progress, setProgress] = useState(() =>
    getTripProgress(groceryListId, shop, items.length),
  );
  const [completing, setCompleting] = useState(false);

  // Sync progress when items or shop changes
  useEffect(() => {
    setProgress(getTripProgress(groceryListId, shop, items.length));
  }, [groceryListId, shop, items.length]);

  function handleItemCheck(itemId: string, checked: boolean) {
    setItemChecked(groceryListId, shop, itemId, checked);
    setProgress(getTripProgress(groceryListId, shop, items.length));
    onItemTripCheck?.(itemId, checked);
  }

  async function handleCompleteTrip() {
    setCompleting(true);
    try {
      const state = getTripState(groceryListId, shop);
      if (state) {
        // Mark all trip-checked items globally
        await Promise.all(
          state.checkedItemIds.map((itemId) =>
            checkGroceryItem(itemId, { is_checked: true }).catch(() => null),
          ),
        );
      }
      clearTripsForList(groceryListId);
      onTripComplete?.();
    } catch {
      // best-effort
    } finally {
      setCompleting(false);
    }
  }

  const { checked, total, percentage } = progress;

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">
          Shopping trip · {shop.charAt(0).toUpperCase() + shop.slice(1)}
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
        onClick={() => void handleCompleteTrip()}
        disabled={completing || checked === 0}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {completing ? "Completing…" : "Complete Trip"}
      </button>
    </div>
  );
}

export { TripTracker };
export type { TripTrackerProps };
