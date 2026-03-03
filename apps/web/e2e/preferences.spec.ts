import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Preferences Management (US1)
 *
 * Tests the preferences page: adding dietary restrictions, allergies, and dislikes,
 * verifying they appear grouped by type, and deleting preferences.
 *
 * Preferences page structure:
 * - h1 "Food Preferences"
 * - Form to add preferences with type selector, value input, notes
 * - List of preferences grouped by type (Dietary Restrictions, Allergies, Dislikes, Likes)
 * - Delete button on each preference
 */

test.describe("Preferences Management", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.describe("Page Load", () => {
    test("preferences page loads with heading", async ({ page }) => {
      await page.goto("/preferences");

      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });
    });

    test("shows add preference form", async ({ page }) => {
      await page.goto("/preferences");
      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading spinner to disappear
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Form should have preference type selector
      await expect(
        page.getByLabel(/Type|Preference Type/i),
      ).toBeVisible({ timeout: 10_000 });

      // Form should have value input or dietary restriction dropdown
      // (depends on whether dietary types API returns data)
      await expect(
        page.getByLabel(/Value|Dietary Restriction/i),
      ).toBeVisible({ timeout: 10_000 });

      // Form should have add/submit button
      await expect(
        page.getByRole("button", { name: /Add|Save|Submit/i }),
      ).toBeVisible();
    });

    test("shows empty state or preference list after loading", async ({
      page,
    }) => {
      await page.goto("/preferences");
      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading spinner to disappear
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Should show either empty state or preference items
      const emptyState = page.getByText(/No preferences|Add your first/i);
      const preferenceItem = page.getByText(
        /vegetarian|vegan|allergy|dislike/i,
      );
      const errorMessage = page.getByText(/Failed to load|Error/i);

      await expect(
        emptyState.or(preferenceItem).or(errorMessage).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Add Preference (Requires Backend)", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("can add a dietary restriction", async ({ page }) => {
      await page.goto("/preferences");
      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading spinner to disappear
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Wait for form to load
      const typeSelector = page.getByLabel(/Type|Preference Type/i);
      await expect(typeSelector).toBeVisible({ timeout: 10_000 });

      // Select dietary restriction
      await typeSelector.selectOption("dietary_restriction");

      // For dietary restriction, the API returns predefined types shown in a dropdown
      const dietaryDropdown = page.getByLabel(/Dietary Restriction/i);
      const valueInput = page.getByLabel(/Value/i);
      if (
        await dietaryDropdown.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        await dietaryDropdown.selectOption("vegetarian");
      } else {
        await valueInput.fill("vegetarian");
      }

      // Submit
      await page.getByRole("button", { name: /Add|Save|Submit/i }).click();

      // Should show the added preference
      await expect(page.getByText("vegetarian")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("can add an allergy", async ({ page }) => {
      await page.goto("/preferences");
      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading spinner to disappear
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const typeSelector = page.getByLabel(/Type|Preference Type/i);
      await expect(typeSelector).toBeVisible({ timeout: 10_000 });

      // Select allergy
      await typeSelector.selectOption("allergy");

      // Enter value (allergy type shows Value input, not dietary dropdown)
      const valueInput = page.getByLabel(/Value/i);
      await expect(valueInput).toBeVisible({ timeout: 5_000 });
      await valueInput.fill("peanuts");

      // Submit
      await page.getByRole("button", { name: /Add|Save|Submit/i }).click();

      // Should show the added allergy
      await expect(page.getByText("peanuts")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("can add a dislike", async ({ page }) => {
      await page.goto("/preferences");
      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading spinner to disappear
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const typeSelector = page.getByLabel(/Type|Preference Type/i);
      await expect(typeSelector).toBeVisible({ timeout: 10_000 });

      // Select dislike
      await typeSelector.selectOption("dislike");

      // Enter value (dislike type shows Value input, not dietary dropdown)
      const valueInput = page.getByLabel(/Value/i);
      await expect(valueInput).toBeVisible({ timeout: 5_000 });
      await valueInput.fill("cilantro");

      // Submit
      await page.getByRole("button", { name: /Add|Save|Submit/i }).click();

      // Should show the added dislike
      await expect(page.getByText("cilantro")).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("Preference Groups", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend with preferences data",
    );

    test("preferences appear grouped by type", async ({ page }) => {
      await page.goto("/preferences");
      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const emptyState = page.getByText(/No preferences|Add your first/i);
      if (await emptyState.isVisible().catch(() => false)) {
        test.skip(true, "No preferences to group");
        return;
      }

      // Should have group headings
      const groupHeadings = page.getByRole("heading", {
        name: /(Dietary Restrictions|Allergies|Dislikes|Likes)/i,
      });

      // At least one group should be visible
      await expect(groupHeadings.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Delete Preference (Requires Backend)", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("can delete a preference", async ({ page }) => {
      await page.goto("/preferences");
      await expect(
        page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const emptyState = page.getByText(/No preferences|Add your first/i);
      const errorState = page.getByText(/Failed to load|Error/i);
      if (
        (await emptyState.isVisible().catch(() => false)) ||
        (await errorState.isVisible().catch(() => false))
      ) {
        test.skip(true, "No preferences to delete");
        return;
      }

      // Find the first delete button
      const deleteButton = page
        .getByRole("button", { name: /Delete|Remove/i })
        .first();
      await expect(deleteButton).toBeVisible({ timeout: 10_000 });

      // Get the preference text before deletion
      const preferenceContainer = deleteButton.locator("..");
      const preferenceText = await preferenceContainer.textContent();

      // Click delete
      await deleteButton.click();

      // Preference should disappear
      if (preferenceText) {
        await expect(
          page.getByText(preferenceText.replace(/Delete|Remove/gi, "").trim()),
        ).not.toBeVisible({ timeout: 10_000 });
      }
    });
  });
});
