"use client";

import { useState } from "react";

import type { GroceryItem as GroceryItemType, Product } from "@/types";
import { checkGroceryItem } from "@/services/api";
import { ProductMappingForm } from "@/components/ProductMappingForm";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/format-currency";

interface GroceryItemProps {
  item: GroceryItemType;
  onChanged?: () => void;
  tripChecked?: boolean;
  onTripCheck?: (itemId: string, checked: boolean) => void;
}

function GroceryItem({
  item,
  onChanged,
  tripChecked,
  onTripCheck,
}: GroceryItemProps) {
  const [saving, setSaving] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState<NonNullable<
    GroceryItemType["product"]
  > | null>(item.product ?? null);
  const { showToast } = useToast();

  const isChecked = tripChecked !== undefined ? tripChecked : item.is_checked;
  const displayName = item.ingredient_name || item.ingredient_id;

  const handleToggle = async () => {
    if (onTripCheck) {
      onTripCheck(item.id, !isChecked);
      return;
    }

    setSaving(true);
    try {
      await checkGroceryItem(item.id, { is_checked: !item.is_checked });
      if (!item.is_checked) {
        showToast(`✓ ${displayName}`, "success");
      }
      onChanged?.();
    } catch {
      showToast("Failed to update item. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  function handleProductSaved(product: Product) {
    setLinkedProduct(product);
    setShowLinkForm(false);
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100">
      {/* Touch-friendly checkbox wrapper — min 44px tap target */}
      <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={isChecked}
          disabled={saving}
          onChange={() => void handleToggle()}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </label>
      <div className="min-w-0 flex-1 py-2">
        <p
          className={`truncate font-medium ${
            isChecked ? "text-gray-400 line-through" : "text-gray-900"
          }`}
        >
          {displayName}
        </p>

        {linkedProduct ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">
              {linkedProduct.brand} · {linkedProduct.product_name}
            </span>
            {linkedProduct.price != null && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                {formatCurrency(linkedProduct.price)}
              </span>
            )}
            {linkedProduct.shop && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                {linkedProduct.shop}
              </span>
            )}
          </div>
        ) : (
          !showLinkForm && (
            <button
              type="button"
              onClick={() => setShowLinkForm(true)}
              className="mt-0.5 text-xs text-blue-500 hover:text-blue-700"
            >
              + Link Product
            </button>
          )
        )}

        {showLinkForm && (
          <div className="mt-2">
            <ProductMappingForm
              ingredientId={item.ingredient_id}
              ingredientName={item.ingredient_name}
              onSaved={handleProductSaved}
              onCancel={() => setShowLinkForm(false)}
            />
          </div>
        )}
      </div>
      <span className="whitespace-nowrap py-2 text-sm text-gray-500">
        {item.quantity_needed} {item.unit}
      </span>
    </li>
  );
}

export { GroceryItem };
export type { GroceryItemProps };
