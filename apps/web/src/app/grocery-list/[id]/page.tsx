"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { GroceryList as GroceryListType, GroceryItem } from "@/types";
import { getGroceryList } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { GroceryList } from "@/components/grocery/GroceryList";
import { CompleteShoppingDialog } from "@/components/grocery/CompleteShoppingDialog";

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
    } catch {
      setError("Failed to load grocery list. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleChanged = () => {
    void fetchList();
  };

  const checkedItems: GroceryItem[] =
    groceryList?.items.filter((item) => item.is_checked) ?? [];

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

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Grocery List</h1>

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
