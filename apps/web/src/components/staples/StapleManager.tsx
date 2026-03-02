"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Ingredient, StapleIngredient } from "@/types";
import {
  listStaples,
  addStaple,
  removeStaple,
  searchIngredients,
  type CreateStapleBody,
} from "@/services/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface StapleManagerProps {
  onChanged?: () => void;
}

function StapleManager({ onChanged }: StapleManagerProps) {
  const [staples, setStaples] = useState<StapleIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Add staple form state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [minThreshold, setMinThreshold] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  const fetchStaples = async () => {
    setLoading(true);
    try {
      const data = await listStaples();
      setStaples(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaples();
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const results = await searchIngredients(q, 10);
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIngredient(null);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, 300);
  };

  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setQuery(ingredient.name);
    setShowSuggestions(false);

    // Pre-fill unit from ingredient default
    if (ingredient.default_unit) {
      setUnit(ingredient.default_unit);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddStaple = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedIngredient) {
      setError("Please select an ingredient.");
      return;
    }

    const threshold = parseFloat(minThreshold);
    if (Number.isNaN(threshold) || threshold <= 0) {
      setError("Threshold must be a positive number.");
      return;
    }

    if (!unit.trim()) {
      setError("Unit is required.");
      return;
    }

    const body: CreateStapleBody = {
      ingredient_id: selectedIngredient.id,
      min_threshold: threshold,
      unit: unit.trim(),
    };

    setActionInProgress(true);
    try {
      await addStaple(body);
      // Reset form
      setQuery("");
      setSelectedIngredient(null);
      setMinThreshold("");
      setUnit("");
      await fetchStaples();
      onChanged?.();
    } catch {
      setError("Failed to add staple. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRemove = async (stapleId: string) => {
    setActionInProgress(true);
    try {
      await removeStaple(stapleId);
      await fetchStaples();
      onChanged?.();
    } catch {
      // silently fail
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return <p className="py-4 text-center text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Add Staple Form */}
      <form onSubmit={handleAddStaple} className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Add Staple</h3>

        <div className="relative">
          <Input
            label="Ingredient"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search ingredients..."
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg"
            >
              {suggestions.map((ing) => (
                <li key={ing.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                    onClick={() => handleSelectIngredient(ing)}
                  >
                    <span className="font-medium">{ing.name}</span>
                    <span className="ml-2 text-gray-500">{ing.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Min Threshold"
              type="number"
              min="0"
              step="any"
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <Input
              label="Unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="g, ml, units"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" loading={actionInProgress} className="w-full">
          Add Staple
        </Button>
      </form>

      {/* Staples List */}
      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Current Staples
        </h3>
        {staples.length === 0 ? (
          <p className="py-4 text-center text-gray-500">
            No staples configured. Add some above!
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {staples.map((staple) => (
              <li
                key={staple.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {staple.ingredient_id}
                  </p>
                  <p className="text-sm text-gray-600">
                    Min: {staple.min_threshold} {staple.unit}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="danger"
                  loading={actionInProgress}
                  onClick={() => void handleRemove(staple.id)}
                  className="!min-h-[36px] !px-3 text-xs"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export { StapleManager };
export type { StapleManagerProps };
