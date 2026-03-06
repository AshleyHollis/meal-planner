import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductMappingForm } from "@/components/ProductMappingForm";
import type { Ingredient, Product } from "@/types";

vi.mock("@/services/api", () => ({
  createProduct: vi.fn(),
  searchIngredients: vi.fn(),
  updateProduct: vi.fn(),
}));

const ingredient: Ingredient = {
  id: "ingredient-salt",
  name: "Salt",
  category: "Pantry",
  default_unit: "g",
  default_storage: "pantry",
  typical_shelf_life_days: null,
};

const savedProduct: Product = {
  id: "product-1",
  household_id: "household-1",
  ingredient_id: ingredient.id,
  brand: "Diamond",
  product_name: "Sea Salt Flakes",
  size_desc: "250g",
  price: 3.99,
  shop: "Coles",
  notes: "Fine for finishing",
  ingredient_name: ingredient.name,
  ingredient_category: ingredient.category,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

describe("ProductMappingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets users pick an ingredient and create a product mapping", async () => {
    const { createProduct, searchIngredients } = await import("@/services/api");
    vi.mocked(searchIngredients).mockResolvedValue([ingredient]);
    vi.mocked(createProduct).mockResolvedValue(savedProduct);
    const onSaved = vi.fn();

    render(<ProductMappingForm onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText(/Ingredient/i), {
      target: { value: "Salt" },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(searchIngredients).toHaveBeenCalledWith("Salt", 10);

    fireEvent.click(screen.getByRole("button", { name: /Salt/i }));
    fireEvent.change(screen.getByLabelText(/Brand/i), {
      target: { value: "Diamond" },
    });
    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Sea Salt Flakes" },
    });
    fireEvent.change(screen.getByLabelText(/Size/i), {
      target: { value: "250g" },
    });
    fireEvent.change(screen.getByLabelText(/Price/i), {
      target: { value: "3.99" },
    });
    fireEvent.change(screen.getByLabelText(/Shop/i), {
      target: { value: "Coles" },
    });
    fireEvent.change(screen.getByLabelText(/Notes/i), {
      target: { value: "Fine for finishing" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(createProduct).toHaveBeenCalledWith({
      ingredient_id: ingredient.id,
      brand: "Diamond",
      product_name: "Sea Salt Flakes",
      size_desc: "250g",
      price: 3.99,
      shop: "Coles",
      notes: "Fine for finishing",
    });
    expect(onSaved).toHaveBeenCalledWith(savedProduct);
  });

  it("requires an ingredient selection before saving a new mapping", async () => {
    const { createProduct } = await import("@/services/api");

    render(<ProductMappingForm />);

    fireEvent.change(screen.getByLabelText(/Brand/i), {
      target: { value: "Diamond" },
    });
    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Sea Salt Flakes" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(createProduct).not.toHaveBeenCalled();
    expect(
      screen.getByText("Select an ingredient before saving"),
    ).toBeDefined();
  });
});
