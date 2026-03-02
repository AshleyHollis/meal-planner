"use client";

import { useEffect, useState } from "react";

import type { StapleSuggestion } from "@/types";
import { getStapleSuggestions } from "@/services/api";
import { Badge } from "../ui/Badge";

interface StapleSuggestionsProps {
  onChanged?: () => void;
}

function StapleSuggestions({ onChanged }: StapleSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<StapleSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await getStapleSuggestions();
      setSuggestions(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSuggestions();
  }, [onChanged]);

  if (loading) {
    return <p className="py-4 text-center text-gray-500">Loading...</p>;
  }

  if (suggestions.length === 0) {
    return (
      <p className="py-4 text-center text-gray-500">
        All staples are stocked! 🎉
      </p>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        Staples Needed
      </h3>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.ingredient_id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">
                {suggestion.ingredient_name}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Current: {suggestion.current_qty} {suggestion.unit}
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">
                  Min: {suggestion.min_threshold} {suggestion.unit}
                </span>
              </div>
            </div>

            <Badge variant="warning">
              Need {suggestion.quantity_needed} {suggestion.unit}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { StapleSuggestions };
export type { StapleSuggestionsProps };
