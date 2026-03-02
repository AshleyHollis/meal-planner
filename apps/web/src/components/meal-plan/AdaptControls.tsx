"use client";

import { useState } from "react";
import type { EffortLevel } from "@/types";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { adaptMealSlot } from "@/services/api";

const EFFORT_OPTIONS: { level: EffortLevel; label: string }[] = [
  { level: "quick", label: "Quick" },
  { level: "standard", label: "Standard" },
  { level: "elaborate", label: "Elaborate" },
];

interface AdaptControlsProps {
  planId: string;
  slotId: string;
  onAdapted?: (result: { effort_level: string; status: string }) => void;
}

function AdaptControls({ planId, slotId, onAdapted }: AdaptControlsProps) {
  const [loading, setLoading] = useState<EffortLevel | null>(null);
  const [result, setResult] = useState<{
    effort_level: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdapt = async (effort: EffortLevel) => {
    setLoading(effort);
    setError(null);
    setResult(null);

    try {
      const res = await adaptMealSlot(planId, slotId, {
        effort_level: effort,
      });
      setResult(res);
      onAdapted?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adaptation failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Adapt recipe:</p>

      <div className="flex gap-2">
        {EFFORT_OPTIONS.map(({ level, label }) => (
          <Button
            key={level}
            variant="secondary"
            size="sm"
            onClick={() => handleAdapt(level)}
            loading={loading === level}
            disabled={loading !== null}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" />
          <span>Adapting recipe...</span>
        </div>
      )}

      {result && (
        <p className="text-sm text-green-700">
          Adapted to {result.effort_level} ({result.status})
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export { AdaptControls };
export type { AdaptControlsProps };
