"use client";

import { useState } from "react";

import type { GroceryItem as GroceryItemType, Product } from "@/types";
import { checkGroceryItem } from "@/services/api";
import { ProductMappingForm } from "@/components/ProductMappingForm";

interface GroceryItemProps {
  item: GroceryItemType;
  onChanged?: () => void;
  tripChecked?: boolean;
}

function GroceryItem({ item, onChanged, tripChecked }: GroceryItemProps) {
  const [saving, setSaving] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState<NonNullable<
    GroceryItemType["product"]
  > | null>(item.product ?? null);

  const isChecked = tripChecked !== undefined ? tripChecked : item.is_checked;
  const displayName = item.ingredient_name ?? item.ingredient_id;

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

  function handleProductSaved(product: Product) {
    setLinkedProduct(product);
    setShowLinkForm(false);
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={isChecked}
        disabled={saving}
        onChange={() => void handleToggle()}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="min-w-0 flex-1">
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
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: "AUD",
                }).format(linkedProduct.price)}
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
      <span className="whitespace-nowrap text-sm text-gray-500">
        {item.quantity_needed} {item.unit}
      </span>
    </li>
  );
}

export { GroceryItem };
export type { GroceryItemProps };
