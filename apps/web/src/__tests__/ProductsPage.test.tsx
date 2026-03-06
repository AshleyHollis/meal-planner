import { render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProductsPage from "@/app/products/page";
import type { Product } from "@/types";

const mockShowToast = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ProductMappingForm", () => ({
  ProductMappingForm: () => <div data-testid="product-mapping-form" />,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock("@/services/api", () => {
  class ApiError extends Error {
    status: number;
    isAuthError: boolean;

    constructor(status: number, message = "API error") {
      super(message);
      this.status = status;
      this.isAuthError = status === 401 || status === 403;
    }
  }

  return {
    ApiError,
    deleteProduct: vi.fn(),
    getProducts: vi.fn(),
    searchProducts: vi.fn(),
  };
});

const products: Product[] = [
  {
    id: "product-1",
    household_id: "household-1",
    ingredient_id: "ingredient-1",
    brand: "Diamond",
    product_name: "Sea Salt Flakes",
    size_desc: "250g",
    price: 3.99,
    shop: "Coles",
    notes: null,
    ingredient_name: "Salt",
    ingredient_category: "pantry",
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "product-2",
    household_id: "household-1",
    ingredient_id: "ingredient-2",
    brand: "MasterFoods",
    product_name: "Black Pepper",
    size_desc: "100g",
    price: 4.49,
    shop: "Coles",
    notes: null,
    ingredient_name: "Pepper",
    ingredient_category: "pantry",
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "product-3",
    household_id: "household-1",
    ingredient_id: "ingredient-3",
    brand: "Ingham's",
    product_name: "Chicken Breast 1kg",
    size_desc: "1kg",
    price: 12.99,
    shop: "Woolworths",
    notes: null,
    ingredient_name: "Chicken Breast",
    ingredient_category: "meat",
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

describe("ProductsPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { getProducts, searchProducts } = await import("@/services/api");
    vi.mocked(getProducts).mockResolvedValue(products);
    vi.mocked(searchProducts).mockResolvedValue(products);
  });

  it("groups products by ingredient category instead of ingredient name", async () => {
    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText("Diamond · Sea Salt Flakes")).toBeDefined();
    });

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Meat", "Pantry"]);
    expect(screen.queryByRole("heading", { name: "Salt" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Pepper" })).toBeNull();

    const pantrySection = screen
      .getByRole("heading", { name: "Pantry" })
      .closest("section");
    expect(pantrySection).not.toBeNull();
    expect(
      within(pantrySection as HTMLElement).getByText("Diamond · Sea Salt Flakes"),
    ).toBeDefined();
    expect(
      within(pantrySection as HTMLElement).getByText("MasterFoods · Black Pepper"),
    ).toBeDefined();
  });
});
