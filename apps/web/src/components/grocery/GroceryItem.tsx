"use client";

import { useState } from "react";

import type { GroceryItem as GroceryItemType } from "@/types";
import { checkGroceryItem } from "@/services/api";

interface GroceryItemProps {
  item: GroceryItemType;
  onChanged?: () => void;
}

function GroceryItem({ item, onChanged }: GroceryItemProps) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    setSaving(true);
    try {
      await checkGroceryItem(item.id, { is_checked: !item.is_checked });
      onChanged?.();
    } catch {
      // silently fail for POC
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={item.is_checked}
        disabled={saving}
        onChange={() => void handleToggle()}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-medium ${
            item.is_checked ? "text-gray-400 line-through" : "text-gray-900"
          }`}
        >
          {item.ingredient_id}
        </p>
      </div>
      <span className="whitespace-nowrap text-sm text-gray-500">
        {item.quantity_needed} {item.unit}
      </span>
    </li>
  );
}

export { GroceryItem };
export type { GroceryItemProps };
