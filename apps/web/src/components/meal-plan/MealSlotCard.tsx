"use client";

import type { MealSlot, EquipmentMode, EffortLevel } from "@/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

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
  equipmentModes?: EquipmentMode[];
  onSwap?: (slotId: string) => void;
  onAdapt?: (slotId: string, effort: EffortLevel) => void;
  onMarkCooked?: (slotId: string) => void;
  onMarkSkipped?: (slotId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MealSlotCard({
  slot,
  equipmentModes = [],
  onSwap,
  onAdapt,
  onMarkCooked,
  onMarkSkipped,
}: MealSlotCardProps) {
  const recipe = slot.recipe;
  const statusCfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.planned;
  const isDone = slot.status === "cooked" || slot.status === "skipped";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
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
      {recipe && (recipe.prep_time_min !== null || recipe.cook_time_min !== null) && (
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

      {/* Actions */}
      {!isDone && recipe && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Swap */}
          {onSwap && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSwap(slot.id)}
            >
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
    </div>
  );
}

export { MealSlotCard };
export type { MealSlotCardProps };
