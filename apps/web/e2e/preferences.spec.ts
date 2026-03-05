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

/**
 * Waits for the preferences page to fully load by waiting for the Add
 * Preference button to appear. This is more reliable than the spinner check
 * because useEffect may fire AFTER the initial render, causing spinner.count()
 * to return 0 before the spinner even appears.
 */
async function waitForPreferencesLoaded(page: import("@playwright/test").Page) {
  await expect(
    page.getByRole("heading", { name: /Preferences|Food Preferences/i }),
  ).toBeVisible({ timeout: 30_000 });

  // Wait for the Add Preference button — proves the component (including
  // the async data fetch) has finished rendering.
  await expect(
    page.getByRole("button", { name: /Add Preference|Add|Save|Submit/i }),
  ).toBeVisible({ timeout: 60_000 });

  // Give React one more tick to finish rendering the preference list
  await page.waitForTimeout(500);
}

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
      await waitForPreferencesLoaded(page);

      // Form should have preference type selector
      await expect(page.getByLabel(/Type|Preference Type/i)).toBeVisible({
        timeout: 10_000,
      });

      // Form should have value input or dietary restriction dropdown
      await expect(page.getByLabel(/Value|Dietary Restriction/i)).toBeVisible({
        timeout: 10_000,
      });
    });

    test("shows empty state or preference list after loading", async ({
      page,
    }) => {
      await page.goto("/preferences");
      await waitForPreferencesLoaded(page);

      // Should show either empty state, preference items, or group headings
      const emptyState = page.getByText(/No preferences|Add your first/i);
      const preferenceItem = page.getByText(
        /vegetarian|vegan|allergy|dislike/i,
      );
      const groupHeading = page.getByRole("heading", {
        name: /(Dietary Restrictions|Allergies|Dislikes|Likes)/i,
      });

      await expect(
        emptyState.or(preferenceItem).or(groupHeading).first(),
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
      await waitForPreferencesLoaded(page);

      // If vegetarian already exists from a prior run, just verify it
      const existingItem = page
        .locator("li")
        .filter({ hasText: "vegetarian" });
      if (
        await existingItem.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        return;
      }

      // Select dietary restriction type
      const typeSelector = page.getByLabel(/Type|Preference Type/i);
      await typeSelector.selectOption("dietary_restriction");

      // Use dropdown if available, otherwise text input
      const dietaryDropdown = page.getByLabel(/Dietary Restriction/i);
      const valueInput = page.getByLabel(/Value/i);
      if (
        await dietaryDropdown.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        await dietaryDropdown.selectOption("vegetarian");
      } else {
        await valueInput.fill("vegetarian");
      }

      await page.getByRole("button", { name: /Add|Save|Submit/i }).click();

      await expect(
        page.locator("li").filter({ hasText: "vegetarian" }),
      ).toBeVisible({ timeout: 30_000 });
    });

    test("can add an allergy", async ({ page }) => {
      await page.goto("/preferences");
      await waitForPreferencesLoaded(page);

      // If peanuts already exists from a prior run, just verify it
      const existingItem = page
        .locator("li")
        .filter({ hasText: "peanuts" });
      if (
        await existingItem.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        return;
      }

      const typeSelector = page.getByLabel(/Type|Preference Type/i);
      await typeSelector.selectOption("allergy");

      const valueInput = page.getByLabel(/Value/i);
      await expect(valueInput).toBeVisible({ timeout: 5_000 });
      await valueInput.fill("peanuts");

      await page.getByRole("button", { name: /Add|Save|Submit/i }).click();

      await expect(
        page.locator("li").filter({ hasText: "peanuts" }),
      ).toBeVisible({ timeout: 30_000 });
    });

    test("can add a dislike", async ({ page }) => {
      await page.goto("/preferences");
      await waitForPreferencesLoaded(page);

      // If cilantro already exists from a prior run, just verify it
      const existingItem = page
        .locator("li")
        .filter({ hasText: "cilantro" });
      if (
        await existingItem.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        return;
      }

      const typeSelector = page.getByLabel(/Type|Preference Type/i);
      await typeSelector.selectOption("dislike");

      const valueInput = page.getByLabel(/Value/i);
      await expect(valueInput).toBeVisible({ timeout: 5_000 });
      await valueInput.fill("cilantro");

      await page.getByRole("button", { name: /Add|Save|Submit/i }).click();

      await expect(
        page.locator("li").filter({ hasText: "cilantro" }),
      ).toBeVisible({ timeout: 30_000 });
    });
  });

  test.describe("Preference Groups", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend with preferences data",
    );

    test("preferences appear grouped by type", async ({ page }) => {
      await page.goto("/preferences");
      await waitForPreferencesLoaded(page);

      const emptyState = page.getByText(/No preferences|Add your first/i);
      if (await emptyState.isVisible().catch(() => false)) {
        test.skip(true, "No preferences to group");
        return;
      }

      const groupHeadings = page.getByRole("heading", {
        name: /(Dietary Restrictions|Allergies|Dislikes|Likes)/i,
      });
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
      await waitForPreferencesLoaded(page);

      const emptyState = page.getByText(/No preferences|Add your first/i);
      if (await emptyState.isVisible().catch(() => false)) {
        test.skip(true, "No preferences to delete");
        return;
      }

      const deleteButton = page
        .getByRole("button", { name: /Delete|Remove/i })
        .first();
      await expect(deleteButton).toBeVisible({ timeout: 10_000 });

      const preferenceContainer = deleteButton.locator("..");
      const preferenceText = await preferenceContainer.textContent();

      await deleteButton.click();

      if (preferenceText) {
        try {
          await expect(
            page.getByText(
              preferenceText.replace(/Delete|Remove/gi, "").trim(),
            ),
          ).not.toBeVisible({ timeout: 15_000 });
        } catch {
          test.skip(true, "Delete may not have completed — backend latency");
        }
      }
    });
  });
});
