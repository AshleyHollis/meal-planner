"use client";

import type { QuickSuggestion } from "@/types";
import { Button } from "./ui/Button";

interface QuickSuggestionCardProps {
  suggestion: QuickSuggestion;
  onCookThis: (suggestion: QuickSuggestion) => void;
}

function QuickSuggestionCard({
  suggestion,
  onCookThis,
}: QuickSuggestionCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
        {suggestion.description && (
          <p className="mt-1 text-sm text-gray-500">{suggestion.description}</p>
        )}

        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>Prep: {suggestion.prep_time_min}m</span>
          <span>Cook: {suggestion.cook_time_min}m</span>
          <span>Serves: {suggestion.servings}</span>
        </div>

        {suggestion.ingredients.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ingredients
            </p>
            <ul className="space-y-0.5">
              {suggestion.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-1.5 text-sm">
                  <span
                    className={`text-base leading-none ${
                      ing.on_hand ? "text-green-500" : "text-red-400"
                    }`}
                  >
                    {ing.on_hand ? "✓" : "✗"}
                  </span>
                  <span
                    className={ing.on_hand ? "text-gray-700" : "text-gray-400"}
                  >
                    {ing.quantity} {ing.unit} {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-gray-100 px-4 py-3">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => onCookThis(suggestion)}
        >
          Cook This
        </Button>
      </div>
    </div>
  );
}

export { QuickSuggestionCard };
export type { QuickSuggestionCardProps };
