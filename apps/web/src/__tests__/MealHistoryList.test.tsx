import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MealHistoryList } from "../components/MealHistoryList";
import type { MealHistoryItem } from "@/types";
import userEvent from "@testing-library/user-event";

describe("MealHistoryList", () => {
  const mockItems: MealHistoryItem[] = [
    {
      slot_id: "s1",
      recipe_id: "r1",
      recipe_title: "Chicken Tacos",
      cooked_at: "2025-01-15T18:30:00Z",
      day: 2,
      meal_type: "dinner",
      rating: 5,
      cuisine_type: "Mexican",
    },
    {
      slot_id: "s2",
      recipe_id: "r2",
      recipe_title: "Pasta Carbonara",
      cooked_at: "2025-01-14T19:00:00Z",
      day: 1,
      meal_type: "dinner",
      rating: null,
      cuisine_type: "Italian",
    },
    {
      slot_id: "s3",
      recipe_id: "r3",
      recipe_title: "Simple Soup",
      cooked_at: "2025-01-13T12:00:00Z",
      day: 0,
      meal_type: "lunch",
      rating: 3,
      cuisine_type: null,
    },
  ];

  it("renders empty state when no items", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={[]}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(
      screen.getByText(/No meal history yet/i),
    ).toBeDefined();
  });

  it("renders list of meal history items", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(screen.getByText("Chicken Tacos")).toBeDefined();
    expect(screen.getByText("Pasta Carbonara")).toBeDefined();
    expect(screen.getByText("Simple Soup")).toBeDefined();
  });

  it("displays meal type and date for each item", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    const dinnerElements = screen.getAllByText(/dinner/i);
    const lunchElements = screen.getAllByText(/lunch/i);
    expect(dinnerElements.length).toBeGreaterThan(0);
    expect(lunchElements.length).toBeGreaterThan(0);
  });

  it("displays cuisine type badges", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(screen.getByText("Mexican")).toBeDefined();
    expect(screen.getByText("Italian")).toBeDefined();
  });

  it("displays star rating badges", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    const starBadges = screen.getAllByText(/★/);
    expect(starBadges.length).toBeGreaterThan(0);
  });

  it("shows Load More button when hasMore is true", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(screen.getByText("Load More")).toBeDefined();
  });

  it("hides Load More button when hasMore is false", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(screen.queryByText("Load More")).toBeNull();
  });

  it("calls onLoadMore when Load More button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />,
    );

    const loadMoreButton = screen.getByText("Load More");
    await user.click(loadMoreButton);

    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  it("disables Load More button when loading", () => {
    const mockOnLoadMore = vi.fn();
    render(
      <MealHistoryList
        items={mockItems}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        loading={true}
      />,
    );

    const loadMoreButton = screen.getByText("Load More");
    expect(loadMoreButton.hasAttribute("disabled")).toBe(true);
  });
});
