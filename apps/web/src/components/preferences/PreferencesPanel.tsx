"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemberPreference, PreferenceType } from "@/types";
import {
  getPreferences,
  addPreference,
  deletePreference,
  getDietaryTypes,
} from "@/services/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";

interface PreferencesPanelProps {
  memberId: string;
}

type BadgeVariantMap = {
  dietary_restriction: "info";
  allergy: "error";
  dislike: "warning";
  like: "success";
};

const PREFERENCE_TYPE_LABELS: Record<PreferenceType, string> = {
  dietary_restriction: "Dietary Restrictions",
  allergy: "Allergies",
  dislike: "Dislikes",
  like: "Likes",
};

const BADGE_VARIANTS: BadgeVariantMap = {
  dietary_restriction: "info",
  allergy: "error",
  dislike: "warning",
  like: "success",
};

function PreferencesPanel({ memberId }: PreferencesPanelProps) {
  const [preferences, setPreferences] = useState<MemberPreference[]>([]);
  const [dietaryTypes, setDietaryTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [selectedType, setSelectedType] = useState<PreferenceType>(
    "dietary_restriction",
  );
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const data = await getPreferences(memberId);
      setPreferences(data);
      setError(null);
    } catch {
      setError("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  const loadDietaryTypes = useCallback(async () => {
    try {
      const types = await getDietaryTypes();
      setDietaryTypes(types);
    } catch {
      // Fail silently, dietary types are optional
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
    void loadDietaryTypes();
  }, [loadPreferences, loadDietaryTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!value.trim()) {
      setFormError("Please enter a value");
      return;
    }

    setSubmitting(true);
    try {
      await addPreference(memberId, {
        preference_type: selectedType,
        value: value.trim(),
        notes: notes.trim() || null,
      });
      setValue("");
      setNotes("");
      await loadPreferences();
    } catch {
      setFormError("Failed to add preference");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (preferenceId: string) => {
    try {
      await deletePreference(memberId, preferenceId);
      setConfirmDeleteId(null);
      await loadPreferences();
    } catch {
      setError("Failed to delete preference");
    }
  };

  // Group preferences by type
  const groupedPreferences = preferences.reduce(
    (acc, pref) => {
      if (!acc[pref.preference_type]) {
        acc[pref.preference_type] = [];
      }
      acc[pref.preference_type].push(pref);
      return acc;
    },
    {} as Record<PreferenceType, MemberPreference[]>,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <button
            onClick={() => void loadPreferences()}
            className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Add Preference Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Add Preference
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="preference-type"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Type
            </label>
            <select
              id="preference-type"
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value as PreferenceType)
              }
              className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <option value="dietary_restriction">Dietary Restriction</option>
              <option value="allergy">Allergy</option>
              <option value="dislike">Dislike</option>
              <option value="like">Like</option>
            </select>
          </div>

          {selectedType === "dietary_restriction" && dietaryTypes.length > 0 ? (
            <div>
              <label
                htmlFor="dietary-value"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Dietary Restriction
              </label>
              <select
                id="dietary-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <option value="">Select a dietary restriction</option>
                {dietaryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              label="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                selectedType === "allergy"
                  ? "e.g., Peanuts"
                  : selectedType === "dislike"
                    ? "e.g., Mushrooms"
                    : "e.g., Chicken"
              }
            />
          )}

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes"
          />

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <Button type="submit" loading={submitting} className="w-full">
            Add Preference
          </Button>
        </form>
      </div>

      {/* Preferences List */}
      <div className="space-y-6">
        {(["dietary_restriction", "allergy", "dislike", "like"] as const).map(
          (type) => {
            const items = groupedPreferences[type] || [];
            return (
              <div key={type}>
                <h3 className="mb-3 text-base font-semibold text-gray-900">
                  {PREFERENCE_TYPE_LABELS[type]}
                </h3>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No {PREFERENCE_TYPE_LABELS[type].toLowerCase()} added yet
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((pref) => (
                      <li
                        key={pref.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={BADGE_VARIANTS[type]}>
                              {type.replace("_", " ")}
                            </Badge>
                            <span className="font-medium text-gray-900">
                              {pref.value}
                            </span>
                          </div>
                          {pref.notes && (
                            <p className="mt-1 text-sm text-gray-600">
                              {pref.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {confirmDeleteId === pref.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleDelete(pref.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDeleteId(pref.id)}
                              aria-label={`Delete ${pref.value}`}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

export { PreferencesPanel };
export type { PreferencesPanelProps };
