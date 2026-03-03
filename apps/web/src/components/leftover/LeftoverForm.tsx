"use client";

import { useState } from "react";

import type { StorageLocation } from "@/types";
import { createLeftover, type CreateLeftoverBody } from "@/services/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const LOCATIONS: StorageLocation[] = ["fridge", "pantry", "freezer"];

interface LeftoverFormProps {
  planId: string;
  slotId: string;
  onSuccess?: () => void;
}

function LeftoverForm({ planId, slotId, onSuccess }: LeftoverFormProps) {
  const [portions, setPortions] = useState("");
  const [storageLocation, setStorageLocation] =
    useState<StorageLocation>("fridge");
  const [expiryDate, setExpiryDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const portionsNum = parseFloat(portions);
    if (Number.isNaN(portionsNum) || portionsNum <= 0) {
      setError("Portions must be a positive number.");
      return;
    }

    if (!expiryDate) {
      setError("Expiry date is required.");
      return;
    }

    const body: CreateLeftoverBody = {
      portions: portionsNum,
      storage_location: storageLocation,
      expiry_date: expiryDate,
    };

    setSubmitting(true);
    try {
      await createLeftover(planId, slotId, body);
      // Reset form
      setPortions("");
      setStorageLocation("fridge");
      setExpiryDate("");
      onSuccess?.();
    } catch {
      setError("Failed to record leftovers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Portions"
            type="number"
            min="0"
            step="any"
            value={portions}
            onChange={(e) => setPortions(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="storage-select"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Storage Location
          </label>
          <select
            id="storage-select"
            value={storageLocation}
            onChange={(e) =>
              setStorageLocation(e.target.value as StorageLocation)
            }
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc.charAt(0).toUpperCase() + loc.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Expiry Date"
        type="date"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" loading={submitting} className="w-full">
        Record Leftovers
      </Button>
    </form>
  );
}

export { LeftoverForm };
export type { LeftoverFormProps };
