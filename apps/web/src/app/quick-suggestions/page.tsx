"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuickSuggestion, QuickSuggestionsResponse } from "@/types";
import { getQuickSuggestions, cookSuggestion, ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { QuickSuggestionCard } from "@/components/QuickSuggestionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function QuickSuggestionsPage() {
  const [data, setData] = useState<QuickSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    document.title = "Quick Suggestions | Meal Planner";
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await getQuickSuggestions();
      setData(res);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to load suggestions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const handleCookThis = async (suggestion: QuickSuggestion) => {
    try {
      await cookSuggestion({
        title: suggestion.title,
        ingredients: suggestion.ingredients,
      });
      showToast(`"${suggestion.title}" cooked! Inventory updated.`, "success");
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      showToast(`Failed to mark "${suggestion.title}" as cooked.`, "error");
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          What Can I Make Right Now?
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Recipes you can cook with what&apos;s already in your pantry.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            onClick={() => void fetchSuggestions()}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && data && data.suggestions.length === 0 && (
        <EmptyState
          icon="⚡"
          title="No Suggestions Right Now"
          description={
            data.message ??
            "Add more items to your inventory to unlock quick suggestions."
          }
          actionLabel="Go to Inventory"
          actionHref="/inventory"
        />
      )}

      {!loading && !error && data && data.suggestions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.suggestions.map((suggestion, i) => (
            <QuickSuggestionCard
              key={i}
              suggestion={suggestion}
              onCookThis={handleCookThis}
            />
          ))}
        </div>
      )}
    </main>
  );
}
