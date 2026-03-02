"use client";

import { useEffect, useState } from "react";

import type { DefrostReminder } from "@/types";
import { getDefrostReminders } from "@/services/api";
import { Badge } from "../ui/Badge";

function DefrostReminders() {
  const [reminders, setReminders] = useState<DefrostReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReminders = async () => {
      setLoading(true);
      try {
        const data = await getDefrostReminders(7);
        setReminders(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    void fetchReminders();
  }, []);

  if (loading) {
    return <p className="py-4 text-center text-gray-500">Loading...</p>;
  }

  if (reminders.length === 0) {
    return (
      <p className="py-4 text-center text-gray-500">
        No defrost reminders for the next 7 days.
      </p>
    );
  }

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <span>❄️</span>
        <span>Defrost Reminders</span>
      </h3>
      <ul className="divide-y divide-gray-200 rounded-lg border border-yellow-300 bg-yellow-50">
        {reminders.map((reminder, idx) => (
          <li key={idx} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {reminder.ingredient_name}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  For: <span className="font-medium">{reminder.recipe_title}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Day {reminder.meal_day} • {reminder.meal_type}
                </p>
              </div>

              <Badge variant="warning">
                Defrost {reminder.defrost_hours}h before
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { DefrostReminders };
