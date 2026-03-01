import { test, expect } from '@playwright/test';

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

test.describe('Smoke Tests @smoke', () => {
  test.describe('Navigation', () => {
    test('home page loads and shows Dashboard heading', async ({ page }) => {
      test.slow();

      await page.goto('/', { timeout: 60_000 });

      // Dashboard page should render with heading
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });
    });

    test('has correct page title', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle(/Meal Planner/);
    });

    test('header shows app name as link', async ({ page }) => {
      await page.goto('/');

      const appLink = page.getByRole('link', { name: 'Meal Planner' });
      await expect(appLink).toBeVisible();
    });

    test('bottom nav has all navigation links', async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav');
      await expect(nav).toBeVisible();

      // Verify all four navigation items exist
      await expect(nav.getByText('Home')).toBeVisible();
      await expect(nav.getByText('Inventory')).toBeVisible();
      await expect(nav.getByText('Meal Plan')).toBeVisible();
      await expect(nav.getByText('Grocery')).toBeVisible();
    });

    test('clicking Inventory nav link navigates to inventory page', async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav');
      await nav.getByText('Inventory').click();

      await expect(page).toHaveURL(/\/inventory/);
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    });

    test('clicking Meal Plan nav link navigates to meal plan page', async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav');
      await nav.getByText('Meal Plan').click();

      await expect(page).toHaveURL(/\/meal-plan/);
      await expect(page.getByRole('heading', { name: 'Meal Plans' })).toBeVisible();
    });
  });

  test.describe('Dashboard Content', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      // Wait for loading to complete
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });
    });

    test('shows quick link cards', async ({ page }) => {
      // Dashboard should have Inventory and Meal Plans quick links
      // Use role-based locators to avoid matching nav links
      await expect(page.getByRole('link', { name: /Inventory/i }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /Meal Plans/i }).first()).toBeVisible();
    });

    test('shows active plan section or generate button', async ({ page }) => {
      // Dashboard shows either an active plan summary or a "Generate Plan" button
      // Use .first() since .or() can match multiple visible elements
      const activePlanHeading = page.getByRole('heading', { name: 'Active Plan' });
      const generateButton = page.getByRole('button', { name: 'Generate Plan' });
      const noActivePlanText = page.getByText('No active meal plan');

      await expect(
        activePlanHeading.or(generateButton).or(noActivePlanText).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Authenticated User', () => {
    test('authenticated user sees Log out link', async ({ page }) => {
      await page.goto('/');

      // Header should show "Log out" for authenticated users
      await expect(page.getByText('Log out')).toBeVisible({ timeout: 10_000 });
    });

    test('authenticated user does not see Log in link', async ({ page }) => {
      await page.goto('/');

      // Wait for auth state to load (isLoading = false)
      await expect(page.getByText('Log out')).toBeVisible({ timeout: 10_000 });

      // "Log in" should NOT be visible for authenticated users
      await expect(page.getByText('Log in')).not.toBeVisible();
    });
  });
});
