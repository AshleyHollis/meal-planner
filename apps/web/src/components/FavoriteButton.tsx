"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FavoriteButtonProps {
  recipeId: string;
  isFavorited: boolean;
  onToggle?: (recipeId: string, isFavorited: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FavoriteButton({
  recipeId,
  isFavorited: initialFavorited,
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const newFavoritedState = !isFavorited;
    setIsFavorited(newFavoritedState);
    setIsLoading(true);

    try {
      const { addFavorite, removeFavorite } = await import("@/services/api");

      if (newFavoritedState) {
        await addFavorite(recipeId);
      } else {
        await removeFavorite(recipeId);
      }

      if (onToggle) {
        onToggle(recipeId, newFavoritedState);
      }
    } catch (err) {
      setIsFavorited(!newFavoritedState);
      console.error("Failed to toggle favorite:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="group rounded-full p-2 transition-colors hover:bg-gray-100"
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`h-6 w-6 transition-all ${
          isFavorited
            ? "fill-red-500 text-red-500"
            : "fill-none text-gray-400 group-hover:text-red-400"
        }`}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
