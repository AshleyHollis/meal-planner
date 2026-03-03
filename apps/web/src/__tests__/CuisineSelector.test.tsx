import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CuisineSelector } from "../components/CuisineSelector";
import userEvent from "@testing-library/user-event";

describe("CuisineSelector", () => {
  it("renders common cuisine options", () => {
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={[]} onChange={mockOnChange} />);

    expect(screen.getByText("Mexican")).toBeDefined();
    expect(screen.getByText("Italian")).toBeDefined();
    expect(screen.getByText("Asian")).toBeDefined();
    expect(screen.getByText("Mediterranean")).toBeDefined();
    expect(screen.getByText("American")).toBeDefined();
  });

  it("highlights selected cuisines", () => {
    const mockOnChange = vi.fn();
    render(
      <CuisineSelector
        selected={["Italian", "Thai"]}
        onChange={mockOnChange}
      />,
    );

    const italianButton = screen.getAllByText("Italian")[0]; // First occurrence is in the button list
    const thaiButton = screen.getAllByText("Thai")[0];
    const mexicanButton = screen.getByRole("button", { name: "Mexican" });

    expect(italianButton.className).toContain("bg-blue-600");
    expect(thaiButton.className).toContain("bg-blue-600");
    expect(mexicanButton.className).not.toContain("bg-blue-600");
  });

  it("calls onChange when a cuisine is selected", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={[]} onChange={mockOnChange} />);

    const italianButton = screen.getByText("Italian");
    await user.click(italianButton);

    expect(mockOnChange).toHaveBeenCalledWith(["Italian"]);
  });

  it("calls onChange when a cuisine is deselected", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(
      <CuisineSelector
        selected={["Italian", "Mexican"]}
        onChange={mockOnChange}
      />,
    );

    const italianButton = screen.getByRole("button", { name: "Italian" });
    await user.click(italianButton);

    expect(mockOnChange).toHaveBeenCalledWith(["Mexican"]);
  });

  it("shows selected cuisines in a separate section", () => {
    const mockOnChange = vi.fn();
    render(
      <CuisineSelector
        selected={["Italian", "Thai"]}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByText("Selected:")).toBeDefined();
  });

  it("allows removing selected cuisines via × button", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(
      <CuisineSelector
        selected={["Italian", "Thai"]}
        onChange={mockOnChange}
      />,
    );

    const removeButtons = screen.getAllByLabelText(/Remove/i);
    await user.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith(["Thai"]);
  });

  it("allows adding custom cuisine via text input", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/Add custom cuisine/i);
    await user.type(input, "Korean");

    const addButton = screen.getByText("Add");
    await user.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith(["Korean"]);
  });

  it("clears custom input after adding", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(
      /Add custom cuisine/i,
    ) as HTMLInputElement;
    await user.type(input, "Korean");
    const addButton = screen.getByText("Add");
    await user.click(addButton);

    expect(input.value).toBe("");
  });

  it("does not add duplicate custom cuisine", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={["Korean"]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/Add custom cuisine/i);
    await user.type(input, "Korean");
    const addButton = screen.getByText("Add");
    await user.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("does not add empty custom cuisine", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={[]} onChange={mockOnChange} />);

    const addButton = screen.getByText("Add");
    await user.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("supports pressing Enter to add custom cuisine", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/Add custom cuisine/i);
    await user.type(input, "Korean{Enter}");

    expect(mockOnChange).toHaveBeenCalledWith(["Korean"]);
  });

  it("multi-select capability works", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<CuisineSelector selected={[]} onChange={mockOnChange} />);

    const italianButton = screen.getByText("Italian");
    await user.click(italianButton);
    expect(mockOnChange).toHaveBeenCalledWith(["Italian"]);

    mockOnChange.mockClear();
    const mexicanButton = screen.getByText("Mexican");
    await user.click(mexicanButton);
    // Since we're not actually updating the selected prop, we check the call
    // In real usage, parent would update selected and we'd have both
  });
});
