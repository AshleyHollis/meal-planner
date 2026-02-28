import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Grocery List Flow
 *
 * Tests the grocery list page: loading items, checking/unchecking items,
 * and the complete shopping dialog.
 *
 * The grocery list is accessed via /grocery-list/[mealPlanId] and requires
 * an active meal plan with a generated grocery list.
 *
 * Grocery list page structure:
 * - "Back to meal plan" link
 * - "Complete Shopping (N)" button (when items are checked)
 * - h1 "Grocery List"
 * - Items grouped by store, each with checkbox, ingredient name, quantity/unit
 * - CompleteShoppingDialog with expiry date inputs and "Add to Inventory" button
 */

test.describe('Grocery List Flow', () => {
  // All grocery tests require a backend with an active meal plan
  test.skip(
    () => !process.env.USE_EXTERNAL_SERVER,
    'Requires backend with active meal plan - run with USE_EXTERNAL_SERVER=true'
  );

  test.describe('Page Load', () => {
    test('grocery list page loads with heading', async ({ page }) => {
      // Navigate via the dashboard to find the grocery list link
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Check if there's a grocery list link on the dashboard
      const groceryLink = page.getByText('Grocery List').first();
      if (!(await groceryLink.isVisible().catch(() => false))) {
        test.skip(true, 'No active plan with grocery list');
        return;
      }

      await groceryLink.click();

      // Should show grocery list heading
      await expect(page.getByRole('heading', { name: 'Grocery List' })).toBeVisible({
        timeout: 30_000,
      });
    });

    test('grocery list shows back to meal plan link', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const groceryLink = page.getByText('Grocery List').first();
      if (!(await groceryLink.isVisible().catch(() => false))) {
        test.skip(true, 'No active plan with grocery list');
        return;
      }

      await groceryLink.click();

      await expect(page.getByText('Back to meal plan')).toBeVisible({
        timeout: 30_000,
      });
    });

    test('grocery list shows items or empty state', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const groceryLink = page.getByText('Grocery List').first();
      if (!(await groceryLink.isVisible().catch(() => false))) {
        test.skip(true, 'No active plan with grocery list');
        return;
      }

      await groceryLink.click();
      await expect(page.getByRole('heading', { name: 'Grocery List' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for grocery list to load
      const grocerySpinner = page.locator('[class*="animate-spin"]');
      if ((await grocerySpinner.count()) > 0) {
        await expect(grocerySpinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Should show either items (with checkboxes) or empty state
      const checkbox = page.locator('input[type="checkbox"]').first();
      const emptyState = page.getByText('No items on the grocery list');
      const errorMessage = page.getByText('Failed to load grocery list');

      await expect(
        checkbox.or(emptyState).or(errorMessage)
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Grocery Item Interactions', () => {
    test('can check and uncheck a grocery item', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const groceryLink = page.getByText('Grocery List').first();
      if (!(await groceryLink.isVisible().catch(() => false))) {
        test.skip(true, 'No active plan with grocery list');
        return;
      }

      await groceryLink.click();
      await expect(page.getByRole('heading', { name: 'Grocery List' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const grocerySpinner = page.locator('[class*="animate-spin"]');
      if ((await grocerySpinner.count()) > 0) {
        await expect(grocerySpinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      if (!(await firstCheckbox.isVisible().catch(() => false))) {
        test.skip(true, 'No grocery items with checkboxes');
        return;
      }

      // Check the item
      const wasChecked = await firstCheckbox.isChecked();
      await firstCheckbox.click();

      // Wait for the API call to complete and state to update
      await page.waitForTimeout(1000);

      // Verify toggle happened (checkbox state should have changed)
      const isNowChecked = await firstCheckbox.isChecked();
      expect(isNowChecked).toBe(!wasChecked);
    });
  });

  test.describe('Complete Shopping Dialog', () => {
    test('complete shopping button appears when items are checked', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const groceryLink = page.getByText('Grocery List').first();
      if (!(await groceryLink.isVisible().catch(() => false))) {
        test.skip(true, 'No active plan with grocery list');
        return;
      }

      await groceryLink.click();
      await expect(page.getByRole('heading', { name: 'Grocery List' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const grocerySpinner = page.locator('[class*="animate-spin"]');
      if ((await grocerySpinner.count()) > 0) {
        await expect(grocerySpinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      if (!(await firstCheckbox.isVisible().catch(() => false))) {
        test.skip(true, 'No grocery items to check');
        return;
      }

      // Check an item if not already checked
      if (!(await firstCheckbox.isChecked())) {
        await firstCheckbox.click();
        await page.waitForTimeout(1000);
      }

      // "Complete Shopping" button should appear
      await expect(page.getByRole('button', { name: /Complete Shopping/ })).toBeVisible({
        timeout: 10_000,
      });
    });

    test('clicking complete shopping opens dialog', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
        timeout: 30_000,
      });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const groceryLink = page.getByText('Grocery List').first();
      if (!(await groceryLink.isVisible().catch(() => false))) {
        test.skip(true, 'No active plan with grocery list');
        return;
      }

      await groceryLink.click();
      await expect(page.getByRole('heading', { name: 'Grocery List' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for loading
      const grocerySpinner = page.locator('[class*="animate-spin"]');
      if ((await grocerySpinner.count()) > 0) {
        await expect(grocerySpinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      if (!(await firstCheckbox.isVisible().catch(() => false))) {
        test.skip(true, 'No grocery items to check');
        return;
      }

      // Check an item
      if (!(await firstCheckbox.isChecked())) {
        await firstCheckbox.click();
        await page.waitForTimeout(1000);
      }

      // Click Complete Shopping button
      const completeButton = page.getByRole('button', { name: /Complete Shopping/ });
      await expect(completeButton).toBeVisible({ timeout: 10_000 });
      await completeButton.click();

      // Dialog should open with "Complete Shopping" title
      const dialog = page.locator('dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await expect(dialog.getByText('Complete Shopping')).toBeVisible();

      // Dialog should have expiry date instructions and "Add to Inventory" button
      await expect(dialog.getByText(/Set expiry dates/i)).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Add to Inventory' })).toBeVisible();

      // Dialog should have Cancel button
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });
  });
});
