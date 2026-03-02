"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MealPlanDetail } from "@/types";
import { getMealPlan } from "@/services/api";

interface UseMealPlanPollingOptions {
  planId: string;
  enabled?: boolean;
  intervalMs?: number;
}

interface UseMealPlanPollingResult {
  plan: MealPlanDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Polls a meal plan by ID until its status leaves "draft".
 * Used during plan generation to wait for the worker to finish.
 */
function useMealPlanPolling({
  planId,
  enabled = true,
  intervalMs = 3000,
}: UseMealPlanPollingOptions): UseMealPlanPollingResult {
  const [plan, setPlan] = useState<MealPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const data = await getMealPlan(planId);
      setPlan(data);
      setError(null);

      // Stop polling once the plan is no longer draft
      if (data.status !== "draft") {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch {
      setError("Failed to load meal plan.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    void fetchPlan();

    // Start polling
    timerRef.current = setInterval(() => {
      void fetchPlan();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, fetchPlan, intervalMs]);

  return { plan, loading, error, refetch: fetchPlan };
}

export { useMealPlanPolling };
export type { UseMealPlanPollingOptions, UseMealPlanPollingResult };
