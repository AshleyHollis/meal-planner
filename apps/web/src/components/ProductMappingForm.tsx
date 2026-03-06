"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Ingredient, Product } from "@/types";
import {
  createProduct,
  searchIngredients,
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
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ingredientLocked = Boolean(existingProduct || ingredientId);

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
  const [ingredientQuery, setIngredientQuery] = useState(
    existingProduct?.ingredient_name ?? ingredientName ?? "",
  );
  const [selectedIngredientId, setSelectedIngredientId] = useState<
    string | null
  >(existingProduct?.ingredient_id ?? ingredientId ?? null);
  const [ingredientSuggestions, setIngredientSuggestions] = useState<
    Ingredient[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resolvedIngredientId =
    existingProduct?.ingredient_id ??
    ingredientId ??
    selectedIngredientId ??
    "";
  const resolvedIngredientName =
    existingProduct?.ingredient_name ?? ingredientName ?? ingredientQuery;

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setIngredientSuggestions([]);
      return;
    }

    try {
      const results = await searchIngredients(query, 10);
      setIngredientSuggestions(results);
    } catch {
      setIngredientSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (ingredientLocked || !showSuggestions) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(ingredientQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchSuggestions, ingredientLocked, ingredientQuery, showSuggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!existingProduct && !resolvedIngredientId) {
      newErrors.ingredient = "Select an ingredient before saving";
    }
    if (!brand.trim()) newErrors.brand = "Brand is required";
    if (!productName.trim()) newErrors.productName = "Product name is required";
    if (price && isNaN(Number(price))) {
      newErrors.price = "Price must be a number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function clearIngredientError() {
    if (!errors.ingredient) {
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.ingredient;
      return next;
    });
  }

  function handleIngredientChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIngredientQuery(e.target.value);
    setSelectedIngredientId(null);
    setShowSuggestions(true);
    clearIngredientError();
  }

  function handleIngredientSelect(ingredient: Ingredient) {
    setSelectedIngredientId(ingredient.id);
    setIngredientQuery(ingredient.name);
    setIngredientSuggestions([]);
    setShowSuggestions(false);
    clearIngredientError();
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
          ingredient_id: resolvedIngredientId,
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
        {resolvedIngredientName && (
          <span className="ml-1 font-normal text-gray-500">
            — {resolvedIngredientName}
          </span>
        )}
      </h3>

      {errors.form && <p className="text-xs text-red-600">{errors.form}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label
            htmlFor="product-ingredient"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Ingredient <span className="text-red-500">*</span>
          </label>
          {ingredientLocked ? (
            <input
              id="product-ingredient"
              type="text"
              readOnly
              value={resolvedIngredientName}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
            />
          ) : (
            <div ref={autocompleteRef} className="relative">
              <input
                id="product-ingredient"
                type="text"
                value={ingredientQuery}
                onChange={handleIngredientChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search ingredients..."
                autoComplete="off"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              {showSuggestions && ingredientSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {ingredientSuggestions.map((ingredient) => (
                    <li key={ingredient.id}>
                      <button
                        type="button"
                        onClick={() => handleIngredientSelect(ingredient)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        <span className="font-medium text-gray-900">
                          {ingredient.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {ingredient.category}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {errors.ingredient && (
            <p className="mt-0.5 text-xs text-red-600">{errors.ingredient}</p>
          )}
          {!ingredientLocked &&
            showSuggestions &&
            ingredientQuery.trim().length >= 2 &&
            ingredientSuggestions.length === 0 && (
              <p className="mt-0.5 text-xs text-gray-500">
                No matching ingredients found yet.
              </p>
            )}
        </div>

        <div>
          <label
            htmlFor="product-brand"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Brand <span className="text-red-500">*</span>
          </label>
          <input
            id="product-brand"
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
          <label
            htmlFor="product-name"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            id="product-name"
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
          <label
            htmlFor="product-size"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Size
          </label>
          <input
            id="product-size"
            type="text"
            value={sizeDesc}
            onChange={(e) => setSizeDesc(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. 500g"
          />
        </div>

        <div>
          <label
            htmlFor="product-price"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Price
          </label>
          <input
            id="product-price"
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
          <label
            htmlFor="product-shop"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Shop
          </label>
          <input
            id="product-shop"
            type="text"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. Woolworths"
          />
        </div>

        <div>
          <label
            htmlFor="product-notes"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Notes
          </label>
          <input
            id="product-notes"
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
