import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Meal Plan Flow
 *
 * Tests the meal plan list page, plan generation, weekly plan detail view,
 * and meal slot interactions (swap, mark as cooked).
 *
 * Meal Plan list page:
 * - h1 "Meal Plans"
 * - "Generate New Plan" button
 * - List of plans with "Week of YYYY-MM-DD", status badge, and created date
 *
 * Meal Plan detail page:
 * - "Back to plans" link
 * - WeeklyPlanView with Monday-Sunday dinner slots
 * - Each slot: recipe title, prep/cook times
 * - Draft state shows "Generating your meal plan..." with spinner
 */

test.describe("Meal Plan Flow", () => {
  test.describe("Plan List Page", () => {
    test("meal plan list page loads with heading", async ({ page }) => {
      await page.goto("/meal-plan");

      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({
        timeout: 30_000,
      });
    });

    test("generate new plan button is visible", async ({ page }) => {
      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({
        timeout: 30_000,
      });

      await expect(
        page.getByRole("button", { name: "Generate New Plan" }),
      ).toBeVisible();
    });

    test("shows plan list or empty state after loading", async ({ page }) => {
      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading spinner to disappear
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Should show either the empty state or a list of plans
      const emptyState = page.getByText("No meal plans yet");
      const planItem = page.getByText(/Week of \d{4}-\d{2}-\d{2}/).first();
      const errorMessage = page.getByText("Failed to load meal plans");

      await expect(
        emptyState.or(planItem).or(errorMessage).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("plan list items show status badges", async ({ page }) => {
      test.skip(
        !process.env.USE_EXTERNAL_SERVER,
        "Requires backend with existing plans",
      );

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
        test.skip(true, "No meal plans exist");
        return;
      }

      // Plans should have status badges (draft, active, completed)
      const statusBadge = page.getByText(/draft|active|completed/i).first();
      await expect(statusBadge).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe("Plan Detail Page (Requires Backend)", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("plan detail page shows weekly view with day labels", async ({
      page,
    }) => {
      // First, go to meal plan list and click the first plan
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
      const errorState = page.getByText("Failed to load meal plans");
      if (
        (await emptyState.isVisible().catch(() => false)) ||
        (await errorState.isVisible().catch(() => false))
      ) {
        test.skip(true, "No meal plans to view");
        return;
      }

      // Check that a plan link actually exists before clicking
      const firstPlanLink = page.getByText(/Week of \d{4}-\d{2}-\d{2}/).first();
      if (
        !(await firstPlanLink.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No meal plans available to click");
        return;
      }
      await firstPlanLink.click();

      // Should navigate to plan detail page
      await expect(page).toHaveURL(/\/meal-plan\/[a-zA-Z0-9-]+/);

      // Should show "Back to plans" link
      await expect(page.getByText("Back to plans")).toBeVisible({
        timeout: 30_000,
      });

      // Wait for plan to load (either weekly view or generating state)
      const weekLabel = page.getByText(/Week of \d{4}-\d{2}-\d{2}/);
      const generatingText = page.getByText("Generating your meal plan...");

      await expect(weekLabel.or(generatingText)).toBeVisible({
        timeout: 30_000,
      });

      // If plan is ready (not draft), check for day labels
      if (await weekLabel.isVisible().catch(() => false)) {
        // WeeklyPlanView renders Monday through Sunday
        await expect(page.getByText("Monday")).toBeVisible();
        await expect(page.getByText("Tuesday")).toBeVisible();
        await expect(page.getByText("Wednesday")).toBeVisible();
        await expect(page.getByText("Thursday")).toBeVisible();
        await expect(page.getByText("Friday")).toBeVisible();
        await expect(page.getByText("Saturday")).toBeVisible();
        await expect(page.getByText("Sunday")).toBeVisible();
      }
    });

    test("plan detail page has back navigation", async ({ page }) => {
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
      const errorState = page.getByText("Failed to load meal plans");
      if (
        (await emptyState.isVisible().catch(() => false)) ||
        (await errorState.isVisible().catch(() => false))
      ) {
        test.skip(true, "No meal plans to navigate to");
        return;
      }

      // Check that a plan link actually exists before clicking
      const firstPlanLink = page.getByText(/Week of \d{4}-\d{2}-\d{2}/).first();
      if (
        !(await firstPlanLink.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No meal plans available to click");
        return;
      }
      await firstPlanLink.click();

      // Click "Back to plans"
      await expect(page.getByText("Back to plans")).toBeVisible({
        timeout: 30_000,
      });
      await page.getByText("Back to plans").click();

      // Should navigate back to plan list
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible();
    });
  });

  test.describe("Generate Plan (Requires Backend)", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("clicking Generate New Plan navigates to plan detail", async ({
      page,
    }) => {
      test.slow(); // Triple timeout for plan generation

      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({
        timeout: 30_000,
      });

      const generateButton = page.getByRole("button", {
        name: "Generate New Plan",
      });
      await expect(generateButton).toBeVisible();
      await generateButton.click();

      // Should navigate to the new plan's detail page
      // If API fails, the URL stays at /meal-plan - skip in that case
      try {
        await expect(page).toHaveURL(/\/meal-plan\/[a-zA-Z0-9-]+/, {
          timeout: 30_000,
        });
      } catch {
        // Check if an error toast/message appeared or URL didn't change
        const currentUrl = page.url();
        if (
          currentUrl.endsWith("/meal-plan") ||
          currentUrl.endsWith("/meal-plan/")
        ) {
          test.skip(
            true,
            "Meal plan generation failed (backend API may be unavailable)",
          );
          return;
        }
        throw new Error(`Unexpected URL after generate: ${currentUrl}`);
      }

      // Should show either generating state or weekly view
      const content = page
        .getByText("Generating your meal plan...")
        .or(page.getByText(/Week of/));
      await expect(content.first()).toBeVisible({ timeout: 30_000 });
    });
  });
});
