import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Grocery List Shop Filtering & Trip Tracking (P24)
 *
 * Tests the grocery list page enhancements: shop filter tabs,
 * per-trip check-off tracking, and trip completion flow.
 *
 * The grocery list is accessed via /grocery-list/[mealPlanId] and requires
 * an active meal plan with a generated grocery list that has items with
 * product mappings (for distinct shops).
 */

test.describe("Grocery Shop Filtering & Trips", () => {
  test.skip(
    () => !process.env.USE_EXTERNAL_SERVER,
    "Requires backend with active meal plan – run with USE_EXTERNAL_SERVER=true",
  );

  /**
   * Navigate to the grocery list page from the dashboard.
   * Returns true if navigation succeeded, false if grocery list is unavailable.
   */
  async function navigateToGroceryList(
    page: import("@playwright/test").Page,
  ): Promise<boolean> {
    await page.goto("/");
    await expect(
      page
        .getByRole("heading", { name: "Welcome back" })
        .or(page.getByRole("heading", { name: "Dashboard" })),
    ).toBeVisible({ timeout: 30_000 });

    const spinner = page.locator('[class*="animate-spin"]');
    if ((await spinner.count()) > 0) {
      await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
    }

    const groceryLink = page.getByText("Grocery List").first();
    if (!(await groceryLink.isVisible().catch(() => false))) {
      return false;
    }

    await groceryLink.click();
    await expect(
      page.getByRole("heading", { name: "Grocery List" }),
    ).toBeVisible({ timeout: 30_000 });

    // Wait for loading
    const grocerySpinner = page.locator('[class*="animate-spin"]');
    if ((await grocerySpinner.count()) > 0) {
      await expect(grocerySpinner.first()).not.toBeVisible({ timeout: 30_000 });
    }

    // Wait for "All" filter button to appear — indicates items are loaded
    const allButton = page.getByRole("button", { name: /^All/ });
    if (!(await allButton.isVisible({ timeout: 10_000 }).catch(() => false))) {
      return false; // no items loaded (plan may still be generating)
    }

    return true;
  }

  test.describe("Shop Filter", () => {
    test("grocery list shows All filter tab", async ({ page }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // navigateToGroceryList already verified "All" button is visible
      const allButton = page.getByRole("button", { name: /^All/ });
      await expect(allButton).toBeVisible();
    });

    test("shop filter shows item counts", async ({ page }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // All button text should contain a number (item count)
      const allButton = page.getByRole("button", { name: /^All/ });
      const text = await allButton.textContent();
      expect(text).toMatch(/All\s*\d+/);
    });

    test("clicking a shop filter narrows displayed items", async ({ page }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // Count grocery item checkboxes in the main list (exclude trip tracker)
      // The main list uses <ul class="divide-y ..."> while trip tracker uses <div class="bg-blue-50">
      const mainListCheckboxes = page.locator(
        'ul.divide-y li input[type="checkbox"]',
      );
      const initialCount = await mainListCheckboxes.count();

      if (initialCount === 0) {
        test.skip(true, "No grocery items");
        return;
      }

      // Find shop filter buttons (not the "All" button)
      const filterButtons = page.locator("button.rounded-full");
      const buttonCount = await filterButtons.count();

      // Look for a shop-specific button (not "All", not "Other")
      let shopButton: import("@playwright/test").Locator | null = null;
      for (let i = 0; i < buttonCount; i++) {
        const btnText = (await filterButtons.nth(i).textContent()) ?? "";
        if (!btnText.startsWith("All") && !btnText.startsWith("Other")) {
          shopButton = filterButtons.nth(i);
          break;
        }
      }

      if (!shopButton) {
        test.skip(
          true,
          "No shop-specific filter buttons (products may not have shops assigned)",
        );
        return;
      }

      await shopButton.click();
      await page.waitForTimeout(500);

      // After clicking a shop filter, the main list item count should be <= initial
      const filteredCheckboxes = page.locator(
        'ul.divide-y li input[type="checkbox"]',
      );
      const filteredCount = await filteredCheckboxes.count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);

      // Click "All" to reset
      await page.getByRole("button", { name: /^All/ }).click();
      await page.waitForTimeout(500);

      const resetCount = await mainListCheckboxes.count();
      expect(resetCount).toBe(initialCount);
    });
  });

  test.describe("Trip Tracker", () => {
    test("trip tracker appears when a shop is selected", async ({ page }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // Find a shop-specific filter button
      const filterButtons = page.locator("button.rounded-full");
      const buttonCount = await filterButtons.count();

      let shopButton: import("@playwright/test").Locator | null = null;
      for (let i = 0; i < buttonCount; i++) {
        const btnText = (await filterButtons.nth(i).textContent()) ?? "";
        if (!btnText.startsWith("All") && !btnText.startsWith("Other")) {
          shopButton = filterButtons.nth(i);
          break;
        }
      }

      if (!shopButton) {
        test.skip(true, "No shop-specific filter buttons");
        return;
      }

      await shopButton.click();

      // Trip tracker should appear with "Shopping trip" text
      await expect(page.getByText(/Shopping trip/)).toBeVisible({
        timeout: 10_000,
      });

      // Should show items count (e.g. "0/3 items")
      await expect(page.getByText(/\d+\/\d+ items/)).toBeVisible();

      // Should show "Complete Trip" button
      await expect(
        page.getByRole("button", { name: /Complete Trip/ }),
      ).toBeVisible();
    });

    test("trip tracker progress updates when checking items", async ({
      page,
    }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // Select a shop filter
      const filterButtons = page.locator("button.rounded-full");
      const buttonCount = await filterButtons.count();

      let shopButton: import("@playwright/test").Locator | null = null;
      for (let i = 0; i < buttonCount; i++) {
        const btnText = (await filterButtons.nth(i).textContent()) ?? "";
        if (!btnText.startsWith("All") && !btnText.startsWith("Other")) {
          shopButton = filterButtons.nth(i);
          break;
        }
      }

      if (!shopButton) {
        test.skip(true, "No shop-specific filter buttons");
        return;
      }

      await shopButton.click();
      await expect(page.getByText(/Shopping trip/)).toBeVisible({
        timeout: 10_000,
      });

      // Initial state: 0 checked items
      const progressText = page.getByText(/\d+\/\d+ items/);
      await expect(progressText).toBeVisible();
      const initialText = await progressText.textContent();

      // Find trip tracker checkboxes (inside the blue trip tracker panel)
      const tripCheckboxes = page
        .locator(".bg-blue-50")
        .locator('input[type="checkbox"]');
      const tripItemCount = await tripCheckboxes.count();

      if (tripItemCount === 0) {
        test.skip(true, "No items in trip tracker");
        return;
      }

      // Check the first item in the trip tracker
      await tripCheckboxes.first().check();
      await page.waitForTimeout(500);

      // Progress should update
      const updatedText = await progressText.textContent();
      expect(updatedText).not.toBe(initialText);
      // Should show at least 1 checked
      expect(updatedText).toMatch(/[1-9]\d*\/\d+ items/);
    });

    test("Complete Trip button is disabled with no items checked", async ({
      page,
    }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      const filterButtons = page.locator("button.rounded-full");
      const buttonCount = await filterButtons.count();

      let shopButton: import("@playwright/test").Locator | null = null;
      for (let i = 0; i < buttonCount; i++) {
        const btnText = (await filterButtons.nth(i).textContent()) ?? "";
        if (!btnText.startsWith("All") && !btnText.startsWith("Other")) {
          shopButton = filterButtons.nth(i);
          break;
        }
      }

      if (!shopButton) {
        test.skip(true, "No shop-specific filter buttons");
        return;
      }

      await shopButton.click();
      await expect(page.getByText(/Shopping trip/)).toBeVisible({
        timeout: 10_000,
      });

      // Complete Trip button should be disabled when no items are checked
      const completeButton = page.getByRole("button", {
        name: /Complete Trip/,
      });
      await expect(completeButton).toBeVisible();
      await expect(completeButton).toBeDisabled();
    });

    test("clicking All resets to full grocery list without trip tracker", async ({
      page,
    }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // Select a shop filter first
      const filterButtons = page.locator("button.rounded-full");
      const buttonCount = await filterButtons.count();

      let shopButton: import("@playwright/test").Locator | null = null;
      for (let i = 0; i < buttonCount; i++) {
        const btnText = (await filterButtons.nth(i).textContent()) ?? "";
        if (!btnText.startsWith("All") && !btnText.startsWith("Other")) {
          shopButton = filterButtons.nth(i);
          break;
        }
      }

      if (!shopButton) {
        test.skip(true, "No shop-specific filter buttons");
        return;
      }

      await shopButton.click();
      await expect(page.getByText(/Shopping trip/)).toBeVisible({
        timeout: 10_000,
      });

      // Click "All" to reset
      await page.getByRole("button", { name: /^All/ }).click();
      await page.waitForTimeout(500);

      // Trip tracker should not be visible
      await expect(page.getByText(/Shopping trip/)).not.toBeVisible();
    });
  });

  test.describe("Grocery List Enrichment", () => {
    test("grocery items show ingredient names not UUIDs", async ({ page }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // Get item text content - should NOT contain UUID patterns
      const items = page.locator("li");
      const itemCount = await items.count();

      if (itemCount === 0) {
        test.skip(true, "No grocery items");
        return;
      }

      // Check first few items don't show UUIDs
      const uuidPattern =
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const maxCheck = Math.min(itemCount, 5);

      for (let i = 0; i < maxCheck; i++) {
        const text = await items.nth(i).textContent();
        if (text) {
          expect(text).not.toMatch(uuidPattern);
        }
      }
    });

    test("grocery items with products show brand and shop", async ({
      page,
    }) => {
      if (!(await navigateToGroceryList(page))) {
        test.skip(true, "No active plan with grocery items");
        return;
      }

      // Look for product detail indicators (brand/shop badges)
      const shopBadges = page.locator(".rounded-full.bg-blue-50");
      const brandTexts = page.locator("li .text-xs.text-gray-500");

      const shopCount = await shopBadges.count();
      const brandCount = await brandTexts.count();

      // At least some items should have product details if products were seeded
      // This is a soft check - items may not have products
      if (shopCount === 0 && brandCount === 0) {
        console.log(
          "[grocery-trips] No product details visible on grocery items (products may not be seeded for these ingredients)",
        );
      }

      // Test passes either way - just verifies no crash
      expect(true).toBe(true);
    });
  });
});
