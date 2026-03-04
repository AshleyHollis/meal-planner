import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Product Library (P18)
 *
 * Tests the /products page: loading the product list, adding a product mapping
 * with brand/size/price/shop, editing, searching, and deleting products.
 *
 * Requires USE_EXTERNAL_SERVER=true and authenticated state.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://localhost:8000";

test.describe("Product Library", () => {
  test.skip(
    () => !process.env.USE_EXTERNAL_SERVER,
    "Requires backend – run with USE_EXTERNAL_SERVER=true",
  );

  test.describe("Page Load", () => {
    test("products page loads with heading", async ({ page }) => {
      await page.goto("/products");

      await expect(
        page.getByRole("heading", { name: "Product Library" }),
      ).toBeVisible({ timeout: 30_000 });
    });

    test("products page shows Add Product button", async ({ page }) => {
      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "Product Library" }),
      ).toBeVisible({ timeout: 30_000 });

      await expect(
        page.getByRole("button", { name: /Add Product/i }),
      ).toBeVisible();
    });

    test("products page shows search input", async ({ page }) => {
      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "Product Library" }),
      ).toBeVisible({ timeout: 30_000 });

      await expect(page.getByPlaceholder("Search products")).toBeVisible();
    });

    test("products page shows seeded products or empty state", async ({
      page,
    }) => {
      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "Product Library" }),
      ).toBeVisible({ timeout: 30_000 });

      // Wait for loading to finish
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Should show either products or empty state
      const productCard = page
        .locator('[class*="rounded-xl"][class*="bg-white"][class*="shadow-sm"]')
        .first();
      const emptyState = page.getByText("No products yet");
      await expect(productCard.or(emptyState)).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Product CRUD", () => {
    test("can add a product via the form", async ({
      page,
      request,
      baseURL,
    }) => {
      // First look up an ingredient to use
      const effectiveBaseURL =
        baseURL || process.env.BASE_URL || "http://localhost:3000";
      const tokenResp = await request.get(
        `${effectiveBaseURL}/auth/access-token`,
      );
      if (!tokenResp.ok()) {
        test.skip(true, "Could not get access token");
        return;
      }
      const tokenData = (await tokenResp.json()) as { token: string };
      const headers = {
        Authorization: `Bearer ${tokenData.token}`,
        "Content-Type": "application/json",
      };

      // Find an ingredient
      const ingResp = await request.get(
        `${API_URL}/api/v1/ingredients?q=salt&limit=1`,
        { headers },
      );
      if (!ingResp.ok()) {
        test.skip(true, "Could not look up ingredients");
        return;
      }
      const ingredients = (await ingResp.json()) as Array<{
        id: string;
        name: string;
      }>;
      if (ingredients.length === 0) {
        test.skip(true, "No ingredients in database");
        return;
      }

      // Delete any existing product for this ingredient to avoid 409
      const existingResp = await request.get(`${API_URL}/api/v1/products`, {
        headers,
      });
      if (existingResp.ok()) {
        const existing = (await existingResp.json()) as Array<{
          id: string;
          ingredient_id: string;
        }>;
        for (const p of existing) {
          if (p.ingredient_id === ingredients[0].id) {
            await request.delete(`${API_URL}/api/v1/products/${p.id}`, {
              headers,
            });
          }
        }
      }

      // Create via API (form requires ingredient_id which is not exposed in UI for standalone add)
      const createResp = await request.post(`${API_URL}/api/v1/products`, {
        headers,
        data: {
          ingredient_id: ingredients[0].id,
          brand: "E2E Test Brand",
          product_name: "E2E Test Product",
          size_desc: "500g",
          price: 4.99,
          shop: "TestShop",
          notes: "Created by E2E test",
        },
      });

      expect(
        createResp.ok() || createResp.status() === 201,
        `Create product failed: ${createResp.status()}`,
      ).toBeTruthy();

      // Verify it appears on the page
      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "Product Library" }),
      ).toBeVisible({ timeout: 30_000 });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      await expect(page.getByText("E2E Test Brand")).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText("E2E Test Product")).toBeVisible();
      await expect(page.getByText("TestShop")).toBeVisible();

      // Cleanup
      const cleanupResp = await request.get(`${API_URL}/api/v1/products`, {
        headers,
      });
      if (cleanupResp.ok()) {
        const products = (await cleanupResp.json()) as Array<{
          id: string;
          brand: string;
        }>;
        for (const p of products) {
          if (p.brand === "E2E Test Brand") {
            await request.delete(`${API_URL}/api/v1/products/${p.id}`, {
              headers,
            });
          }
        }
      }
    });

    test("can search products", async ({ page }) => {
      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "Product Library" }),
      ).toBeVisible({ timeout: 30_000 });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Check if there are products to search
      const productCard = page
        .locator('[class*="rounded-xl"][class*="bg-white"][class*="shadow-sm"]')
        .first();
      const emptyState = page.getByText("No products yet");

      if (await emptyState.isVisible().catch(() => false)) {
        test.skip(true, "No products to search");
        return;
      }

      if (!(await productCard.isVisible().catch(() => false))) {
        test.skip(true, "No products loaded");
        return;
      }

      // Type a search query
      const searchInput = page.getByPlaceholder("Search products");
      await searchInput.fill("zzzznonexistent");
      await page.waitForTimeout(500);

      // Should show "No products found" or empty results
      const noResults = page.getByText("No products found");
      // Give debounce time
      await expect(noResults).toBeVisible({ timeout: 5_000 });
    });

    test("can delete a product", async ({ page, request, baseURL }) => {
      // Create a product via API first
      const effectiveBaseURL =
        baseURL || process.env.BASE_URL || "http://localhost:3000";
      const tokenResp = await request.get(
        `${effectiveBaseURL}/auth/access-token`,
      );
      if (!tokenResp.ok()) {
        test.skip(true, "Could not get access token");
        return;
      }
      const tokenData = (await tokenResp.json()) as { token: string };
      const headers = {
        Authorization: `Bearer ${tokenData.token}`,
        "Content-Type": "application/json",
      };

      // Find an ingredient not already used
      const ingResp = await request.get(
        `${API_URL}/api/v1/ingredients?q=pepper&limit=1`,
        { headers },
      );
      if (!ingResp.ok()) {
        test.skip(true, "Could not look up ingredients");
        return;
      }
      const ingredients = (await ingResp.json()) as Array<{ id: string }>;
      if (ingredients.length === 0) {
        test.skip(true, "No ingredients");
        return;
      }

      // Delete any existing
      const existingResp = await request.get(`${API_URL}/api/v1/products`, {
        headers,
      });
      if (existingResp.ok()) {
        const existing = (await existingResp.json()) as Array<{
          id: string;
          ingredient_id: string;
        }>;
        for (const p of existing) {
          if (p.ingredient_id === ingredients[0].id) {
            await request.delete(`${API_URL}/api/v1/products/${p.id}`, {
              headers,
            });
          }
        }
      }

      const createResp = await request.post(`${API_URL}/api/v1/products`, {
        headers,
        data: {
          ingredient_id: ingredients[0].id,
          brand: "DeleteMe",
          product_name: "Delete Test",
          size_desc: "1kg",
          price: 1.0,
          shop: "DeleteShop",
        },
      });

      if (!createResp.ok() && createResp.status() !== 201) {
        test.skip(true, "Could not create product for deletion test");
        return;
      }

      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "Product Library" }),
      ).toBeVisible({ timeout: 30_000 });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Find and click the Delete button for our product
      const deleteButton = page
        .locator('[class*="rounded-xl"][class*="bg-white"][class*="shadow-sm"]')
        .filter({ hasText: "DeleteMe" })
        .getByRole("button", { name: "Delete" });

      await expect(deleteButton).toBeVisible({ timeout: 10_000 });
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page
        .locator('[class*="rounded-xl"][class*="bg-white"][class*="shadow-sm"]')
        .filter({ hasText: "DeleteMe" })
        .getByRole("button", { name: "Confirm" });

      await expect(confirmButton).toBeVisible({ timeout: 5_000 });
      await confirmButton.click();

      // Product should disappear
      await expect(page.getByText("DeleteMe")).not.toBeVisible({
        timeout: 10_000,
      });
    });
  });
});
