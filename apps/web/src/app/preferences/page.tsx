"use client";

import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";

// In a real implementation, this would fetch the current user's member ID
// For now, we use a placeholder that will be replaced by backend context
const CURRENT_MEMBER_ID = "current";

export default function PreferencesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">
          Food Preferences
        </h1>
        <p className="mt-1 text-sm text-gray-500 lg:text-base">
          Manage your dietary restrictions, allergies, likes, and dislikes
        </p>
      </div>

      <PreferencesPanel memberId={CURRENT_MEMBER_ID} />
    </main>
  );
}
