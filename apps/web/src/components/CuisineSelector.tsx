"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

interface CuisineSelectorProps {
  selected: string[];
  onChange: (cuisines: string[]) => void;
}

const COMMON_CUISINES = [
  "Mexican",
  "Italian",
  "Asian",
  "Mediterranean",
  "American",
  "Indian",
  "Thai",
  "Japanese",
  "French",
  "Middle Eastern",
];

function CuisineSelector({ selected, onChange }: CuisineSelectorProps) {
  const [customValue, setCustomValue] = useState("");

  const handleToggle = (cuisine: string) => {
    if (selected.includes(cuisine)) {
      onChange(selected.filter((c) => c !== cuisine));
    } else {
      onChange([...selected, cuisine]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customValue.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomValue("");
    }
  };

  const handleRemove = (cuisine: string) => {
    onChange(selected.filter((c) => c !== cuisine));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Cuisine Preferences
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_CUISINES.map((cuisine) => (
            <button
              key={cuisine}
              type="button"
              onClick={() => handleToggle(cuisine)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                selected.includes(cuisine)
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-gray-600">Selected:</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((cuisine) => (
              <Badge key={cuisine} variant="info">
                {cuisine}
                <button
                  type="button"
                  onClick={() => handleRemove(cuisine)}
                  className="ml-1.5 text-blue-700 hover:text-blue-900"
                  aria-label={`Remove ${cuisine}`}
                >
                  &times;
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="custom-cuisine" className="sr-only">
          Add custom cuisine
        </label>
        <div className="flex gap-2">
          <input
            id="custom-cuisine"
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="Add custom cuisine..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export { CuisineSelector };
export type { CuisineSelectorProps };
