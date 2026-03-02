"use client";

import { useState } from "react";
import type { GroceryItem } from "@/types";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { completeShopping } from "@/services/api";

interface ExpiryEntry {
  ingredient_id: string;
  quantity: number;
  expiry_date: string;
}

interface CompleteShoppingDialogProps {
  open: boolean;
  onClose: () => void;
  groceryListId: string;
  checkedItems: GroceryItem[];
  onComplete?: () => void;
}

function CompleteShoppingDialog({
  open,
  onClose,
  groceryListId,
  checkedItems,
  onComplete,
}: CompleteShoppingDialogProps) {
  const [entries, setEntries] = useState<ExpiryEntry[]>(() =>
    checkedItems.map((item) => ({
      ingredient_id: item.ingredient_id,
      quantity: item.quantity_needed,
      expiry_date: "",
    })),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateExpiry = (index: number, expiry_date: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, expiry_date } : entry)),
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await completeShopping(groceryListId, {
        purchased_items: entries.map((entry) => ({
          ingredient_id: entry.ingredient_id,
          quantity: entry.quantity,
        })),
      });

      onComplete?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete shopping",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Complete Shopping">
      <p className="mb-3 text-sm text-gray-600">
        Set expiry dates for purchased items (optional):
      </p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
        {checkedItems.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
              {item.ingredient_id} ({item.quantity_needed} {item.unit})
            </span>
            <input
              type="date"
              value={entries[index]?.expiry_date ?? ""}
              onChange={(e) => updateExpiry(index, e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={loading}
          disabled={checkedItems.length === 0}
        >
          Add to Inventory
        </Button>
      </div>
    </Dialog>
  );
}

export { CompleteShoppingDialog };
export type { CompleteShoppingDialogProps };
