"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";

import { useMealPlanPolling } from "@/hooks/useMealPlanPolling";
import { MealSlotCard } from "@/components/meal-plan/MealSlotCard";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import {
  updateSlotStatus,
  listFavorites,
  addFavorite,
  removeFavorite,
} from "@/services/api";
import type { MealSlot } from "@/types";

interface MealPlanDetailPageProps {
  params: Promise<{ id: string }>;
}

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function MealPlanDetailPage({
  params,
}: MealPlanDetailPageProps) {
  const { id } = use(params);
  const { plan, loading, error, refetch } = useMealPlanPolling({
    planId: id,
    enabled: true,
  });

  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    listFavorites()
      .then((favorites) =>
        setFavoriteRecipeIds(new Set(favorites.map((f) => f.recipe_id))),
      )
      .catch((err) => console.error("Failed to load favorites:", err));
  }, []);

  const isDraft = plan?.status === "draft";

  const handleMarkCooked = async (slotId: string) => {
    try {
      await updateSlotStatus(id, slotId, { status: "cooked" });
      refetch();
    } catch (err) {
      console.error("Failed to mark as cooked:", err);
    }
  };

  const handleMarkSkipped = async (slotId: string) => {
    try {
      await updateSlotStatus(id, slotId, { status: "skipped" });
      refetch();
    } catch (err) {
      console.error("Failed to mark as skipped:", err);
    }
  };

  const handleFavoriteToggle = async (
    recipeId: string,
    isFavorited: boolean,
  ) => {
    try {
      if (isFavorited) {
        await removeFavorite(recipeId);
        setFavoriteRecipeIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      } else {
        await addFavorite(recipeId);
        setFavoriteRecipeIds((prev) => new Set(prev).add(recipeId));
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // Group slots by day
  const slotsByDay: Record<number, MealSlot[]> = {};
  if (plan) {
    plan.slots.forEach((slot) => {
      if (!slotsByDay[slot.day]) {
        slotsByDay[slot.day] = [];
      }
      slotsByDay[slot.day].push(slot);
    });
  }

  // Progress calculation
  const totalSlots = plan?.slots.length ?? 0;
  const cookedSlots =
    plan?.slots.filter((s) => s.status === "cooked").length ?? 0;
  const progressPct = totalSlots > 0 ? (cookedSlots / totalSlots) * 100 : 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <div className="mb-6">
        <Link
          href="/meal-plan"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to plans
        </Link>
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

      {plan && isDraft && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Spinner size="lg" />
          <p className="text-gray-600">Generating your meal plan...</p>
          <Badge variant="warning">Draft</Badge>
        </div>
      )}

      {plan && !isDraft && (
        <>
          {plan.error_message && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {plan.error_message}
            </div>
          )}

          {/* Header + progress */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Week of {new Date(plan.week_start_date).toLocaleDateString()}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-sm font-medium text-gray-600">
                {cookedSlots} of {totalSlots} cooked
              </span>
            </div>
          </div>

          <div className="space-y-8">
            {Object.keys(slotsByDay)
              .map(Number)
              .sort((a, b) => a - b)
              .map((day) => (
                <div key={day}>
                  <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    {DAY_LABELS[day]}
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {slotsByDay[day].map((slot) => (
                      <MealSlotCard
                        key={slot.id}
                        slot={slot}
                        planId={id}
                        onMarkCooked={handleMarkCooked}
                        onMarkSkipped={handleMarkSkipped}
                        onFavoriteToggle={handleFavoriteToggle}
                        isFavorited={
                          slot.recipe
                            ? favoriteRecipeIds.has(slot.recipe.id)
                            : false
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
