"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type { InventoryItem, MealPlanDetail } from "@/types";
import {
  listInventory,
  getActiveMealPlan,
  createMealPlan,
} from "@/services/api";
import { ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getMealImageUrl } from "@/lib/meal-images";
import { CuisineSelector } from "@/components/CuisineSelector";

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
  const [showCuisineSelector, setShowCuisineSelector] = useState(false);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);

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
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
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
      const newPlan = await createMealPlan({
        week_start_date: getNextMonday(),
        cuisine_preferences:
          cuisinePreferences.length > 0 ? cuisinePreferences : undefined,
      });
      router.push(`/meal-plan/${newPlan.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to generate meal plan.");
      setGenerating(false);
    }
  };

  const expiringCount = inventory.filter(
    (item) =>
      item.expiry_status === "expiring" || item.expiry_status === "expired",
  ).length;

  const cookedCount = plan
    ? plan.slots.filter((s) => s.status === "cooked").length
    : 0;
  const totalSlots = plan ? plan.slots.length : 0;

  // Find today's dinner slot for the image accent
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const dayIndex = today === 0 ? 6 : today - 1; // convert to Mon=0..Sun=6
  const todaySlot = plan?.slots.find(
    (s) => s.day === dayIndex && s.meal_type === "dinner",
  );
  const todayImageUrl = todaySlot?.recipe
    ? getMealImageUrl(todaySlot.recipe.title, 600, 200)
    : "";

  if (loading) {
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
      <div className="mb-6 hidden lg:block">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-600">
          Here&apos;s your meal planning overview
        </p>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 lg:hidden">
        Dashboard
      </h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Plan Summary */}
      {plan ? (
        <section className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 lg:p-0">
          {todayImageUrl && (
            <div className="relative h-32 w-full lg:h-48">
              <Image
                src={todayImageUrl}
                alt={todaySlot?.recipe?.title ?? "Today's meal"}
                fill
                className="object-cover"
                placeholder="empty"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              {todaySlot?.recipe && (
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium text-white/90">Tonight&apos;s Dinner</p>
                  <p className="text-lg font-bold text-white drop-shadow-lg">
                    {todaySlot.recipe.title}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Active Plan
              </h2>
              <Badge variant="active">{plan.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Week of{" "}
              {new Date(plan.week_start_date).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600"
                style={{
                  width: `${totalSlots > 0 ? (cookedCount / totalSlots) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {cookedCount} of {totalSlots} meals cooked
            </p>
            <div className="mt-4">
              <Link
                href={`/meal-plan/${plan.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View Full Plan &rarr;
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm text-center">
          <div className="mb-4 text-5xl">🍽️</div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Plan Your Week</h3>
          <p className="mb-6 text-sm text-gray-600">
            Generate a meal plan to get started
          </p>
          {showCuisineSelector && (
            <div className="mb-4">
              <CuisineSelector
                selected={cuisinePreferences}
                onChange={setCuisinePreferences}
              />
            </div>
          )}
          <div className="flex justify-center gap-3">
            {!showCuisineSelector && (
              <Button
                variant="secondary"
                onClick={() => setShowCuisineSelector(true)}
              >
                Customize Cuisine
              </Button>
            )}
            <Button
              onClick={() => void handleGenerate()}
              loading={generating}
              disabled={generating}
            >
              Generate Plan
            </Button>
          </div>
        </section>
      )}

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-3 gap-3 lg:gap-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{cookedCount}</p>
          <p className="mt-1 text-xs text-gray-500">Meals This Week</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{expiringCount}</p>
          <p className="mt-1 text-xs text-gray-500">Items Expiring</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
          <p className="mt-1 text-xs text-gray-500">In Inventory</p>
        </div>
      </div>

      {/* Expiry Warning */}
      {expiringCount > 0 && (
        <section className="mb-6 rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900">
                {expiringCount} item{expiringCount !== 1 ? "s" : ""} expiring soon
              </p>
              <p className="mt-1 text-xs text-orange-700">
                Check your inventory to avoid food waste
              </p>
            </div>
            <Link
              href="/inventory"
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
            >
              View
            </Link>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Link
            href="/inventory"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Inventory</p>
          </Link>
          <Link
            href="/meal-plan"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Meal Plans</p>
          </Link>
          {plan && (
            <Link
              href={`/grocery-list/${plan.id}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <svg
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Grocery</p>
            </Link>
          )}
          <Link
            href="/quick-suggestions"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Quick Cook</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
