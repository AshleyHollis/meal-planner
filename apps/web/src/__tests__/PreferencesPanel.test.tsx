import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PreferencesPanel } from "../components/preferences/PreferencesPanel";
import * as api from "../services/api";
import type { MemberPreference } from "../types";

// Mock the API module
vi.mock("../services/api", () => ({
  getPreferences: vi.fn(),
  addPreference: vi.fn(),
  deletePreference: vi.fn(),
  getDietaryTypes: vi.fn(),
}));

const mockPreferences: MemberPreference[] = [
  {
    id: "pref-1",
    household_member_id: "member-1",
    preference_type: "allergy",
    value: "Peanuts",
    ingredient_id: null,
    notes: "Severe allergy",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "pref-2",
    household_member_id: "member-1",
    preference_type: "dietary_restriction",
    value: "Vegetarian",
    ingredient_id: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "pref-3",
    household_member_id: "member-1",
    preference_type: "dislike",
    value: "Mushrooms",
    ingredient_id: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "pref-4",
    household_member_id: "member-1",
    preference_type: "like",
    value: "Chicken",
    ingredient_id: null,
    notes: "Especially grilled",
    created_at: "2024-01-01T00:00:00Z",
  },
];

describe("PreferencesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getDietaryTypes).mockResolvedValue([
      "Vegetarian",
      "Vegan",
      "Gluten-Free",
    ]);
  });

  it("renders loading state initially", () => {
    vi.mocked(api.getPreferences).mockImplementation(
      () => new Promise(() => {}),
    );
    render(<PreferencesPanel memberId="member-1" />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
  });

  it("renders preferences grouped by type", async () => {
    vi.mocked(api.getPreferences).mockResolvedValue(mockPreferences);

    render(<PreferencesPanel memberId="member-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dietary Restrictions")).toBeDefined();
      expect(screen.getByText("Allergies")).toBeDefined();
      expect(screen.getByText("Dislikes")).toBeDefined();
      expect(screen.getByText("Likes")).toBeDefined();
    });

    expect(screen.getByText("Peanuts")).toBeDefined();
    expect(screen.getByText("Severe allergy")).toBeDefined();
    expect(screen.getAllByText("Vegetarian").length).toBeGreaterThan(0);
    expect(screen.getByText("Mushrooms")).toBeDefined();
    expect(screen.getByText("Chicken")).toBeDefined();
    expect(screen.getByText("Especially grilled")).toBeDefined();
  });

  it("renders empty state when no preferences exist", async () => {
    vi.mocked(api.getPreferences).mockResolvedValue([]);

    render(<PreferencesPanel memberId="member-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("No dietary restrictions added yet"),
      ).toBeDefined();
      expect(screen.getByText("No allergies added yet")).toBeDefined();
      expect(screen.getByText("No dislikes added yet")).toBeDefined();
      expect(screen.getByText("No likes added yet")).toBeDefined();
    });
  });

  it("adds a preference when form is submitted", async () => {
    vi.mocked(api.getPreferences).mockResolvedValueOnce([]);
    const newPreference: MemberPreference = {
      id: "pref-new",
      household_member_id: "member-1",
      preference_type: "allergy",
      value: "Shellfish",
      ingredient_id: null,
      notes: "Mild allergy",
      created_at: "2024-01-02T00:00:00Z",
    };
    vi.mocked(api.addPreference).mockResolvedValue(newPreference);
    vi.mocked(api.getPreferences).mockResolvedValueOnce([newPreference]);

    render(<PreferencesPanel memberId="member-1" />);

    await waitFor(() => {
      expect(screen.getByText("No allergies added yet")).toBeDefined();
    });

    // Select allergy type
    const typeSelect = screen.getByLabelText("Type");
    fireEvent.change(typeSelect, { target: { value: "allergy" } });

    // Fill in value
    const valueInput = screen.getByLabelText("Value");
    fireEvent.change(valueInput, { target: { value: "Shellfish" } });

    // Fill in notes
    const notesInput = screen.getByLabelText("Notes (optional)");
    fireEvent.change(notesInput, { target: { value: "Mild allergy" } });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /add preference/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.addPreference).toHaveBeenCalledWith("member-1", {
        preference_type: "allergy",
        value: "Shellfish",
        notes: "Mild allergy",
      });
    });

    // Verify the new preference is displayed
    await waitFor(() => {
      expect(screen.getByText("Shellfish")).toBeDefined();
    });
  });

  it("deletes a preference when delete button is clicked", async () => {
    vi.mocked(api.getPreferences).mockResolvedValueOnce(mockPreferences);
    vi.mocked(api.deletePreference).mockResolvedValue(undefined);
    const filteredPreferences = mockPreferences.filter(
      (p) => p.id !== "pref-1",
    );
    vi.mocked(api.getPreferences).mockResolvedValueOnce(filteredPreferences);

    render(<PreferencesPanel memberId="member-1" />);

    await waitFor(() => {
      expect(screen.queryByText("Peanuts")).toBeDefined();
    });

    // Find and click delete button for Peanuts
    const deleteButton = screen.getByLabelText("Delete Peanuts");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deletePreference).toHaveBeenCalledWith("member-1", "pref-1");
    });

    // Verify getPreferences was called again to refresh the list
    expect(api.getPreferences).toHaveBeenCalledTimes(2);
  });

  it("shows dietary restriction dropdown for dietary_restriction type", async () => {
    vi.mocked(api.getPreferences).mockResolvedValue([]);

    render(<PreferencesPanel memberId="member-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText("Type")).toBeDefined();
    });

    // Dietary restriction should be selected by default
    const typeSelect = screen.getByLabelText("Type") as HTMLSelectElement;
    expect(typeSelect.value).toBe("dietary_restriction");

    // Should show dietary restriction dropdown
    await waitFor(() => {
      expect(screen.getByLabelText("Dietary Restriction")).toBeDefined();
    });

    const dietarySelect = screen.getByLabelText(
      "Dietary Restriction",
    ) as HTMLSelectElement;
    expect(dietarySelect.tagName).toBe("SELECT");
    expect(screen.getAllByText("Vegetarian").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vegan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gluten-Free").length).toBeGreaterThan(0);
  });

  it("shows text input for non-dietary restriction types", async () => {
    vi.mocked(api.getPreferences).mockResolvedValue([]);

    render(<PreferencesPanel memberId="member-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText("Type")).toBeDefined();
    });

    // Change to allergy type
    const typeSelect = screen.getByLabelText("Type");
    fireEvent.change(typeSelect, { target: { value: "allergy" } });

    // Should show text input instead of dropdown
    await waitFor(() => {
      const valueInput = screen.getByLabelText("Value");
      expect(valueInput.tagName).toBe("INPUT");
      expect(valueInput.getAttribute("placeholder")).toBe("e.g., Peanuts");
    });
  });

  it("validates that value is required", async () => {
    vi.mocked(api.getPreferences).mockResolvedValue([]);

    render(<PreferencesPanel memberId="member-1" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add preference/i }),
      ).toBeDefined();
    });

    // Try to submit without entering a value
    const submitButton = screen.getByRole("button", {
      name: /add preference/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please enter a value")).toBeDefined();
    });

    // API should not have been called
    expect(api.addPreference).not.toHaveBeenCalled();
  });
});
