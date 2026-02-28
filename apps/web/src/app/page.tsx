"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { InventoryItem, MealPlanDetail } from "@/types";
import { listInventory, getActiveMealPlan, createMealPlan } from "@/services/api";
import { ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

function getNextMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlanDetail | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [inventoryData, activePlan] = await Promise.allSettled([
        listInventory(),
        getActiveMealPlan(),
      ]);

      if (inventoryData.status === "fulfilled") {
        setInventory(inventoryData.value);
      }

      if (activePlan.status === "fulfilled") {
        setPlan(activePlan.value);
      } else {
        // No active plan (404) is expected, not an error
        const err = activePlan.reason;
        if (err instanceof ApiError && err.status === 404) {
          setPlan(null);
        }
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const newPlan = await createMealPlan({ week_start_date: getNextMonday() });
      router.push(`/meal-plan/${newPlan.id}`);
    } catch {
      setError("Failed to generate meal plan.");
      setGenerating(false);
    }
  };

  const expiringCount = inventory.filter(
    (item) => item.expiry_status === "expiring" || item.expiry_status === "expired",
  ).length;

  const cookedCount = plan
    ? plan.slots.filter((s) => s.status === "cooked").length
    : 0;
  const totalSlots = plan ? plan.slots.length : 0;

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Plan Summary */}
      {plan ? (
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Plan</h2>
            <Badge variant="success">{plan.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Week of {plan.week_start_date}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {cookedCount} of {totalSlots} meals cooked
          </p>
          <div className="mt-3">
            <Link
              href={`/meal-plan/${plan.id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Plan &rarr;
            </Link>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="mb-4 text-gray-600">
            No active meal plan. Generate one to get started.
          </p>
          <Button
            onClick={() => void handleGenerate()}
            loading={generating}
            disabled={generating}
          >
            Generate Plan
          </Button>
        </section>
      )}

      {/* Expiring Items */}
      {expiringCount > 0 && (
        <section className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-yellow-800">
              {expiringCount} item{expiringCount !== 1 ? "s" : ""} expiring soon
            </p>
            <Link
              href="/inventory"
              className="text-sm font-medium text-yellow-700 hover:text-yellow-800"
            >
              View &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/inventory"
          className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50"
        >
          <p className="text-sm font-medium text-gray-900">Inventory</p>
          <p className="mt-1 text-xs text-gray-500">
            {inventory.length} item{inventory.length !== 1 ? "s" : ""}
          </p>
        </Link>
        <Link
          href="/meal-plan"
          className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50"
        >
          <p className="text-sm font-medium text-gray-900">Meal Plans</p>
          <p className="mt-1 text-xs text-gray-500">Plan your week</p>
        </Link>
        {plan && (
          <Link
            href={`/grocery-list/${plan.id}`}
            className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50"
          >
            <p className="text-sm font-medium text-gray-900">Grocery List</p>
            <p className="mt-1 text-xs text-gray-500">Shopping items</p>
          </Link>
        )}
      </section>
    </main>
  );
}
