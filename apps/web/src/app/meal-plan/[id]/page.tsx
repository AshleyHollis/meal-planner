"use client";

import { use } from "react";
import Link from "next/link";

import { useMealPlanPolling } from "@/hooks/useMealPlanPolling";
import { WeeklyPlanView } from "@/components/meal-plan/WeeklyPlanView";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

interface MealPlanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function MealPlanDetailPage({ params }: MealPlanDetailPageProps) {
  const { id } = use(params);
  const { plan, loading, error } = useMealPlanPolling({
    planId: id,
    enabled: true,
  });

  const isDraft = plan?.status === "draft";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/meal-plan"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to plans
        </Link>
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

      {plan && isDraft && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Spinner size="lg" />
          <p className="text-gray-600">Generating your meal plan...</p>
          <Badge variant="warning">Draft</Badge>
        </div>
      )}

      {plan && !isDraft && (
        <>
          {plan.error_message && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {plan.error_message}
            </div>
          )}
          <WeeklyPlanView plan={plan} />
        </>
      )}
    </main>
  );
}
