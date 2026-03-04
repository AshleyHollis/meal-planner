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

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "🍽️ Lunch",
  dinner: "🌙 Dinner",
};

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
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Week of {new Date(plan.week_start_date).toLocaleDateString()}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {totalSlots} meals planned
                </p>
              </div>
              <Badge
                variant={
                  plan.status as "active" | "completed" | "failed" | "draft"
                }
              >
                {plan.status}
              </Badge>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                {cookedSlots} / {totalSlots}
              </span>
            </div>
          </div>

          <div className="space-y-8">
            {DAY_LABELS.map((label, day) => {
              const daySlots = slotsByDay[day] ?? [];

              // Calculate total prep + cook time for the day
              const totalMinutes = daySlots.reduce((sum, slot) => {
                const prep = slot.recipe?.prep_time_min ?? 0;
                const cook = slot.recipe?.cook_time_min ?? 0;
                return sum + prep + cook;
              }, 0);

              return (
                <div key={day}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {label}
                    </h2>
                    {totalMinutes > 0 && (
                      <span className="text-xs text-gray-500">
                        {totalMinutes} min total
                      </span>
                    )}
                  </div>
                  {daySlots.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-400">Nothing planned</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {daySlots.map((slot) => (
                        <div key={slot.id}>
                          <div className="mb-2 text-xs font-medium text-gray-500">
                            {MEAL_TYPE_LABELS[slot.meal_type] || slot.meal_type}
                          </div>
                          <MealSlotCard
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
