"use client";

import { useState, useEffect } from "react";
import type { MealSlotRating, CreateMealSlotRating } from "@/types";
import { Button } from "./ui/Button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RatingWidgetProps {
  planId: string;
  slotId: string;
  existingRating?: MealSlotRating | null;
  onRated?: (rating: MealSlotRating) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RatingWidget({
  planId,
  slotId,
  existingRating,
  onRated,
}: RatingWidgetProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [submitted, setSubmitted] = useState<MealSlotRating | null>(
    existingRating || null,
  );

  useEffect(() => {
    if (existingRating) {
      setSubmitted(existingRating);
      setRating(existingRating.rating);
      setFeedback(existingRating.feedback || "");
    }
  }, [existingRating]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { submitRating } = await import("@/services/api");
      const data: CreateMealSlotRating = {
        rating,
        feedback: feedback.trim() || null,
      };
      const result = await submitRating(planId, slotId, data);
      setSubmitted(result);
      if (onRated) {
        onRated(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-700">Your rating:</p>
        <div className="mt-1 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-2xl ${
                star <= submitted.rating ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              ★
            </span>
          ))}
        </div>
        {submitted.feedback && (
          <p className="mt-2 text-sm text-gray-600">{submitted.feedback}</p>
        )}
      </div>
    );
  }

  const displayRating = hoveredRating || rating;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-700">Rate this meal:</p>

      {/* Stars */}
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={isSubmitting}
            className={`cursor-pointer text-3xl transition-colors hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50`}
            onClick={() => setRating(star)}
            onMouseEnter={() => !isSubmitting && setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <span
              className={
                star <= displayRating ? "text-yellow-400" : "text-gray-300"
              }
            >
              ★
            </span>
          </button>
        ))}
        {isSubmitting && (
          <span className="ml-2 text-xs text-gray-400 animate-pulse">Saving…</span>
        )}
      </div>

      {/* Feedback textarea */}
      <div className="mt-3">
        <label
          htmlFor={`feedback-${slotId}`}
          className="block text-sm text-gray-600"
        >
          Feedback (optional):
        </label>
        <textarea
          id={`feedback-${slotId}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="What did you think about this meal?"
        />
        <p className="mt-1 text-xs text-gray-500">
          {feedback.length}/500 characters
        </p>
      </div>

      {/* Error message */}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Submit button */}
      <div className="mt-3">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          variant="primary"
          size="sm"
        >
          {isSubmitting ? "Submitting..." : "Submit Rating"}
        </Button>
      </div>
    </div>
  );
}
