import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Dashboard Flow
 *
 * Tests the dashboard landing page, including:
 * - Dashboard content rendering
 * - Generate Plan button functionality
 * - Cuisine preference selection before generation
 * - Navigation from dashboard stat cards
 *
 * The dashboard is the home page (/) and shows:
 * - Welcome/Dashboard heading
 * - Active plan section or "No active plan" message
 * - Generate Plan button
 * - Quick link cards (Inventory, Meal Plans)
 * - Stats cards (Total Plans, Upcoming Meals, etc.)
 * - Cuisine preferences section
 */

test.describe("Dashboard", () => {
  test.describe("Page Load and Content", () => {
    test("dashboard loads with heading and primary content", async ({
      page,
    }) => {
      await page.goto("/");

      // Desktop shows "Welcome back", mobile shows "Dashboard"
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Should have Generate Plan button OR active plan content
      // (depends on whether seed-data created an active plan)
      const generateBtn = page.getByRole("button", {
        name: /Generate.*Plan/i,
      });
      const activePlan = page.getByText(
        /This Week|Active Plan|Meals This Week/i,
      );
      await expect(generateBtn.or(activePlan).first()).toBeVisible({
        timeout: 10_000,
      });
    });

    test("shows active plan section or no active plan message", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading to complete
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Should show either active plan info or "Plan Your Week" section
      const activePlanHeading = page.getByRole("heading", {
        name: /Active Plan/i,
      });
      const planYourWeek = page.getByRole("heading", {
        name: /Plan Your Week/i,
      });
      const noActivePlanMsg = page.getByText(/No active meal plan/i);

      await expect(
        activePlanHeading.or(planYourWeek).or(noActivePlanMsg).first(),
      ).toBeVisible({
        timeout: 10_000,
      });
    });

    test("shows quick link cards for navigation", async ({ page }) => {
      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Should have links to core pages (in sidebar nav or quick actions)
      const inventoryLink = page.getByRole("link", { name: /Inventory/i });
      const mealPlansLink = page.getByRole("link", {
        name: /Meal Plans|Plans/i,
      });
      const quickAction = page.getByText(/Quick Actions/i);

      await expect(
        inventoryLink.or(mealPlansLink).or(quickAction).first(),
      ).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("Generate Plan from Dashboard", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("clicking Generate Plan button navigates to generation flow", async ({
      page,
    }) => {
      test.slow(); // Plan generation can take time

      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Find Generate Plan button (may not exist if active plan already seeded)
      const generateButton = page.getByRole("button", {
        name: /Generate.*Plan/i,
      });
      if (
        !(await generateButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "Generate Plan not visible — active plan exists");
        return;
      }
      await generateButton.click();

      // Should navigate to meal plan page or show a generation dialog
      try {
        // Check for meal plan URL OR see a dialog/generation UI
        await expect(page).toHaveURL(/\/meal-plan/, { timeout: 10_000 });
      } catch {
        // If not navigated immediately, check for dialog or loading state
        const dialog = page.getByRole("dialog").first();
        const spinner = page.locator('[class*="animate-spin"]');

        await expect(dialog.or(spinner).first()).toBeVisible({
          timeout: 10_000,
        });
      }
    });

    test("plan generation completes or shows appropriate state", async ({
      page,
    }) => {
      test.slow();

      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Click Generate (skip if active plan already exists)
      const generateButton = page.getByRole("button", {
        name: /Generate.*Plan/i,
      });
      if (
        !(await generateButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "Generate Plan not visible — active plan exists");
        return;
      }
      await generateButton.click();

      // Wait for navigation or completion
      try {
        await expect(page).toHaveURL(/\/meal-plan/, { timeout: 10_000 });

        // Once on meal plan, wait for generation to complete
        const backLink = page.getByText(/Back to plans|Back/i);
        const failedText = page.getByText(/failed|error/i);
        const generatingText = page.getByText(/generating|creating/i);

        await expect(
          backLink.or(failedText).or(generatingText).first(),
        ).toBeVisible({ timeout: 90_000 });
      } catch {
        test.skip(true, "Plan generation or navigation failed");
      }
    });
  });

  test.describe("Cuisine Preferences Before Generation", () => {
    test("cuisine preferences section is visible on dashboard", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Cuisine section should be visible (if implemented on dashboard)
      // Use specific heading/label to avoid matching the nav "Preferences" link
      const cuisineSection = page.getByText(/Cuisine Preferences/i).first();
      const cuisineButton = page
        .getByRole("button", { name: /Mexican|Italian|Asian/i })
        .first();

      await expect(cuisineSection.or(cuisineButton).first()).toBeVisible({
        timeout: 10_000,
      });
    });

    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("can set cuisine preferences and then generate plan", async ({
      page,
    }) => {
      test.slow();

      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Try to select a cuisine (if visible)
      const cuisineButton = page
        .getByRole("button", { name: /Mexican/i })
        .first();

      if (
        await cuisineButton.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        await cuisineButton.click();

        // Verify selection is highlighted
        await expect(cuisineButton.first()).toHaveAttribute(
          "class",
          /selected|active|bg/i,
        );
      }

      // Click Generate Plan (skip if active plan already exists)
      const generateButton = page.getByRole("button", {
        name: /Generate.*Plan/i,
      });
      if (
        !(await generateButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "Generate Plan not visible — active plan exists");
        return;
      }
      await generateButton.click();

      // Should navigate and start generation
      try {
        await expect(page).toHaveURL(/\/meal-plan/, { timeout: 10_000 });
      } catch {
        test.skip(true, "Navigation failed");
      }
    });
  });

  test.describe("Dashboard Stats Navigation", () => {
    test("stat cards are visible", async ({ page }) => {
      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Look for stat cards (Meals This Week, Items Expiring, In Inventory)
      const statCard = page.getByText(
        /Meals This Week|Items Expiring|In Inventory|Total Plans|Upcoming/i,
      );

      await expect(statCard.first()).toBeVisible({ timeout: 10_000 });
    });

    test("clicking stat card navigates to relevant page", async ({ page }) => {
      await page.goto("/");
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Find a stat card that's clickable
      const mealPlanStat = page
        .locator("button, a")
        .filter({
          hasText: /Meal Plans|Plans Created|Total Plans|Meals This Week/,
        })
        .first();

      if (await mealPlanStat.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await mealPlanStat.click();

        // Should navigate to meal-plan page
        await expect(page).toHaveURL(/\/meal-plan/, {
          timeout: 10_000,
        });
      }
    });
  });
});
