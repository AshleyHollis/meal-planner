"use client";

import Image from "next/image";
import type {
  MealPlanDetail,
  MealSlot,
  Equipment,
  EquipmentMode,
} from "@/types";
import { Badge } from "../ui/Badge";
import { getMealImageUrl, getMealCategory, getCategoryColor } from "@/lib/meal-images";

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

interface WeeklyPlanViewProps {
  plan: MealPlanDetail;
  equipment?: Equipment[];
}

function WeeklyPlanView({ plan, equipment = [] }: WeeklyPlanViewProps) {
  const modeLookup = buildEquipmentModeLookup(equipment);

  // Build a map of day number -> dinner slot
  const slotsByDay = new Map<number, MealSlot>();
  for (const slot of plan.slots) {
    if (slot.meal_type === "dinner") {
      slotsByDay.set(slot.day, slot);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">
        Week of {plan.week_start_date}
      </h2>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 lg:grid lg:grid-cols-2 lg:divide-y-0 xl:grid-cols-3">
        {DAY_LABELS.map((label, dayIndex) => {
          const slot = slotsByDay.get(dayIndex);
          const recipe = slot?.recipe ?? null;
          const equipmentTags = slot ? getEquipmentTags(slot, modeLookup) : [];

          return (
            <li key={dayIndex} className="overflow-hidden px-0 py-0 lg:border-b lg:border-r lg:border-gray-200">
              {/* Thumbnail image (desktop: taller, mobile: shorter) */}
              {recipe && (() => {
                const imgUrl = getMealImageUrl(recipe.title, 400, 200);
                const cat = getMealCategory(recipe.title);
                const grad = getCategoryColor(cat);
                return imgUrl ? (
                  <div className="relative h-24 w-full lg:h-36">
                    <Image
                      src={imgUrl}
                      alt={recipe.title}
                      fill
                      className="object-cover"
                      placeholder="empty"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${grad} opacity-30`} />
                  </div>
                ) : (
                  <div className={`h-1 w-full bg-gradient-to-r ${grad}`} />
                );
              })()}

              <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                {/* Left: day + recipe info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-500">{label}</p>

                  {recipe ? (
                    <>
                      <p className="mt-1 truncate font-medium text-gray-900">
                        {recipe.title}
                      </p>

                      {/* Times */}
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                        {recipe.prep_time_min !== null && (
                          <span>Prep: {formatTime(recipe.prep_time_min)}</span>
                        )}
                        {recipe.cook_time_min !== null && (
                          <span>Cook: {formatTime(recipe.cook_time_min)}</span>
                        )}
                      </div>

                      {/* Equipment tags */}
                      {equipmentTags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {equipmentTags.map((mode) => (
                            <Badge key={mode.id} variant="info">
                              {mode.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">
                      No dinner planned
                    </p>
                  )}
                </div>
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
