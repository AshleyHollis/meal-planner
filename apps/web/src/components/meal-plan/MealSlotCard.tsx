"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type {
  MealSlot,
  EquipmentMode,
  EffortLevel,
  MealSlotRating,
} from "@/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { RatingWidget } from "../RatingWidget";
import { FavoriteButton } from "../FavoriteButton";
import {
  getMealImageUrl,
  getMealCategory,
  getCategoryColor,
} from "@/lib/meal-images";
import { LeftoverForm } from "../leftover/LeftoverForm";
import { SubstitutionDialog } from "../SubstitutionDialog";

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
  onRated?: (rating: MealSlotRating) => void;
  onFavoriteToggle?: (recipeId: string, isFavorited: boolean) => void;
  isFavorited?: boolean;
  onLeftoverRecorded?: () => void;
  onIngredientSubstituted?: () => void;
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
  onRated,
  onFavoriteToggle,
  isFavorited = false,
  onLeftoverRecorded,
  onIngredientSubstituted,
}: MealSlotCardProps) {
  const [showLeftoverForm, setShowLeftoverForm] = useState(false);
  const [swapDialog, setSwapDialog] = useState<{
    open: boolean;
    ingredientName: string;
  }>({ open: false, ingredientName: "" });

  const recipe = slot.recipe;
  const statusCfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.planned;
  const isDone = slot.status === "cooked" || slot.status === "skipped";
  const isCooked = slot.status === "cooked";

  const [existingRating, setExistingRating] = useState<MealSlotRating | null>(
    null,
  );
  const [loadingRating, setLoadingRating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isCooked && planId && !existingRating && !loadingRating) {
      setLoadingRating(true);
      import("@/services/api")
        .then(({ getRating }) => getRating(planId, slot.id))
        .then((rating) => setExistingRating(rating))
        .catch((err) => console.error("Failed to load rating:", err))
        .finally(() => setLoadingRating(false));
    }
  }, [isCooked, planId, slot.id, existingRating, loadingRating]);

  const imageUrl = recipe ? getMealImageUrl(recipe.title, 800, 400) : "";
  const category = recipe ? getMealCategory(recipe.title) : "default";
  const gradientColor = getCategoryColor(category);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Compact meal image with title overlay */}
      {recipe && imageUrl && (
        <div className="relative h-24 w-full lg:h-32">
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

      <div className="p-3">
        {/* Header: status + favorite (no duplicate title) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!recipe && (
              <p className="text-sm text-gray-400">No recipe assigned</p>
            )}
            {recipe &&
              (recipe.prep_time_min !== null ||
                recipe.cook_time_min !== null) && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {recipe.prep_time_min !== null && (
                    <span>Prep: {formatTime(recipe.prep_time_min)}</span>
                  )}
                  {recipe.cook_time_min !== null && (
                    <span>Cook: {formatTime(recipe.cook_time_min)}</span>
                  )}
                </div>
              )}
          </div>

          <div className="flex items-center gap-2">
            {recipe && (
              <FavoriteButton
                recipeId={recipe.id}
                isFavorited={isFavorited}
                onToggle={onFavoriteToggle}
              />
            )}
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          </div>
        </div>

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
                    <span className="ml-1 text-yellow-600">
                      (unit mismatch)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {recipe && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!isDone && (
              <>
                {onSwap && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSwap(slot.id)}
                  >
                    Swap
                  </Button>
                )}
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
                {onMarkCooked && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onMarkCooked(slot.id)}
                    className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    ✓ Cooked
                  </Button>
                )}
                {onMarkSkipped && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkSkipped(slot.id)}
                  >
                    Skip
                  </Button>
                )}
              </>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              {expanded ? "Hide Recipe ▲" : "View Recipe ▼"}
            </button>
          </div>
        )}

        {/* Expandable recipe detail */}
        {recipe && expanded && (
          <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
            {recipe.description && (
              <p className="mb-3 text-gray-600">{recipe.description}</p>
            )}
            {recipe.ingredients.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Ingredients
                </h4>
                <ul className="grid grid-cols-1 gap-0.5 text-gray-700 sm:grid-cols-2">
                  {recipe.ingredients.map((ing) => (
                    <li key={ing.id} className="flex items-baseline gap-1">
                      <span className="text-gray-400">•</span>
                      <span className="flex-1">
                        {ing.quantity} {ing.unit}{" "}
                        {ing.ingredient_name || "ingredient"}
                        {ing.is_optional && (
                          <span className="ml-1 text-xs text-gray-400">
                            (optional)
                          </span>
                        )}
                      </span>
                      {planId && !isDone && (
                        <button
                          onClick={() =>
                            setSwapDialog({
                              open: true,
                              ingredientName: ing.ingredient_name || "ingredient",
                            })
                          }
                          className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                          title="Swap ingredient"
                        >
                          Swap
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recipe.steps.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Steps
                </h4>
                <ol className="space-y-1.5 text-gray-700">
                  {recipe.steps
                    .sort((a, b) => a.step_order - b.step_order)
                    .map((step, idx) => (
                      <li key={step.id} className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                          {idx + 1}
                        </span>
                        <span>
                          {step.instruction}
                          {step.duration_min && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({step.duration_min} min)
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Rating widget for cooked meals */}
        {isCooked && planId && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <RatingWidget
              planId={planId}
              slotId={slot.id}
              existingRating={existingRating}
              onRated={(rating) => {
                setExistingRating(rating);
                if (onRated) {
                  onRated(rating);
                }
              }}
            />
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

      {/* Ingredient substitution dialog */}
      {planId && swapDialog.open && (
        <SubstitutionDialog
          open={swapDialog.open}
          onClose={() => setSwapDialog({ open: false, ingredientName: "" })}
          planId={planId}
          slotId={slot.id}
          ingredientName={swapDialog.ingredientName}
          onSuccess={() => {
            setSwapDialog({ open: false, ingredientName: "" });
            onIngredientSubstituted?.();
          }}
        />
      )}
    </div>
  );
}

export { MealSlotCard };
export type { MealSlotCardProps };
