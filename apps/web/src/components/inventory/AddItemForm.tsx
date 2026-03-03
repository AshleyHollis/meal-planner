"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Ingredient, StorageLocation, UnitType } from "@/types";
import {
  addInventoryItem,
  searchIngredients,
  type CreateInventoryItemBody,
} from "@/services/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const UNITS: UnitType[] = ["g", "ml", "units"];
const LOCATIONS: StorageLocation[] = ["fridge", "pantry", "freezer"];

interface AddItemFormProps {
  onSuccess?: () => void;
}

function AddItemForm({ onSuccess }: AddItemFormProps) {
  // --- ingredient autocomplete state ---
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- form fields ---
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<UnitType>("g");
  const [location, setLocation] = useState<StorageLocation>("fridge");
  const [expiryDate, setExpiryDate] = useState("");
  const [defrostHours, setDefrostHours] = useState("");

  // --- submission state ---
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // --- fetch ingredient suggestions ---
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

    // Pre-fill defaults from ingredient
    if (
      ingredient.default_unit === "g" ||
      ingredient.default_unit === "ml" ||
      ingredient.default_unit === "units"
    ) {
      setUnit(ingredient.default_unit as UnitType);
    }
    if (
      ingredient.default_storage === "fridge" ||
      ingredient.default_storage === "pantry"
    ) {
      setLocation(ingredient.default_storage as StorageLocation);
    }
  };

  // --- close suggestions on outside click ---
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

  // --- submit handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedIngredient) {
      setError("Please select an ingredient from the suggestions.");
      return;
    }

    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }

    const body: CreateInventoryItemBody = {
      ingredient_id: selectedIngredient.id,
      quantity: qty,
      unit,
      location,
      expiry_date: expiryDate || null,
    };

    // Add defrost_hours if location is freezer
    if (location === "freezer" && defrostHours) {
      const hours = parseFloat(defrostHours);
      if (!Number.isNaN(hours) && hours > 0) {
        body.defrost_hours = hours;
      }
    }

    setSubmitting(true);
    try {
      await addInventoryItem(body);
      // Reset form
      setQuery("");
      setSelectedIngredient(null);
      setQuantity("");
      setUnit("g");
      setLocation("fridge");
      setExpiryDate("");
      setDefrostHours("");
      onSuccess?.();
    } catch {
      setError("Failed to add item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Ingredient autocomplete */}
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

      {/* Quantity + Unit row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Quantity"
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="w-28">
          <label
            htmlFor="unit-select"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Unit
          </label>
          <select
            id="unit-select"
            value={unit}
            onChange={(e) => setUnit(e.target.value as UnitType)}
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location selector */}
      <div>
        <label
          htmlFor="location-select"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Location
        </label>
        <select
          id="location-select"
          value={location}
          onChange={(e) => setLocation(e.target.value as StorageLocation)}
          className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc.charAt(0).toUpperCase() + loc.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Optional expiry date */}
      <Input
        label="Expiry Date (optional)"
        type="date"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
      />

      {/* Defrost Hours (only for freezer) */}
      {location === "freezer" && (
        <Input
          label="Defrost Hours (optional)"
          type="number"
          min="0"
          step="any"
          value={defrostHours}
          onChange={(e) => setDefrostHours(e.target.value)}
          placeholder="Hours needed to defrost"
        />
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit */}
      <Button type="submit" loading={submitting} className="w-full">
        Add to Inventory
      </Button>
    </form>
  );
}

export { AddItemForm };
export type { AddItemFormProps };
