"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { GroceryList as GroceryListType, GroceryItem } from "@/types";
import { getGroceryList, ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { GroceryList } from "@/components/grocery/GroceryList";
import { CompleteShoppingDialog } from "@/components/grocery/CompleteShoppingDialog";
import { clearTripsForList, isNewList } from "@/services/tripStorage";
import { formatCurrency } from "@/lib/format-currency";

interface GroceryListPageProps {
  params: Promise<{ id: string }>;
}

export default function GroceryListPage({ params }: GroceryListPageProps) {
  const { id } = use(params);
  const [groceryList, setGroceryList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setError(null);
      const data = await getGroceryList(id);
      setGroceryList(data);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to load grocery list. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = "Grocery List | Meal Planner";
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // Clear stale trip state when grocery list ID changes (new meal plan)
  useEffect(() => {
    if (id && isNewList(id)) {
      clearTripsForList(id);
    }
  }, [id]);

  const handleChanged = () => {
    void fetchList();
  };

  const checkedItems: GroceryItem[] =
    groceryList?.items.filter((item) => item.is_checked) ?? [];

  const estimatedCost = useMemo(() => {
    if (!groceryList) return 0;
    return groceryList.items
      .filter((i) => i.product?.price != null)
      .reduce((sum, i) => sum + i.product!.price!, 0);
  }, [groceryList]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/meal-plan/${groceryList?.meal_plan_id ?? id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to meal plan
        </Link>

        {checkedItems.length > 0 && (
          <button
            onClick={() => setShowComplete(true)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Complete Shopping ({checkedItems.length})
          </button>
        )}
      </div>

      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Grocery List</h1>
        {estimatedCost > 0 && (
          <span className="text-lg font-semibold text-green-700">
            Est. {formatCurrency(estimatedCost)}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && groceryList && (
        <GroceryList groceryList={groceryList} onChanged={handleChanged} />
      )}

      {groceryList && (
        <CompleteShoppingDialog
          open={showComplete}
          onClose={() => setShowComplete(false)}
          groceryListId={groceryList.id}
          checkedItems={checkedItems}
          onComplete={handleChanged}
        />
      )}
    </main>
  );
}
