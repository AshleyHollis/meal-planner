import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FavoriteButton } from "../components/FavoriteButton";

// Mock the API module
vi.mock("@/services/api", () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

describe("FavoriteButton", () => {
  const mockRecipeId = "recipe-123";
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with unfavorited state", () => {
    render(
      <FavoriteButton
        recipeId={mockRecipeId}
        isFavorited={false}
        onToggle={mockOnToggle}
      />,
    );

    const button = screen.getByLabelText("Add to favorites");
    expect(button).toBeDefined();
  });

  it("renders with favorited state", () => {
    render(
      <FavoriteButton
        recipeId={mockRecipeId}
        isFavorited={true}
        onToggle={mockOnToggle}
      />,
    );

    const button = screen.getByLabelText("Remove from favorites");
    expect(button).toBeDefined();
  });

  it("calls addFavorite when clicking unfavorited button", async () => {
    const { addFavorite } = await import("@/services/api");
    vi.mocked(addFavorite).mockResolvedValue({
      id: "fav-123",
      recipe_id: mockRecipeId,
      recipe_title: "Test Recipe",
      created_at: "2025-01-15T10:00:00Z",
    });

    render(
      <FavoriteButton
        recipeId={mockRecipeId}
        isFavorited={false}
        onToggle={mockOnToggle}
      />,
    );

    const button = screen.getByLabelText("Add to favorites");
    fireEvent.click(button);

    await waitFor(() => {
      expect(addFavorite).toHaveBeenCalledWith(mockRecipeId);
      expect(mockOnToggle).toHaveBeenCalledWith(mockRecipeId, true);
    });
  });

  it("calls removeFavorite when clicking favorited button", async () => {
    const { removeFavorite } = await import("@/services/api");
    vi.mocked(removeFavorite).mockResolvedValue(undefined);

    render(
      <FavoriteButton
        recipeId={mockRecipeId}
        isFavorited={true}
        onToggle={mockOnToggle}
      />,
    );

    const button = screen.getByLabelText("Remove from favorites");
    fireEvent.click(button);

    await waitFor(() => {
      expect(removeFavorite).toHaveBeenCalledWith(mockRecipeId);
      expect(mockOnToggle).toHaveBeenCalledWith(mockRecipeId, false);
    });
  });

  it("toggles state optimistically", () => {
    render(
      <FavoriteButton
        recipeId={mockRecipeId}
        isFavorited={false}
        onToggle={mockOnToggle}
      />,
    );

    const button = screen.getByLabelText("Add to favorites");
    fireEvent.click(button);

    // Should immediately show favorited state
    expect(screen.getByLabelText("Remove from favorites")).toBeDefined();
  });

  it("reverts state on error", async () => {
    const { addFavorite } = await import("@/services/api");
    vi.mocked(addFavorite).mockRejectedValue(new Error("API Error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <FavoriteButton
        recipeId={mockRecipeId}
        isFavorited={false}
        onToggle={mockOnToggle}
      />,
    );

    const button = screen.getByLabelText("Add to favorites");
    fireEvent.click(button);

    // Initially shows favorited (optimistic)
    expect(screen.getByLabelText("Remove from favorites")).toBeDefined();

    // Should revert after error
    await waitFor(() => {
      expect(screen.getByLabelText("Add to favorites")).toBeDefined();
    });

    consoleSpy.mockRestore();
  });

  it("stops event propagation when clicked", () => {
    const parentClickHandler = vi.fn();

    const { container } = render(
      <div onClick={parentClickHandler}>
        <FavoriteButton
          recipeId={mockRecipeId}
          isFavorited={false}
          onToggle={mockOnToggle}
        />
      </div>,
    );

    const button = screen.getByLabelText("Add to favorites");
    fireEvent.click(button);

    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});
