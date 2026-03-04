"use client";

import { useState } from "react";
import type { MealHistoryItem } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMealImageUrl } from "@/lib/meal-images";

interface MealHistoryListProps {
  items: MealHistoryItem[];
  hasMore: boolean;
  onLoadMore: () => void;
  loading?: boolean;
}

function MealHistoryList({
  items,
  hasMore,
  onLoadMore,
  loading = false,
}: MealHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (slotId: string) => {
    setExpandedId((prev) => (prev === slotId ? null : slotId));
  };

  const DAY_LABELS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          icon="📖"
          title="No Meals Yet"
          description="Cook meals from your plan to build history"
        />
      ) : (
        <>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
            {items.map((item) => {
              const isExpanded = expandedId === item.slot_id;
              const imageUrl = getMealImageUrl(item.recipe_title, 80, 80);

              return (
                <li key={item.slot_id} className="transition-colors">
                  <button
                    onClick={() => toggleExpanded(item.slot_id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    {/* Thumbnail Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt={item.recipe_title}
                        className="h-14 w-14 rounded-lg object-cover shadow-sm"
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">
                        {item.recipe_title}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        {new Date(item.cooked_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}{" "}
                        &middot; {item.meal_type}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.cuisine_type && (
                          <Badge variant="info">{item.cuisine_type}</Badge>
                        )}
                        {item.rating !== null && (
                          <Badge variant="default">
                            {"\u2605".repeat(item.rating)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Expand Indicator */}
                    <div className="flex-shrink-0">
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        {/* Large Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={getMealImageUrl(item.recipe_title, 300, 300)}
                            alt={item.recipe_title}
                            className="h-32 w-32 rounded-xl object-cover shadow-md sm:h-40 sm:w-40"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {item.recipe_title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {DAY_LABELS[item.day] ?? `Day ${item.day}`}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="font-medium text-gray-700">
                                Date Cooked
                              </p>
                              <p className="text-gray-600">
                                {new Date(item.cooked_at).toLocaleDateString(
                                  undefined,
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">
                                Meal Type
                              </p>
                              <p className="capitalize text-gray-600">
                                {item.meal_type}
                              </p>
                            </div>
                            {item.cuisine_type && (
                              <div>
                                <p className="font-medium text-gray-700">
                                  Cuisine
                                </p>
                                <p className="text-gray-600">
                                  {item.cuisine_type}
                                </p>
                              </div>
                            )}
                            {item.rating !== null && (
                              <div>
                                <p className="font-medium text-gray-700">
                                  Your Rating
                                </p>
                                <p className="text-lg text-yellow-500">
                                  {"\u2605".repeat(item.rating)}
                                  {"\u2606".repeat(5 - item.rating)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                onClick={onLoadMore}
                loading={loading}
                disabled={loading}
                variant="secondary"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { MealHistoryList };
export type { MealHistoryListProps };
