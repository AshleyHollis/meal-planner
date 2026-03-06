"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { InventoryItem } from "@/types";
import { getInventoryItem, ApiError } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ExpiryBadge } from "@/components/inventory/ExpiryBadge";

interface InventoryDetailPageProps {
  params: Promise<{ id: string }>;
}

const LOCATION_LABELS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  fridge: { label: "Fridge", icon: "🧊", color: "bg-blue-50 text-blue-800" },
  pantry: { label: "Pantry", icon: "🗄️", color: "bg-amber-50 text-amber-800" },
  freezer: { label: "Freezer", icon: "❄️", color: "bg-cyan-50 text-cyan-800" },
};

export default function InventoryDetailPage({
  params,
}: InventoryDetailPageProps) {
  const { id } = use(params);

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Inventory | Meal Planner";
    async function fetchItem() {
      try {
        setError(null);
        const data = await getInventoryItem(id);
        setItem(data);
      } catch (err) {
        if (err instanceof ApiError && err.isAuthError) {
          window.location.href = "/api/auth/login";
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setError("Inventory item not found.");
        } else {
          setError("Failed to load inventory item.");
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchItem();
  }, [id]);

  const locationInfo = item
    ? (LOCATION_LABELS[item.location] ?? {
        label: item.location,
        icon: "📦",
        color: "bg-gray-50 text-gray-800",
      })
    : null;

  const expiryColorClass = (() => {
    if (!item?.expiry_date) return "";
    const diffDays = Math.ceil(
      (new Date(item.expiry_date).setHours(0, 0, 0, 0) -
        new Date().setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) return "border-red-200 bg-red-50";
    if (diffDays <= 7) return "border-yellow-200 bg-yellow-50";
    return "border-green-200 bg-green-50";
  })();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-4xl">
      {/* Breadcrumb + back */}
      <div className="mb-6 space-y-2">
        <Breadcrumbs
          items={[
            { label: "Inventory", href: "/inventory" },
            { label: item?.ingredient.name ?? "Item" },
          ]}
        />
        <div>
          <Link
            href="/inventory"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to Inventory
          </Link>
        </div>
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

      {item && (
        <div className="space-y-6">
          {/* Header card */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {item.ingredient.name}
                </h1>
                <p className="mt-1 text-sm text-gray-500 capitalize">
                  {item.ingredient.category}
                </p>
              </div>
              {locationInfo && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${locationInfo.color}`}
                >
                  <span>{locationInfo.icon}</span>
                  {locationInfo.label}
                </span>
              )}
            </div>

            {/* Quantity */}
            <div className="mt-6 flex items-center gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Quantity
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {item.quantity}
                  <span className="ml-1 text-lg font-normal text-gray-500">
                    {item.unit}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Expiry status */}
          <div
            className={`rounded-xl border p-6 shadow-sm ${expiryColorClass || "border-gray-100 bg-white"}`}
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Expiry Status
            </h3>
            {item.expiry_date ? (
              <div className="flex items-center gap-3">
                <ExpiryBadge expiryDate={item.expiry_date} />
                <p className="text-sm text-gray-700">
                  {new Date(item.expiry_date).toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No expiry date set</p>
            )}
          </div>

          {/* Storage details */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Storage Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="mt-1 font-medium text-gray-900 capitalize">
                  {locationInfo?.icon} {locationInfo?.label ?? item.location}
                </p>
              </div>
              {item.defrost_hours != null && item.defrost_hours > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Defrost time needed</p>
                  <p className="mt-1">
                    <Badge variant="info">{item.defrost_hours}h</Badge>
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Default storage</p>
                <p className="mt-1 text-sm text-gray-700 capitalize">
                  {item.ingredient.default_storage}
                </p>
              </div>
              {item.ingredient.typical_shelf_life_days && (
                <div>
                  <p className="text-xs text-gray-400">Typical shelf life</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {item.ingredient.typical_shelf_life_days} days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ingredient info */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Ingredient Info
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Category</p>
                <p className="mt-1 capitalize text-gray-700">
                  {item.ingredient.category}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Default unit</p>
                <p className="mt-1 text-gray-700">
                  {item.ingredient.default_unit}
                </p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Added
            </h3>
            <p className="text-sm text-gray-700">
              {new Date(item.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Action */}
          <div className="flex gap-3">
            <Link
              href="/inventory"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Inventory
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
