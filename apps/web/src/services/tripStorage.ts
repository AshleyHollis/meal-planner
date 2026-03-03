import type { TripState } from "@/types";

const TRIP_KEY_PREFIX = "shopping-trip-";

function normalizeShop(shop: string): string {
  return shop.toLowerCase().trim().replace(/\s+/g, "-");
}

function getTripKey(groceryListId: string, shop: string): string {
  return `${TRIP_KEY_PREFIX}${groceryListId}-${normalizeShop(shop)}`;
}

export function getTripState(
  groceryListId: string,
  shop: string,
): TripState | null {
  if (typeof window === "undefined") return null;
  const key = getTripKey(groceryListId, shop);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TripState;
  } catch {
    return null;
  }
}

export function setItemChecked(
  groceryListId: string,
  shop: string,
  itemId: string,
  checked: boolean,
): TripState {
  const key = getTripKey(groceryListId, shop);
  let state = getTripState(groceryListId, shop);
  if (!state) {
    state = {
      groceryListId,
      shop,
      checkedItemIds: [],
      startedAt: new Date().toISOString(),
    };
  }
  if (checked && !state.checkedItemIds.includes(itemId)) {
    state.checkedItemIds = [...state.checkedItemIds, itemId];
  } else if (!checked) {
    state.checkedItemIds = state.checkedItemIds.filter((id) => id !== itemId);
  }
  localStorage.setItem(key, JSON.stringify(state));
  return state;
}

export function getTripProgress(
  groceryListId: string,
  shop: string,
  totalItems: number,
): { checked: number; total: number; percentage: number } {
  const state = getTripState(groceryListId, shop);
  const checked = state?.checkedItemIds.length ?? 0;
  return {
    checked,
    total: totalItems,
    percentage:
      totalItems > 0 ? Math.round((checked / totalItems) * 100) : 0,
  };
}

export function clearTripsForList(groceryListId: string): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${TRIP_KEY_PREFIX}${groceryListId}-`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function isNewList(groceryListId: string): boolean {
  if (typeof window === "undefined") return true;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${TRIP_KEY_PREFIX}${groceryListId}-`)) return false;
  }
  return true;
}
