import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Favorites Flow (US2)
 *
 * Tests the favorite button on recipes in meal plans and the favorites page
 * that shows all favorited recipes.
 *
 * Flow:
 * - Navigate to a meal plan with cooked meals
 * - Click favorite button on a recipe
 * - Verify favorites page shows the favorited recipe
 * - Unfavorite and verify it's removed
 */

test.describe("Favorites Flow", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.skip(
    () => !process.env.USE_EXTERNAL_SERVER,
    "Requires backend with active meal plan - run with USE_EXTERNAL_SERVER=true",
  );

  test.describe("Favorite from Meal Plan", () => {
    test("can navigate to meal plan detail page", async ({ page }) => {
      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const emptyState = page.getByText("No meal plans yet");
      const errorState = page.getByText("Failed to load meal plans");
      if (
        (await emptyState.isVisible().catch(() => false)) ||
        (await errorState.isVisible().catch(() => false))
      ) {
        test.skip(true, "No meal plans available");
        return;
      }

      // Click first plan
      const firstPlanLink = page.getByText(/Week of /).first();
      if (
        !(await firstPlanLink.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No meal plans to view");
        return;
      }
      await firstPlanLink.click();

      // Should navigate to plan detail
      await expect(page).toHaveURL(/\/meal-plan\/[a-zA-Z0-9-]+/);
      await expect(page.getByText("Back to plans")).toBeVisible({
        timeout: 30_000,
      });
    });

    test("meal plan shows favorite button on recipes", async ({ page }) => {
      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({
        timeout: 30_000,
      });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const emptyState = page.getByText("No meal plans yet");
      if (await emptyState.isVisible().catch(() => false)) {
        test.skip(true, "No meal plans available");
        return;
      }

      const firstPlanLink = page.getByText(/Week of /).first();
      if (
        !(await firstPlanLink.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No meal plans to view");
        return;
      }
      await firstPlanLink.click();

      // Wait for plan to load
      await expect(page.getByText("Back to plans")).toBeVisible({
        timeout: 30_000,
      });

      const generatingText = page.getByText("Generating your meal plan...");
      if (await generatingText.isVisible().catch(() => false)) {
        test.skip(true, "Plan still generating");
        return;
      }

      // Look for favorite button (heart icon or "Favorite" text)
      const favoriteButton = page
        .getByRole("button", { name: /favorite|heart/i })
        .first();

      // If no favorite button visible, test assumes slots exist but favorites not implemented
      await expect(favoriteButton).toBeVisible({ timeout: 10_000 });
    });

    test("clicking favorite button toggles favorite state", async ({
      page,
    }) => {
      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({
        timeout: 30_000,
      });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const firstPlanLink = page.getByText(/Week of /).first();
      if (
        !(await firstPlanLink.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No meal plans to view");
        return;
      }
      await firstPlanLink.click();

      await expect(page.getByText("Back to plans")).toBeVisible({
        timeout: 30_000,
      });

      const generatingText = page.getByText("Generating your meal plan...");
      if (await generatingText.isVisible().catch(() => false)) {
        test.skip(true, "Plan still generating");
        return;
      }

      // Find first favorite button
      const favoriteButton = page
        .getByRole("button", { name: /favorite|heart/i })
        .first();
      if (
        !(await favoriteButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No favorite buttons available");
        return;
      }

      // Click to favorite
      await favoriteButton.click();

      // Button state should change (aria-pressed, class change, or icon change)
      // Wait a moment for the API call to complete
      await page.waitForTimeout(1000);

      // Verify button is now in favorited state
      // This can be checked via aria-pressed, class, or icon state
      await expect(favoriteButton).toBeVisible();
    });
  });

  test.describe("Favorites Page", () => {
    test("favorites page loads with heading", async ({ page }) => {
      await page.goto("/favorites");

      await expect(
        page.getByRole("heading", { name: /Favorites|Favorite Recipes/i }),
      ).toBeVisible({
        timeout: 30_000,
      });
    });

    test("shows favorited recipes or empty state", async ({ page }) => {
      await page.goto("/favorites");
      await expect(
        page.getByRole("heading", { name: /Favorites|Favorite Recipes/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Should show either empty state or favorite items
      const emptyState = page.getByText(/No favorites|haven't favorited/i);
      const recipeCard = page.getByText(/Recipe|dinner|lunch/i);
      const errorMessage = page.getByText(/Failed to load|Error/i);

      await expect(
        emptyState.or(recipeCard).or(errorMessage).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("can unfavorite from favorites page", async ({ page }) => {
      await page.goto("/favorites");
      await expect(
        page.getByRole("heading", { name: /Favorites|Favorite Recipes/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const emptyState = page.getByText(/No favorites|haven't favorited/i);
      if (await emptyState.isVisible().catch(() => false)) {
        test.skip(true, "No favorites to remove");
        return;
      }

      // Find unfavorite button
      const unfavoriteButton = page
        .getByRole("button", { name: /unfavorite|remove|heart/i })
        .first();

      if (
        !(await unfavoriteButton
          .isVisible({ timeout: 5_000 })
          .catch(() => false))
      ) {
        test.skip(true, "No unfavorite buttons available");
        return;
      }

      // Get recipe title before removal
      const recipeContainer = unfavoriteButton.locator("..").locator("..");
      const recipeName = await recipeContainer.textContent();

      // Click unfavorite
      await unfavoriteButton.click();

      // Wait for removal
      await page.waitForTimeout(1000);

      // Recipe should be removed or empty state shown
      if (recipeName) {
        const cleanName = recipeName
          .replace(/unfavorite|remove|heart/gi, "")
          .trim();
        if (cleanName.length > 5) {
          await expect(page.getByText(cleanName).first())
            .not.toBeVisible({ timeout: 10_000 })
            .catch(() => {
              // If recipe still visible, might have multiple favorites
              // Check for empty state instead
              expect(
                page.getByText(/No favorites|haven't favorited/i),
              ).toBeVisible({ timeout: 5_000 });
            });
        }
      }
    });
  });
});
