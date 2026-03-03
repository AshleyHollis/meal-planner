"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuickSuggestion, QuickSuggestionsResponse } from "@/types";
import { getQuickSuggestions, ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { QuickSuggestionCard } from "@/components/QuickSuggestionCard";

export default function QuickSuggestionsPage() {
  const [data, setData] = useState<QuickSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setError(null);
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

  const handleCookThis = (suggestion: QuickSuggestion) => {
    setToast(`"${suggestion.title}" added to your plan!`);
    setTimeout(() => setToast(null), 3000);
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

      {toast && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {toast}
        </div>
      )}

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

      {!loading && !error && data && data.suggestions.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            {data.message ?? "No suggestions available right now. Try adding more items to your inventory."}
          </p>
        </div>
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
