"use client";

import { useEffect, useState } from "react";

import type { Leftover } from "@/types";
import { listLeftovers, markLeftoverUsed } from "@/services/api";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface LeftoverListProps {
  onChanged?: () => void;
}

function LeftoverList({ onChanged }: LeftoverListProps) {
  const [leftovers, setLeftovers] = useState<Leftover[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchLeftovers = async () => {
    setLoading(true);
    try {
      const data = await listLeftovers(false);
      setLeftovers(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeftovers();
  }, []);

  const handleMarkUsed = async (leftoverId: string) => {
    setActionInProgress(true);
    try {
      await markLeftoverUsed(leftoverId);
      await fetchLeftovers();
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

  if (leftovers.length === 0) {
    return (
      <p className="py-4 text-center text-gray-500">
        No active leftovers. Cook a meal and record leftovers!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
      {leftovers.map((leftover) => (
        <li
          key={leftover.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">
              {leftover.portions} portions
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {leftover.storage_location.charAt(0).toUpperCase() +
                  leftover.storage_location.slice(1)}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-600">
                Expires: {new Date(leftover.expiry_date).toLocaleDateString()}
              </span>
              {leftover.is_expired && <Badge variant="error">Expired</Badge>}
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            loading={actionInProgress}
            onClick={() => void handleMarkUsed(leftover.id)}
            className="!min-h-[36px] !px-3 text-xs"
          >
            Mark Used
          </Button>
        </li>
      ))}
    </ul>
  );
}

export { LeftoverList };
export type { LeftoverListProps };
