"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getActiveMealPlan } from "@/services/api";
import { ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";

export default function GroceryListIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [noPlan, setNoPlan] = useState(false);

  useEffect(() => {
    document.title = "Grocery Lists | Meal Planner";
    async function redirect() {
      try {
        const plan = await getActiveMealPlan();
        router.replace(`/grocery-list/${plan.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.isAuthError) {
          window.location.href = "/api/auth/login";
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setNoPlan(true);
        }
        setLoading(false);
      }
    }
    void redirect();
  }, [router]);

  if (loading && !noPlan) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Grocery List</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="mb-4 text-gray-600">
          No active meal plan. Generate a plan to create a grocery list.
        </p>
        <Link
          href="/meal-plan"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to Meal Plans
        </Link>
      </div>
    </main>
  );
}
