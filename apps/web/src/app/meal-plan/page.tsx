"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { MealPlan } from "@/types";
import {
  listMealPlans,
  createMealPlan,
  updatePlanStatus,
  deleteMealPlan,
  ApiError,
} from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CuisineSelector } from "@/components/CuisineSelector";
import { MealTypeSelector } from "@/components/MealTypeSelector";

type StatusFilter = "all" | "active" | "completed" | "failed" | "draft";

const STATUS_COLORS: Record<string, string> = {
  active: "border-l-4 border-green-500",
  completed: "border-l-4 border-blue-500",
  failed: "border-l-4 border-red-500",
  draft: "border-l-4 border-gray-400",
};

function getNextMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default function MealPlanListPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [mealTypes, setMealTypes] = useState<string[]>([
    "breakfast",
    "lunch",
    "dinner",
  ]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
      const data = await listMealPlans();
      setPlans(
        data.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to load meal plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);

      const existing = plans.find(
        (p) => p.status === "active" || p.status === "draft",
      );
      if (existing) {
        await updatePlanStatus(existing.id, { status: "completed" });
      }

      const plan = await createMealPlan({
        week_start_date: getNextMonday(),
        cuisine_preferences:
          cuisinePreferences.length > 0 ? cuisinePreferences : undefined,
        meal_types: mealTypes.length > 0 ? mealTypes : undefined,
      });
      router.push(`/meal-plan/${plan.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      const message =
        (err && typeof err === "object" && "body" in err
          ? (err.body as { detail?: string })?.detail
          : null) ?? "Failed to generate meal plan.";
      setError(message);
      setGenerating(false);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      setDeletingId(planId);
      await deleteMealPlan(planId);
      await fetchPlans();
      setConfirmDelete(null);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to delete meal plan.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPlans =
    statusFilter === "all"
      ? plans
      : plans.filter((p) => p.status === statusFilter);

  const displayedPlans = showAll ? filteredPlans : filteredPlans.slice(0, 10);

  const statusCounts = {
    all: plans.length,
    active: plans.filter((p) => p.status === "active").length,
    completed: plans.filter((p) => p.status === "completed").length,
    failed: plans.filter((p) => p.status === "failed").length,
    draft: plans.filter((p) => p.status === "draft").length,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Generate New Plan
        </h2>
        <CuisineSelector
          selected={cuisinePreferences}
          onChange={setCuisinePreferences}
        />
        <div className="mt-4">
          <MealTypeSelector selected={mealTypes} onChange={setMealTypes} />
        </div>
        <div className="mt-4">
          <Button
            onClick={() => void handleGenerate()}
            loading={generating}
            disabled={generating}
          >
            Generate New Plan
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && plans.length === 0 && (
        <EmptyState
          icon="📋"
          title="No Plans Yet"
          description="Generate your first meal plan to get started"
        />
      )}

      {!loading && !error && plans.length > 0 && (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {(
              [
                "all",
                "active",
                "completed",
                "failed",
                "draft",
              ] as StatusFilter[]
            ).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} (
                {statusCounts[status]})
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {displayedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${STATUS_COLORS[plan.status] || ""}`}
              >
                <Link href={`/meal-plan/${plan.id}`} className="block p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-gray-900">
                        Week of{" "}
                        {new Date(plan.week_start_date).toLocaleDateString(
                          undefined,
                          { month: "long", day: "numeric", year: "numeric" },
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Created {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        plan.status as
                          | "active"
                          | "completed"
                          | "failed"
                          | "draft"
                      }
                    >
                      {plan.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Plan for the week</p>
                </Link>
                {plan.status === "failed" && (
                  <div className="border-t border-gray-100 px-6 py-3">
                    {confirmDelete === plan.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Delete this plan?
                        </span>
                        <button
                          onClick={() => void handleDelete(plan.id)}
                          disabled={deletingId === plan.id}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === plan.id ? "Deleting..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(plan.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete Plan
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredPlans.length > 10 && !showAll && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAll(true)}
                className="rounded-lg bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Show More ({filteredPlans.length - 10} more)
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
