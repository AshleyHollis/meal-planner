import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RatingWidget } from "../components/RatingWidget";
import type { MealSlotRating } from "@/types";

// Mock the API module
vi.mock("@/services/api", () => ({
  submitRating: vi.fn(),
  getRating: vi.fn(),
}));

describe("RatingWidget", () => {
  const mockPlanId = "plan-123";
  const mockSlotId = "slot-456";
  const mockOnRated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders star rating interface", () => {
    render(
      <RatingWidget
        planId={mockPlanId}
        slotId={mockSlotId}
        onRated={mockOnRated}
      />,
    );

    expect(screen.getByText("Rate this meal:")).toBeDefined();
    expect(screen.getByLabelText("Rate 1 star")).toBeDefined();
    expect(screen.getByLabelText("Rate 5 stars")).toBeDefined();
    expect(screen.getByText("Submit Rating")).toBeDefined();
  });

  it("displays feedback textarea", () => {
    render(
      <RatingWidget
        planId={mockPlanId}
        slotId={mockSlotId}
        onRated={mockOnRated}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      "What did you think about this meal?",
    );
    expect(textarea).toBeDefined();
  });

  it("allows clicking stars to select rating", () => {
    render(
      <RatingWidget
        planId={mockPlanId}
        slotId={mockSlotId}
        onRated={mockOnRated}
      />,
    );

    const star3Button = screen.getByLabelText("Rate 3 stars");
    fireEvent.click(star3Button);

    // Submit button should be enabled after selecting rating
    const submitButton = screen.getByText("Submit Rating");
    expect(submitButton.hasAttribute("disabled")).toBe(false);
  });

  it("submits rating when form is valid", async () => {
    const { submitRating } = await import("@/services/api");
    const mockRatingResponse: MealSlotRating = {
      id: "rating-789",
      meal_slot_id: mockSlotId,
      rated_by: "user-123",
      rating: 4,
      feedback: "Great meal!",
      created_at: "2025-01-15T10:00:00Z",
    };
    vi.mocked(submitRating).mockResolvedValue(mockRatingResponse);

    render(
      <RatingWidget
        planId={mockPlanId}
        slotId={mockSlotId}
        onRated={mockOnRated}
      />,
    );

    // Select 4 stars
    const star4Button = screen.getByLabelText("Rate 4 stars");
    fireEvent.click(star4Button);

    // Enter feedback
    const textarea = screen.getByPlaceholderText(
      "What did you think about this meal?",
    );
    fireEvent.change(textarea, { target: { value: "Great meal!" } });

    // Submit
    const submitButton = screen.getByText("Submit Rating");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitRating).toHaveBeenCalledWith(mockPlanId, mockSlotId, {
        rating: 4,
        feedback: "Great meal!",
      });
      expect(mockOnRated).toHaveBeenCalledWith(mockRatingResponse);
    });
  });

  it("displays existing rating when provided", () => {
    const existingRating: MealSlotRating = {
      id: "rating-existing",
      meal_slot_id: mockSlotId,
      rated_by: "user-123",
      rating: 5,
      feedback: "Amazing!",
      created_at: "2025-01-15T10:00:00Z",
    };

    render(
      <RatingWidget
        planId={mockPlanId}
        slotId={mockSlotId}
        existingRating={existingRating}
        onRated={mockOnRated}
      />,
    );

    expect(screen.getByText("Your rating:")).toBeDefined();
    expect(screen.getByText("Amazing!")).toBeDefined();
    expect(screen.queryByText("Submit Rating")).toBeNull();
  });

  it("shows error when submitting without rating", () => {
    render(
      <RatingWidget
        planId={mockPlanId}
        slotId={mockSlotId}
        onRated={mockOnRated}
      />,
    );

    const submitButton = screen.getByText("Submit Rating");

    // Button should be disabled without rating
    expect(submitButton.hasAttribute("disabled")).toBe(true);
  });

  it("enforces 500 character limit on feedback", () => {
    render(
      <RatingWidget
        planId={mockPlanId}
        slotId={mockSlotId}
        onRated={mockOnRated}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      "What did you think about this meal?",
    ) as HTMLTextAreaElement;

    // Check maxLength attribute is set
    expect(textarea.getAttribute("maxlength")).toBe("500");

    // Character counter should show
    expect(screen.getByText(/\/500 characters/)).toBeDefined();
  });
});
