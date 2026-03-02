"use client";

import { useState } from "react";

import type { InventoryItem, StorageLocation } from "@/types";
import { removeInventoryItem, updateInventoryItem } from "@/services/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ExpiryBadge } from "./ExpiryBadge";

const LOCATION_LABELS: Record<StorageLocation, string> = {
  fridge: "Fridge",
  pantry: "Pantry",
};

const LOCATION_ORDER: StorageLocation[] = ["fridge", "pantry"];

function sortByExpiry(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
    // Items with expiry dates come first, sorted ascending (soonest first)
    if (a.expiry_date && b.expiry_date) {
      return (
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      );
    }
    if (a.expiry_date && !b.expiry_date) return -1;
    if (!a.expiry_date && b.expiry_date) return 1;
    // No expiry: sort by name
    return a.ingredient.name.localeCompare(b.ingredient.name);
  });
}

function groupByLocation(
  items: InventoryItem[],
): Record<StorageLocation, InventoryItem[]> {
  const groups: Record<StorageLocation, InventoryItem[]> = {
    fridge: [],
    pantry: [],
  };

  for (const item of items) {
    const loc = item.location as StorageLocation;
    if (loc in groups) {
      groups[loc].push(item);
    } else {
      // Fallback: put unknown locations in pantry
      groups.pantry.push(item);
    }
  }

  // Sort each group by expiry
  for (const loc of LOCATION_ORDER) {
    groups[loc] = sortByExpiry(groups[loc]);
  }

  return groups;
}

interface InventoryListProps {
  items: InventoryItem[];
  onChanged?: () => void;
}

function InventoryList({ items, onChanged }: InventoryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  const grouped = groupByLocation(items);

  const handleEditStart = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditQuantity(String(item.quantity));
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditQuantity("");
  };

  const handleEditSave = async (itemId: string) => {
    const qty = parseFloat(editQuantity);
    if (Number.isNaN(qty) || qty <= 0) return;

    setSaving(true);
    try {
      await updateInventoryItem(itemId, { quantity: qty });
      setEditingId(null);
      setEditQuantity("");
      onChanged?.();
    } catch {
      // silently fail for POC
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    setSaving(true);
    try {
      await removeInventoryItem(itemId);
      onChanged?.();
    } catch {
      // silently fail for POC
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        No items in inventory. Add some above!
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {LOCATION_ORDER.map((location) => {
        const locationItems = grouped[location];
        if (locationItems.length === 0) return null;

        return (
          <section key={location}>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {LOCATION_LABELS[location]}
            </h3>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {locationItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  {/* Left: name + expiry */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {item.ingredient.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="!min-h-[32px] w-20 !py-1 text-sm"
                          />
                          <span className="text-sm text-gray-500">
                            {item.unit}
                          </span>
                          <Button
                            size="sm"
                            variant="primary"
                            loading={saving}
                            onClick={() => void handleEditSave(item.id)}
                            className="!min-h-[32px] !px-2 !py-1 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditCancel}
                            className="!min-h-[32px] !px-2 !py-1 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {item.quantity} {item.unit}
                        </span>
                      )}
                      <ExpiryBadge expiryDate={item.expiry_date} />
                    </div>
                  </div>

                  {/* Right: actions */}
                  {editingId !== item.id && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStart(item)}
                        className="!min-h-[36px] !px-2 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={saving}
                        onClick={() => void handleRemove(item.id)}
                        className="!min-h-[36px] !px-2 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export { InventoryList };
export type { InventoryListProps };
