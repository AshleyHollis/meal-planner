import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GroceryList } from "@/components/grocery/GroceryList";
import type { GroceryList as GroceryListType } from "@/types";

vi.mock("@/services/api", () => ({
  checkGroceryItem: vi.fn(),
  completeShopping: vi.fn(),
  createProduct: vi.fn(),
  searchIngredients: vi.fn(),
  updateProduct: vi.fn(),
}));

const groceryList: GroceryListType = {
  id: "grocery-list-1",
  meal_plan_id: "meal-plan-1",
  created_at: "2026-03-01T00:00:00Z",
  items: [
    {
      id: "item-1",
      ingredient_id: "ingredient-1",
      ingredient_name: "Salt",
      ingredient_category: "Pantry",
      quantity_needed: 1,
      unit: "units",
      is_checked: false,
      preferred_store: "Coles",
      product: {
        id: "product-1",
        brand: "Diamond",
        product_name: "Sea Salt",
        size_desc: "250g",
        price: 3.99,
        shop: "Coles",
      },
    },
    {
      id: "item-2",
      ingredient_id: "ingredient-2",
      ingredient_name: "Pepper",
      ingredient_category: "Pantry",
      quantity_needed: 2,
      unit: "units",
      is_checked: false,
      preferred_store: "Coles",
      product: {
        id: "product-2",
        brand: "MasterFoods",
        product_name: "Black Pepper",
        size_desc: "100g",
        price: 4.49,
        shop: "Coles",
      },
    },
    {
      id: "item-3",
      ingredient_id: "ingredient-3",
      ingredient_name: "Bananas",
      ingredient_category: "Produce",
      quantity_needed: 3,
      unit: "units",
      is_checked: false,
      preferred_store: null,
      product: null,
    },
  ],
};

describe("GroceryList", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "true");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("routes trip completion through the inventory dialog before submitting", async () => {
    const { checkGroceryItem, completeShopping } = await import("@/services/api");
    vi.mocked(completeShopping).mockResolvedValue([]);
    const onChanged = vi.fn();
    const { container } = render(
      <GroceryList groceryList={groceryList} onChanged={onChanged} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Coles/i }));

    const tripPanel = container.querySelector(".bg-blue-50");
    expect(tripPanel).not.toBeNull();

    const tripCheckbox = within(tripPanel as HTMLElement).getAllByRole(
      "checkbox",
    )[0];
    fireEvent.click(tripCheckbox);

    fireEvent.click(
      within(tripPanel as HTMLElement).getByRole("button", {
        name: "Complete Trip",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Complete Shopping")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add to Inventory" }));

    await waitFor(() => {
      expect(completeShopping).toHaveBeenCalledWith("grocery-list-1", {
        purchased_items: [
          {
            ingredient_id: "ingredient-1",
            quantity: 1,
            unit: "units",
          },
        ],
      });
      expect(checkGroceryItem).not.toHaveBeenCalled();
      expect(onChanged).toHaveBeenCalledTimes(1);
      expect(localStorage.length).toBe(0);
    });
  });

  it("supports trip tracking for Other / Any Store items", async () => {
    const { completeShopping } = await import("@/services/api");
    vi.mocked(completeShopping).mockResolvedValue([]);
    const onChanged = vi.fn();
    const { container } = render(
      <GroceryList groceryList={groceryList} onChanged={onChanged} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Other \/ Any Store/i }),
    );

    const tripPanel = container.querySelector(".bg-blue-50");
    expect(tripPanel).not.toBeNull();
    expect(
      within(tripPanel as HTMLElement).getByText(
        "Shopping trip · Other / Any Store",
      ),
    ).toBeDefined();

    const tripCheckbox = within(tripPanel as HTMLElement).getAllByRole(
      "checkbox",
    )[0];
    fireEvent.click(tripCheckbox);

    expect(
      localStorage.getItem("shopping-trip-grocery-list-1-__other__"),
    ).not.toBeNull();

    fireEvent.click(
      within(tripPanel as HTMLElement).getByRole("button", {
        name: "Complete Trip",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Complete Shopping")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add to Inventory" }));

    await waitFor(() => {
      expect(completeShopping).toHaveBeenCalledWith("grocery-list-1", {
        purchased_items: [
          {
            ingredient_id: "ingredient-3",
            quantity: 3,
            unit: "units",
          },
        ],
      });
      expect(onChanged).toHaveBeenCalledTimes(1);
      expect(localStorage.length).toBe(0);
    });
  });
});
