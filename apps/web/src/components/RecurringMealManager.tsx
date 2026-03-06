"use client";

import { useState } from "react";
import type { RecurringMealTemplate } from "@/types";
import {
  createRecurringMeal,
  updateRecurringMeal,
  deleteRecurringMeal,
  ApiError,
} from "@/services/api";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MEAL_TYPE_OPTIONS = ["breakfast", "lunch", "dinner"];

interface RecurringMealManagerProps {
  initialTemplates: RecurringMealTemplate[];
}

function RecurringMealManager({ initialTemplates }: RecurringMealManagerProps) {
  const [templates, setTemplates] =
    useState<RecurringMealTemplate[]>(initialTemplates);
  const [adding, setAdding] = useState(false);
  const [formDay, setFormDay] = useState(0);
  const [formMealType, setFormMealType] = useState("dinner");
  const [formRecipeTitle, setFormRecipeTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const t = await createRecurringMeal({
        day: formDay,
        meal_type: formMealType,
        recipe_title: formRecipeTitle.trim() || undefined,
      });
      setTemplates((prev) => [...prev, t]);
      setAdding(false);
      setFormDay(0);
      setFormMealType("dinner");
      setFormRecipeTitle("");
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to add recurring meal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteId(null);
    try {
      await deleteRecurringMeal(id);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      // Revert optimistic update on failure by reloading
      setError("Failed to delete recurring meal.");
    }
  };

  const handleEditSave = async (id: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateRecurringMeal(id, {
        recipe_title: editTitle,
      });
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        window.location.href = "/api/auth/login";
        return;
      }
      setError("Failed to update recurring meal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {templates.length === 0 && !adding && (
        <EmptyState
          icon="🔁"
          title="No Recurring Meals"
          description="Set up meals that repeat every week on a fixed schedule."
          actionLabel="Add Recurring Meal"
          onAction={() => setAdding(true)}
        />
      )}

      {templates.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {DAY_NAMES[t.day] ?? `Day ${t.day}`} —{" "}
                  <span className="capitalize">{t.meal_type}</span>
                </p>
                {editingId === t.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Recipe title (optional)"
                  />
                ) : (
                  <p className="truncate text-sm text-gray-500">
                    {t.recipe_title ?? "No recipe set"}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {editingId === t.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleEditSave(t.id)}
                      disabled={submitting}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(t.id);
                        setEditTitle(t.recipe_title ?? "");
                      }}
                    >
                      Edit
                    </Button>
                    {confirmDeleteId === t.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDelete(t.id)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(t.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Add Recurring Meal
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Day of week
              </label>
              <select
                value={formDay}
                onChange={(e) => setFormDay(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Meal type
              </label>
              <select
                value={formMealType}
                onChange={(e) => setFormMealType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {MEAL_TYPE_OPTIONS.map((m) => (
                  <option key={m} value={m} className="capitalize">
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Recipe title (optional)
              </label>
              <input
                type="text"
                value={formRecipeTitle}
                onChange={(e) => setFormRecipeTitle(e.target.value)}
                placeholder="e.g. Overnight oats"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleAdd()}
                loading={submitting}
                disabled={submitting}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          + Add Recurring Meal
        </Button>
      )}
    </div>
  );
}

export { RecurringMealManager };
export type { RecurringMealManagerProps };
