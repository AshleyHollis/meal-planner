"use client";

import { useState } from "react";
import type { SubstitutionResult } from "@/types";
import { substituteIngredient, ApiError } from "@/services/api";
import { Button } from "./ui/Button";

interface SubstitutionDialogProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  slotId: string;
  ingredientName: string;
  onSuccess: (result: SubstitutionResult) => void;
}

function SubstitutionDialog({
  open,
  onClose,
  planId,
  slotId,
  ingredientName,
  onSuccess,
}: SubstitutionDialogProps) {
  const [replacement, setReplacement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubstitutionResult | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!replacement.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await substituteIngredient(planId, slotId, {
        original_ingredient_name: ingredientName,
        replacement_ingredient_name: replacement.trim(),
      });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      const message =
        err instanceof ApiError
          ? ((err.body as { detail?: string })?.detail ?? err.message)
          : "Failed to substitute ingredient.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onSuccess(result);
      handleClose();
    }
  };

  const handleClose = () => {
    setReplacement("");
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Substitute Ingredient
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Replacing:{" "}
            <span className="font-medium text-gray-700">{ingredientName}</span>
          </p>
        </div>

        <div className="px-6 py-4">
          {!result && (
            <>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Replacement ingredient
              </label>
              <input
                type="text"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
                placeholder="e.g. Greek yogurt"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-800">
                  New recipe: {result.new_recipe.title}
                </p>
              </div>

              {result.allergen_warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <p className="mb-1 text-sm font-semibold text-yellow-800">
                    ⚠️ Allergen warnings
                  </p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {result.allergen_warnings.map((w, i) => (
                      <li key={i} className="text-sm text-yellow-700">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.grocery_changes.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-gray-700">
                    Grocery changes
                  </p>
                  <ul className="space-y-1">
                    {result.grocery_changes.map((change, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                            change.action === "added"
                              ? "bg-green-100 text-green-700"
                              : change.action === "removed"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {change.action}
                        </span>
                        {change.ingredient_name}: {change.quantity}{" "}
                        {change.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          {!result ? (
            <Button
              size="sm"
              onClick={() => void handleSubmit()}
              loading={loading}
              disabled={loading || !replacement.trim()}
            >
              Find Substitute
            </Button>
          ) : (
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { SubstitutionDialog };
export type { SubstitutionDialogProps };
