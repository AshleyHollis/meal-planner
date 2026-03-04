"use client";

import { useCallback, useState, useEffect } from "react";
import { MealHistoryList } from "@/components/MealHistoryList";
import { getMealHistory } from "@/services/api";
import type { MealHistoryItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function HistoryPage() {
  const [items, setItems] = useState<MealHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const PAGE_SIZE = 20;

  useEffect(() => {
    document.title = "Cooking History | Meal Planner";
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const data = await getMealHistory(1, PAGE_SIZE);
      setItems(data);
      setPage(1);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setError("Failed to load meal history");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const handleLoadMore = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const data = await getMealHistory(nextPage, PAGE_SIZE);
      setItems((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      showToast("Failed to load more history. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Meal History</h1>

      {initialLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            onClick={() => void loadInitial()}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
          >
            Try Again
          </button>
        </div>
      )}

      {!initialLoading && !error && (
        <MealHistoryList
          items={items}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          loading={loading}
        />
      )}
    </main>
  );
}
