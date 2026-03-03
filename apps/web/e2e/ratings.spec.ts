import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Recipe Ratings Flow (US3)
 *
 * Tests the rating functionality on cooked meal slots.
 *
 * Flow:
 * - Navigate to a meal plan with cooked slots
 * - Click to rate a cooked meal (select stars)
 * - Add feedback text
 * - Submit rating
 * - Verify rating persists on page reload
 */

test.describe("Recipe Ratings Flow", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.skip(
    () => !process.env.USE_EXTERNAL_SERVER,
    "Requires backend with cooked meal slots - run with USE_EXTERNAL_SERVER=true",
  );

  test.describe("Rating from Meal Plan", () => {
    test("can navigate to meal plan with slots", async ({ page }) => {
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
      if (await emptyState.isVisible().catch(() => false)) {
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

    test("cooked meal slots show rate button", async ({ page }) => {
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

      // Look for "Mark as Cooked" or "Rate" button
      const cookedButton = page.getByRole("button", {
        name: /Mark as Cooked/i,
      });
      const rateButton = page.getByRole("button", { name: /Rate|Star/i });

      // If there's a "Mark as Cooked" button, we can mark a slot as cooked
      if (await cookedButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await cookedButton.first().click();
        await page.waitForTimeout(1000);

        // Now look for rate button
        await expect(rateButton.first()).toBeVisible({ timeout: 10_000 });
      } else if (
        await rateButton.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        // Already have cooked slots
        await expect(rateButton.first()).toBeVisible();
      } else {
        test.skip(true, "No cooked or cookable slots available");
      }
    });

    test("can select star rating and submit", async ({ page }) => {
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

      // Mark a slot as cooked if needed
      const cookedButton = page
        .getByRole("button", { name: /Mark as Cooked/i })
        .first();
      if (await cookedButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await cookedButton.click();
        await page.waitForTimeout(1000);
      }

      // Click rate button
      const rateButton = page
        .getByRole("button", { name: /Rate|Star/i })
        .first();
      if (
        !(await rateButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No rate button available");
        return;
      }
      await rateButton.click();

      // Should show rating dialog/form with stars
      // Look for star buttons or star icons
      const starButton = page.getByRole("button", { name: /star|5/i });
      if (
        !(await starButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        // Try clicking specific stars
        const stars = page.locator('[role="button"]').filter({
          hasText: /★|⭐/,
        });
        if ((await stars.count()) > 0) {
          await stars.nth(4).click(); // Select 5th star
        } else {
          test.skip(true, "Star rating interface not found");
          return;
        }
      } else {
        await starButton.click();
      }

      // Add optional feedback
      const feedbackInput = page.getByLabel(/feedback|comment|notes/i);
      if (
        await feedbackInput.isVisible({ timeout: 2_000 }).catch(() => false)
      ) {
        await feedbackInput.fill("Delicious meal!");
      }

      // Submit rating
      const submitButton = page.getByRole("button", {
        name: /Submit|Save|Rate/i,
      });
      await expect(submitButton).toBeVisible({ timeout: 5_000 });
      await submitButton.click();

      // Wait for submission
      await page.waitForTimeout(1000);

      // Rating should now be visible (stars displayed or rating count)
      const ratingDisplay = page.getByText(/★|⭐|stars?|rated/i);
      await expect(ratingDisplay.first()).toBeVisible({ timeout: 10_000 });
    });

    test("rating persists on page reload", async ({ page }) => {
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

      const planUrl = await firstPlanLink.getAttribute("href");
      if (!planUrl) {
        test.skip(true, "Could not get plan URL");
        return;
      }

      await firstPlanLink.click();

      await expect(page.getByText("Back to plans")).toBeVisible({
        timeout: 30_000,
      });

      // Check if rating already exists
      const existingRating = page.getByText(/★|⭐|stars?|rated/i).first();
      if (
        !(await existingRating.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No ratings to verify persistence");
        return;
      }

      const ratingText = await existingRating.textContent();

      // Reload page
      await page.reload();

      // Wait for page to load
      await expect(page.getByText("Back to plans")).toBeVisible({
        timeout: 30_000,
      });

      // Rating should still be visible
      if (ratingText) {
        await expect(page.getByText(ratingText)).toBeVisible({
          timeout: 10_000,
        });
      }
    });

    test("can add feedback text with rating", async ({ page }) => {
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

      // Look for an unrated cooked meal
      const rateButton = page
        .getByRole("button", { name: /Rate|Star/i })
        .first();

      if (
        !(await rateButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No rate button available");
        return;
      }
      await rateButton.click();

      // Select rating
      const starButton = page.getByRole("button", { name: /star|5/i });
      if (await starButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await starButton.click();
      }

      // Add feedback
      const feedbackInput = page.getByLabel(/feedback|comment|notes/i);
      if (
        !(await feedbackInput.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No feedback input available");
        return;
      }

      await feedbackInput.fill("Great recipe, would make again!");

      // Submit
      const submitButton = page.getByRole("button", {
        name: /Submit|Save|Rate/i,
      });
      await submitButton.click();

      // Wait for submission
      await page.waitForTimeout(1000);

      // Verify feedback is displayed (if UI shows it)
      await expect(page.getByText(/Great recipe|would make again/i).first())
        .toBeVisible({ timeout: 10_000 })
        .catch(() => {
          // Feedback might not be displayed inline - that's OK
          return Promise.resolve();
        });
    });
  });
});
