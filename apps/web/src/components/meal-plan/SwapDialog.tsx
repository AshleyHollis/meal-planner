"use client";

import { useState } from "react";
import type { MealSlot } from "@/types";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { updateMealSlot } from "@/services/api";
import { DAY_LABELS_LONG } from "@/lib/date-utils";

const DAY_LABELS = DAY_LABELS_LONG;

interface SwapDialogProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  sourceSlot: MealSlot;
  availableSlots: MealSlot[];
  onSwapComplete?: () => void;
}

function SwapDialog({
  open,
  onClose,
  planId,
  sourceSlot,
  availableSlots,
  onSwapComplete,
}: SwapDialogProps) {
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwap = async () => {
    if (!targetSlotId) return;

    const targetSlot = availableSlots.find((s) => s.id === targetSlotId);
    if (!targetSlot) return;

    setLoading(true);
    setError(null);

    try {
      // Swap recipes between the two slots
      const sourceRecipeId = sourceSlot.recipe?.id ?? null;
      const targetRecipeId = targetSlot.recipe?.id ?? null;

      await updateMealSlot(planId, sourceSlot.id, {
        recipe_id: targetRecipeId,
      });
      await updateMealSlot(planId, targetSlot.id, {
        recipe_id: sourceRecipeId,
      });

      onSwapComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setLoading(false);
    }
  };

  // Filter out the source slot from available targets
  const targets = availableSlots.filter((s) => s.id !== sourceSlot.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Swap: ${sourceSlot.recipe?.title ?? "Empty slot"}`}
    >
      <p className="mb-3 text-sm text-gray-600">Select a day to swap with:</p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ul className="mb-4 space-y-2">
        {targets.map((slot) => (
          <li key={slot.id}>
            <button
              type="button"
              onClick={() => setTargetSlotId(slot.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                targetSlotId === slot.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="text-sm font-semibold text-gray-500">
                {DAY_LABELS[slot.day] ?? `Day ${slot.day}`}
              </span>
              <p className="mt-0.5 truncate text-gray-900">
                {slot.recipe?.title ?? "No recipe"}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSwap}
          disabled={!targetSlotId}
          loading={loading}
        >
          Swap
        </Button>
      </div>
    </Dialog>
  );
}

export { SwapDialog };
export type { SwapDialogProps };
