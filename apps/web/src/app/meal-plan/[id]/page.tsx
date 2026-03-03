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
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

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

  const toggleRecipeDetail = (slotId: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
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

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Week of {new Date(plan.week_start_date).toLocaleDateString()}
            </h1>
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
                    {slotsByDay[day].map((slot) => {
                      const isExpanded = expandedSlots.has(slot.id);
                      const recipe = slot.recipe;
                      return (
                        <div key={slot.id} className="space-y-2">
                          <MealSlotCard
                            slot={slot}
                            planId={id}
                            onMarkCooked={handleMarkCooked}
                            onMarkSkipped={handleMarkSkipped}
                            onFavoriteToggle={handleFavoriteToggle}
                            isFavorited={
                              recipe ? favoriteRecipeIds.has(recipe.id) : false
                            }
                          />
                          {recipe && (
                            <div>
                              <button
                                onClick={() => toggleRecipeDetail(slot.id)}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {isExpanded ? "Hide Recipe" : "View Recipe"}
                              </button>
                              {isExpanded && (
                                <div className="mt-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
                                  {recipe.description && (
                                    <div className="mb-4">
                                      <h3 className="mb-1 font-semibold text-gray-900">
                                        Description
                                      </h3>
                                      <p className="text-gray-700">
                                        {recipe.description}
                                      </p>
                                    </div>
                                  )}
                                  {recipe.ingredients.length > 0 && (
                                    <div className="mb-4">
                                      <h3 className="mb-2 font-semibold text-gray-900">
                                        Ingredients
                                      </h3>
                                      <ul className="list-inside list-disc space-y-1 text-gray-700">
                                        {recipe.ingredients.map((ing) => (
                                          <li key={ing.id}>
                                            {ing.quantity} {ing.unit} (ID:{" "}
                                            {ing.ingredient_id})
                                            {ing.is_optional && " (optional)"}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {recipe.steps.length > 0 && (
                                    <div>
                                      <h3 className="mb-2 font-semibold text-gray-900">
                                        Steps
                                      </h3>
                                      <ol className="list-inside list-decimal space-y-2 text-gray-700">
                                        {recipe.steps
                                          .sort(
                                            (a, b) =>
                                              a.step_order - b.step_order,
                                          )
                                          .map((step) => (
                                            <li key={step.id}>
                                              {step.instruction}
                                              {step.duration_min && (
                                                <span className="ml-2 text-gray-500">
                                                  ({step.duration_min} min)
                                                </span>
                                              )}
                                            </li>
                                          ))}
                                      </ol>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
