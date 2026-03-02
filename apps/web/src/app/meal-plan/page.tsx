"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { MealPlan } from "@/types";
import { listMealPlans, createMealPlan } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning"> = {
  draft: "warning",
  active: "success",
  completed: "default",
};

function getNextMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default function MealPlanListPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
      const data = await listMealPlans();
      setPlans(data);
    } catch {
      setError("Failed to load meal plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const plan = await createMealPlan({ week_start_date: getNextMonday() });
      router.push(`/meal-plan/${plan.id}`);
    } catch {
      setError("Failed to generate meal plan.");
      setGenerating(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
        <Button
          onClick={() => void handleGenerate()}
          loading={generating}
          disabled={generating}
        >
          Generate New Plan
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && plans.length === 0 && (
        <p className="py-12 text-center text-gray-500">
          No meal plans yet. Generate your first plan to get started.
        </p>
      )}

      {!loading && !error && plans.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 lg:grid lg:grid-cols-2 lg:divide-y-0 lg:gap-px">
          {plans.map((plan) => (
            <li key={plan.id} className="lg:border lg:border-gray-200 lg:first:rounded-tl-lg lg:first:rounded-bl-lg lg:[&:nth-child(2)]:rounded-tr-lg lg:last:rounded-br-lg">
              <Link
                href={`/meal-plan/${plan.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 lg:rounded-lg lg:p-6"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    Week of {plan.week_start_date}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Created {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[plan.status] ?? "default"}>
                  {plan.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
