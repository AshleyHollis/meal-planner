"use client";

import { useState, useEffect } from "react";
import { MealHistoryList } from "@/components/MealHistoryList";
import { getMealHistory } from "@/services/api";
import type { MealHistoryItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

export default function HistoryPage() {
  const [items, setItems] = useState<MealHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setInitialLoading(true);
        const data = await getMealHistory(1, PAGE_SIZE);
        setItems(data);
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
      } catch (err) {
        setError("Failed to load meal history");
        console.error("Failed to load meal history:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    void loadInitial();
  }, []);

  const handleLoadMore = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const data = await getMealHistory(nextPage, PAGE_SIZE);
      setItems((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load more history:", err);
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
          {error}
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
