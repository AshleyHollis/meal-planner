"use client";

import { useCallback, useEffect, useState } from "react";

import type { InventoryItem } from "@/types";
import { listInventory, ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { AddItemForm } from "@/components/inventory/AddItemForm";
import { InventoryList } from "@/components/inventory/InventoryList";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listInventory();
      setItems(data);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to load inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleChanged = () => {
    void fetchItems();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Inventory</h1>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <section className="mb-8 rounded-lg border border-gray-200 bg-white p-4 lg:mb-0">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Item</h2>
          <AddItemForm onSuccess={handleChanged} />
        </section>

        <div>
          {loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <button
                onClick={() => void fetchItems()}
                className="mt-2 rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <InventoryList items={items} onChanged={handleChanged} />
          )}
        </div>
      </div>
    </main>
  );
}
