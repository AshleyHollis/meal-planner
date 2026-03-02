"use client";

import { useState } from "react";
import Image from "next/image";
import type { MealSlot, EquipmentMode, EffortLevel } from "@/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  getMealImageUrl,
  getMealCategory,
  getCategoryColor,
} from "@/lib/meal-images";
import { LeftoverForm } from "../leftover/LeftoverForm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" }
> = {
  planned: { label: "Planned", variant: "default" },
  cooked: { label: "Cooked", variant: "success" },
  skipped: { label: "Skipped", variant: "warning" },
};

const EFFORT_LABELS: Record<EffortLevel, string> = {
  quick: "Quick",
  standard: "Standard",
  elaborate: "Elaborate",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MealSlotCardProps {
  slot: MealSlot;
  planId?: string;
  equipmentModes?: EquipmentMode[];
  onSwap?: (slotId: string) => void;
  onAdapt?: (slotId: string, effort: EffortLevel) => void;
  onMarkCooked?: (slotId: string) => void;
  onMarkSkipped?: (slotId: string) => void;
  onLeftoverRecorded?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MealSlotCard({
  slot,
  planId,
  equipmentModes = [],
  onSwap,
  onAdapt,
  onMarkCooked,
  onMarkSkipped,
  onLeftoverRecorded,
}: MealSlotCardProps) {
  const [showLeftoverForm, setShowLeftoverForm] = useState(false);
  
  const recipe = slot.recipe;
  const statusCfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.planned;
  const isDone = slot.status === "cooked" || slot.status === "skipped";
  const isCooked = slot.status === "cooked";

  const imageUrl = recipe ? getMealImageUrl(recipe.title, 800, 400) : "";
  const category = recipe ? getMealCategory(recipe.title) : "default";
  const gradientColor = getCategoryColor(category);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Meal image with gradient overlay */}
      {recipe && imageUrl && (
        <div className="relative h-32 w-full lg:h-48">
          <Image
            src={imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            placeholder="empty"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${gradientColor} opacity-40`}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
            <p className="truncate text-sm font-semibold text-white drop-shadow">
              {recipe.title}
            </p>
          </div>
        </div>
      )}
      {/* Fallback color bar when no image */}
      {recipe && !imageUrl && (
        <div className={`h-2 w-full bg-gradient-to-r ${gradientColor}`} />
      )}

      <div className="p-4">
        {/* Header: title + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {recipe ? (
              <p className="truncate font-medium text-gray-900">
                {recipe.title}
              </p>
            ) : (
              <p className="text-sm text-gray-400">No recipe assigned</p>
            )}
          </div>

          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>

        {/* Time info */}
        {recipe &&
          (recipe.prep_time_min !== null || recipe.cook_time_min !== null) && (
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
              {recipe.prep_time_min !== null && (
                <span>Prep: {formatTime(recipe.prep_time_min)}</span>
              )}
              {recipe.cook_time_min !== null && (
                <span>Cook: {formatTime(recipe.cook_time_min)}</span>
              )}
            </div>
          )}

        {/* Equipment mode badges */}
        {equipmentModes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {equipmentModes.map((mode) => (
              <Badge key={mode.id} variant="info">
                {mode.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Deductions */}
        {isCooked && slot.deductions && slot.deductions.length > 0 && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3">
            <p className="mb-1 text-xs font-semibold text-gray-700">
              Ingredients Deducted:
            </p>
            <ul className="space-y-1">
              {slot.deductions.map((deduction, idx) => (
                <li key={idx} className="text-xs text-gray-600">
                  {deduction.ingredient_name}: {deduction.deducted}{" "}
                  {deduction.unit}
                  {deduction.unit_mismatch && (
                    <span className="ml-1 text-yellow-600">(unit mismatch)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {!isDone && recipe && (
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Swap */}
            {onSwap && (
              <Button variant="ghost" size="sm" onClick={() => onSwap(slot.id)}>
                Swap
              </Button>
            )}

            {/* Adapt effort levels */}
            {onAdapt &&
              (["quick", "standard", "elaborate"] as EffortLevel[]).map(
                (effort) => (
                  <Button
                    key={effort}
                    variant="secondary"
                    size="sm"
                    onClick={() => onAdapt(slot.id, effort)}
                  >
                    {EFFORT_LABELS[effort]}
                  </Button>
                ),
              )}

            {/* Mark cooked */}
            {onMarkCooked && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onMarkCooked(slot.id)}
              >
                Cooked
              </Button>
            )}

            {/* Mark skipped */}
            {onMarkSkipped && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkSkipped(slot.id)}
              >
                Skip
              </Button>
            )}
          </div>
        )}

        {/* Record Leftovers button (after cooked) */}
        {isCooked && planId && (
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLeftoverForm(!showLeftoverForm)}
            >
              {showLeftoverForm ? "Cancel" : "Record Leftovers"}
            </Button>
          </div>
        )}
      </div>

      {/* Leftover Form (inline below card) */}
      {showLeftoverForm && isCooked && planId && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <LeftoverForm
            planId={planId}
            slotId={slot.id}
            onSuccess={() => {
              setShowLeftoverForm(false);
              onLeftoverRecorded?.();
            }}
          />
        </div>
      )}
    </div>
  );
}

export { MealSlotCard };
export type { MealSlotCardProps };
