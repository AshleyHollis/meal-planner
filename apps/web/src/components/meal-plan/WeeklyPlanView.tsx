"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  MealPlanDetail,
  MealSlot,
  Equipment,
  EquipmentMode,
} from "@/types";
import { Badge } from "../ui/Badge";
import { FavoriteButton } from "../FavoriteButton";
import {
  getMealImageUrl,
  getMealCategory,
  getCategoryColor,
} from "@/lib/meal-images";

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function buildEquipmentModeLookup(
  equipment: Equipment[],
): Map<string, EquipmentMode> {
  const map = new Map<string, EquipmentMode>();
  for (const eq of equipment) {
    for (const mode of eq.modes) {
      map.set(mode.id, mode);
    }
  }
  return map;
}

function getEquipmentTags(
  slot: MealSlot,
  modeLookup: Map<string, EquipmentMode>,
): EquipmentMode[] {
  if (!slot.recipe) return [];

  const seen = new Set<string>();
  const tags: EquipmentMode[] = [];

  for (const step of slot.recipe.steps) {
    if (step.equipment_mode_id && !seen.has(step.equipment_mode_id)) {
      seen.add(step.equipment_mode_id);
      const mode = modeLookup.get(step.equipment_mode_id);
      if (mode) tags.push(mode);
    }
  }

  return tags;
}

function formatTime(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function MealImage({ title }: { title: string }) {
  const [failed, setFailed] = useState(false);
  const imgUrl = getMealImageUrl(title, 400, 200);
  const cat = getMealCategory(title);
  const grad = getCategoryColor(cat);

  if (failed) {
    return (
      <div
        className={`flex h-24 w-full items-center justify-center bg-gradient-to-br ${grad} lg:h-36`}
      >
        <span className="text-3xl font-bold text-white/80 drop-shadow">
          {title.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-24 w-full lg:h-36">
      <Image
        src={imgUrl}
        alt={title}
        fill
        className="object-cover"
        placeholder="empty"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

interface WeeklyPlanViewProps {
  plan: MealPlanDetail;
  equipment?: Equipment[];
  favoriteRecipeIds?: Set<string>;
  onFavoriteToggle?: (recipeId: string, isFavorited: boolean) => void;
}

function WeeklyPlanView({
  plan,
  equipment = [],
  favoriteRecipeIds = new Set(),
  onFavoriteToggle,
}: WeeklyPlanViewProps) {
  const modeLookup = buildEquipmentModeLookup(equipment);

  // Build a map of day number -> slots (all meal types)
  const slotsByDay = new Map<number, MealSlot[]>();
  for (const slot of plan.slots) {
    const existing = slotsByDay.get(slot.day) ?? [];
    existing.push(slot);
    slotsByDay.set(slot.day, existing);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">
        Week of{" "}
        {new Date(plan.week_start_date).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </h2>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 lg:grid lg:grid-cols-2 lg:divide-y-0 xl:grid-cols-3">
        {DAY_LABELS.map((label, dayIndex) => {
          const daySlots = slotsByDay.get(dayIndex) ?? [];
          // Sort by meal_type order: breakfast, lunch, dinner
          const ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2 };
          const sorted = [...daySlots].sort(
            (a, b) => (ORDER[a.meal_type] ?? 3) - (ORDER[b.meal_type] ?? 3),
          );
          // Use the first slot with a recipe for the thumbnail
          const heroSlot = sorted.find((s) => s.recipe) ?? sorted[0];
          const heroRecipe = heroSlot?.recipe ?? null;

          const MEAL_LABELS: Record<string, string> = {
            breakfast: "🌅 Breakfast",
            lunch: "🍽️ Lunch",
            dinner: "🌙 Dinner",
          };

          return (
            <li
              key={dayIndex}
              className="overflow-hidden px-0 py-0 lg:border-b lg:border-r lg:border-gray-200"
            >
              {/* Thumbnail image for hero slot */}
              {heroRecipe && <MealImage title={heroRecipe.title} />}

              <div className="px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-gray-500">
                  {label}
                </p>

                {sorted.length === 0 && (
                  <p className="text-sm text-gray-400">Nothing planned</p>
                )}

                <div className="space-y-2">
                  {sorted.map((slot) => {
                    const recipe = slot.recipe;
                    const equipmentTags = getEquipmentTags(slot, modeLookup);
                    return (
                      <div key={slot.id}>
                        <p className="text-xs font-medium text-gray-400">
                          {MEAL_LABELS[slot.meal_type] ?? slot.meal_type}
                        </p>
                        {recipe ? (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {recipe.title}
                              </p>
                              <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-600">
                                {recipe.prep_time_min !== null && (
                                  <span>Prep: {formatTime(recipe.prep_time_min)}</span>
                                )}
                                {recipe.cook_time_min !== null && (
                                  <span>Cook: {formatTime(recipe.cook_time_min)}</span>
                                )}
                              </div>
                              {equipmentTags.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {equipmentTags.map((mode) => (
                                    <Badge key={mode.id} variant="info">
                                      {mode.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <FavoriteButton
                              recipeId={recipe.id}
                              isFavorited={favoriteRecipeIds.has(recipe.id)}
                              onToggle={onFavoriteToggle}
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">Not planned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { WeeklyPlanView };
export type { WeeklyPlanViewProps };
