"use client";

import { useState } from "react";

import type { Product } from "@/types";
import {
  createProduct,
  updateProduct,
  type CreateProductBody,
  type UpdateProductBody,
} from "@/services/api";

interface ProductMappingFormProps {
  ingredientId?: string;
  ingredientName?: string;
  existingProduct?: Product | null;
  onSaved?: (product: Product) => void;
  onCancel?: () => void;
}

function ProductMappingForm({
  ingredientId,
  ingredientName,
  existingProduct,
  onSaved,
  onCancel,
}: ProductMappingFormProps) {
  const [brand, setBrand] = useState(existingProduct?.brand ?? "");
  const [productName, setProductName] = useState(
    existingProduct?.product_name ?? "",
  );
  const [sizeDesc, setSizeDesc] = useState(existingProduct?.size_desc ?? "");
  const [price, setPrice] = useState(
    existingProduct?.price != null ? String(existingProduct.price) : "",
  );
  const [shop, setShop] = useState(existingProduct?.shop ?? "");
  const [notes, setNotes] = useState(existingProduct?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!brand.trim()) newErrors.brand = "Brand is required";
    if (!productName.trim()) newErrors.productName = "Product name is required";
    if (price && isNaN(Number(price)))
      newErrors.price = "Price must be a number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      let saved: Product;
      if (existingProduct) {
        const body: UpdateProductBody = {
          brand: brand.trim() || null,
          product_name: productName.trim() || null,
          size_desc: sizeDesc.trim() || null,
          price: price ? Number(price) : null,
          shop: shop.trim() || null,
          notes: notes.trim() || null,
        };
        saved = await updateProduct(existingProduct.id, body);
      } else {
        const body: CreateProductBody = {
          ingredient_id: ingredientId ?? "",
          brand: brand.trim(),
          product_name: productName.trim(),
          size_desc: sizeDesc.trim() || null,
          price: price ? Number(price) : null,
          shop: shop.trim() || null,
          notes: notes.trim() || null,
        };
        saved = await createProduct(body);
      }
      onSaved?.(saved);
    } catch {
      setErrors({ form: "Failed to save product. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h3 className="text-sm font-semibold text-gray-900">
        {existingProduct ? "Edit Product" : "Link Product"}
        {ingredientName && (
          <span className="ml-1 font-normal text-gray-500">
            — {ingredientName}
          </span>
        )}
      </h3>

      {errors.form && (
        <p className="text-xs text-red-600">{errors.form}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Brand <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. Heinz"
          />
          {errors.brand && (
            <p className="mt-0.5 text-xs text-red-600">{errors.brand}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. Tomato Sauce 500g"
          />
          {errors.productName && (
            <p className="mt-0.5 text-xs text-red-600">{errors.productName}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Size
          </label>
          <input
            type="text"
            value={sizeDesc}
            onChange={(e) => setSizeDesc(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. 500g"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Price
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="0.00"
          />
          {errors.price && (
            <p className="mt-0.5 text-xs text-red-600">{errors.price}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Shop
          </label>
          <input
            type="text"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. Woolworths"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Optional notes"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : existingProduct ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
}

export { ProductMappingForm };
export type { ProductMappingFormProps };
