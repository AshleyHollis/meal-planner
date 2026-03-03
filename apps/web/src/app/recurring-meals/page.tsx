"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecurringMealTemplate } from "@/types";
import { listRecurringMeals, ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { RecurringMealManager } from "@/components/RecurringMealManager";

export default function RecurringMealsPage() {
  const [templates, setTemplates] = useState<RecurringMealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const data = await listRecurringMeals();
      setTemplates(data);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError(
        "Failed to load recurring meals. The service may be temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recurring Meals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up meals that repeat every week on a fixed schedule.
        </p>
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

      {!loading && !error && (
        <RecurringMealManager initialTemplates={templates} />
      )}
    </main>
  );
}
