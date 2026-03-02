import { test, expect } from "@playwright/test";

/**
 * E2E Smoke Tests for Meal Planner
 *
 * These tests verify core navigation, page rendering, and authenticated user flows.
 * They run against the actual UI components: Header, BottomNav, and page content.
 *
 * Prerequisites:
 * - Auth setup must have run (auth.setup.ts) to provide authenticated storage state
 * - For external server tests: USE_EXTERNAL_SERVER=true
 */

test.describe("Smoke Tests @smoke", () => {
  test.describe("Navigation", () => {
    test("home page loads and shows Dashboard heading", async ({ page }) => {
      test.slow();

      await page.goto("/", { timeout: 60_000 });

      // Desktop shows "Welcome back", mobile shows "Dashboard"
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });
    });

    test("has correct page title", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveTitle(/Meal Planner/);
    });

    test("header shows app name as link", async ({ page }) => {
      await page.goto("/");

      const appLink = page.getByRole("link", { name: "Meal Planner" });
      await expect(appLink).toBeVisible();
    });

    test("navigation has all links", async ({ page }) => {
      await page.goto("/");

      // On desktop, sidebar nav is visible; on mobile, bottom nav is visible
      const nav = page.locator("nav").first();
      await expect(nav).toBeVisible();

      // Verify all four navigation items exist
      await expect(nav.getByText("Home")).toBeVisible();
      await expect(nav.getByText("Inventory")).toBeVisible();
      await expect(nav.getByText("Meal Plan")).toBeVisible();
      await expect(nav.getByText("Grocery")).toBeVisible();
    });

    test("clicking Inventory nav link navigates to inventory page", async ({
      page,
    }) => {
      await page.goto("/");

      // Use whichever nav is visible (sidebar on desktop, bottom on mobile)
      await page.getByRole("link", { name: "Inventory" }).first().click();

      await expect(page).toHaveURL(/\/inventory/);
      await expect(
        page.getByRole("heading", { name: "Inventory" }),
      ).toBeVisible();
    });

    test("clicking Meal Plan nav link navigates to meal plan page", async ({
      page,
    }) => {
      await page.goto("/");

      await page
        .getByRole("link", { name: "Meal Plan", exact: true })
        .first()
        .click();

      await expect(page).toHaveURL(/\/meal-plan/);
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible();
    });
  });

  test.describe("Dashboard Content", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      // Wait for loading to complete — desktop shows "Welcome back", mobile shows "Dashboard"
      await expect(
        page
          .getByRole("heading", { name: "Welcome back" })
          .or(page.getByRole("heading", { name: "Dashboard" })),
      ).toBeVisible({
        timeout: 30_000,
      });
    });

    test("shows quick link cards", async ({ page }) => {
      // Dashboard should have Inventory and Meal Plans quick links
      // Use role-based locators to avoid matching nav links
      await expect(
        page.getByRole("link", { name: /Inventory/i }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Meal Plans/i }).first(),
      ).toBeVisible();
    });

    test("shows active plan section or generate button", async ({ page }) => {
      // Dashboard shows either an active plan summary or a "Generate Plan" button
      // Use .first() since .or() can match multiple visible elements
      const activePlanHeading = page.getByRole("heading", {
        name: "Active Plan",
      });
      const generateButton = page.getByRole("button", {
        name: "Generate Plan",
      });
      const noActivePlanText = page.getByText("No active meal plan");

      await expect(
        activePlanHeading.or(generateButton).or(noActivePlanText).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Authenticated User", () => {
    test("authenticated user sees Log out link", async ({ page }) => {
      await page.goto("/");

      // On desktop sidebar or mobile header, "Log out" should be visible
      await expect(page.getByRole("link", { name: "Log out" }).first()).toBeVisible({ timeout: 10_000 });
    });

    test("authenticated user does not see Log in link", async ({ page }) => {
      await page.goto("/");

      // Wait for auth state to load (isLoading = false)
      await expect(page.getByRole("link", { name: "Log out" }).first()).toBeVisible({ timeout: 10_000 });

      // "Log in" should NOT be visible for authenticated users
      await expect(page.getByText("Log in")).not.toBeVisible();
    });
  });
});
