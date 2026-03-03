"use client";

import { useState } from "react";
import type { MealHistoryItem } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          No meal history yet. Mark meals as cooked to see them here.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {items.map((item) => (
              <li
                key={item.slot_id}
                className="flex items-start justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {item.recipe_title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {new Date(item.cooked_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    &middot; {item.meal_type}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
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
              </li>
            ))}
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
