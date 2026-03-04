"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { Product } from "@/types";
import {
  getProducts,
  searchProducts,
  deleteProduct,
  ApiError,
} from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { ProductMappingForm } from "@/components/ProductMappingForm";
import { useToast } from "@/components/ui/Toast";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchProducts(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayedProducts = searchResults ?? products;

  // Group by ingredient category (using ingredient_name as fallback grouping)
  const grouped = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const product of displayedProducts) {
      const category = product.ingredient_name ?? "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(product);
    }
    return groups;
  }, [displayedProducts]);

  const categoryNames = Object.keys(grouped).sort();

  async function handleDelete(productId: string) {
    try {
      await deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setConfirmDelete(null);
    } catch {
      showToast("Failed to delete product. Please try again.", "error");
    }
  }

  function handleSaved(product: Product) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
    setShowAddForm(false);
    setEditingProduct(null);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Product Library</h1>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {searchLoading && (
          <p className="mt-1 text-xs text-gray-500">Searching…</p>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-6">
          <ProductMappingForm
            onSaved={handleSaved}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            onClick={() => void fetchProducts()}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        displayedProducts.length === 0 &&
        searchQuery === "" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <div className="mb-4 text-6xl">🏷️</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              No Products Yet
            </h3>
            <p className="text-sm text-gray-600">
              Map ingredients to specific store products
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        displayedProducts.length === 0 &&
        searchQuery !== "" && (
          <p className="py-8 text-center text-sm text-gray-500">
            No products found for &quot;{searchQuery}&quot;
          </p>
        )}

      {/* Grouped product list */}
      {!loading && !error && categoryNames.length > 0 && (
        <div className="space-y-8">
          {categoryNames.map((category) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {grouped[category].map((product) => (
                  <div
                    key={product.id}
                    className="relative rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    {editingProduct?.id === product.id ? (
                      <ProductMappingForm
                        ingredientId={product.ingredient_id}
                        ingredientName={product.ingredient_name}
                        existingProduct={product}
                        onSaved={handleSaved}
                        onCancel={() => setEditingProduct(null)}
                      />
                    ) : (
                       <>
                        {/* Clickable area — navigates to detail page */}
                        <Link
                          href={`/products/${product.id}`}
                          className="absolute inset-0 rounded-xl"
                          aria-label={`View ${product.product_name} details`}
                        />
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-gray-500">
                              {product.ingredient_name}
                            </p>
                            <p className="font-medium text-gray-900">
                              {product.brand} · {product.product_name}
                            </p>
                          </div>
                          <div className="relative z-10 flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(product);
                              }}
                              className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            >
                              Edit
                            </button>
                            {confirmDelete === product.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDelete(product.id);
                                  }}
                                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDelete(null);
                                  }}
                                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDelete(product.id);
                                }}
                                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {product.size_desc && (
                            <span className="text-xs text-gray-500">
                              {product.size_desc}
                            </span>
                          )}
                          {product.price != null && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              {new Intl.NumberFormat("en-AU", {
                                style: "currency",
                                currency: "AUD",
                              }).format(product.price)}
                            </span>
                          )}
                          {product.shop && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                              {product.shop}
                            </span>
                          )}
                        </div>
                        {product.notes && (
                          <p className="mt-1 text-xs text-gray-400">
                            {product.notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
