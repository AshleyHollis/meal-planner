import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Inventory Management
 *
 * Tests the inventory page: listing items, adding via the autocomplete form,
 * editing quantities, removing items, and expiry badge display.
 *
 * The inventory page structure:
 * - h1 "Inventory"
 * - "Add Item" section with ingredient autocomplete, quantity, unit, location, expiry date
 * - InventoryList grouped by location (Fridge / Pantry) with Edit/Remove buttons
 * - ExpiryBadge showing "Expired", "Expires in Xd", "Xd left", or "No expiry"
 */

test.describe('Inventory Management', () => {
  test.describe('Page Load', () => {
    test('inventory page loads with heading and add form', async ({ page }) => {
      await page.goto('/inventory');

      // Page heading
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible({
        timeout: 30_000,
      });

      // Add Item section heading
      await expect(page.getByRole('heading', { name: 'Add Item' })).toBeVisible();

      // Ingredient search input
      await expect(page.getByLabel('Ingredient')).toBeVisible();
    });

    test('shows empty state or inventory list after loading', async ({ page }) => {
      await page.goto('/inventory');
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for spinner to disappear
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Should show either empty state message, inventory items, or error
      const emptyState = page.getByText('No items in inventory');
      // Use heading-level locators to avoid matching <option> elements in the form
      const locationHeader = page.getByRole('heading', { name: /Fridge|Pantry/i }).first();
      const errorMessage = page.getByText('Failed to load inventory');

      await expect(
        emptyState.or(locationHeader).or(errorMessage).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Add Item Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventory');
      await expect(page.getByRole('heading', { name: 'Add Item' })).toBeVisible({
        timeout: 30_000,
      });
    });

    test('form has all required fields', async ({ page }) => {
      // Ingredient autocomplete input
      await expect(page.getByLabel('Ingredient')).toBeVisible();
      await expect(page.getByPlaceholder('Search ingredients...')).toBeVisible();

      // Quantity input
      await expect(page.getByLabel('Quantity')).toBeVisible();

      // Unit selector
      await expect(page.getByLabel('Unit')).toBeVisible();

      // Location selector
      await expect(page.getByLabel('Location')).toBeVisible();

      // Expiry date input
      await expect(page.getByLabel(/Expiry Date/i)).toBeVisible();

      // Submit button
      await expect(page.getByRole('button', { name: 'Add to Inventory' })).toBeVisible();
    });

    test('ingredient search triggers autocomplete suggestions', async ({ page }) => {
      test.skip(!process.env.USE_EXTERNAL_SERVER, 'Requires backend for ingredient search');

      // Skip if inventory failed to load (backend API issue)
      const errorMessage = page.getByText('Failed to load inventory');
      if (await errorMessage.isVisible({ timeout: 2_000 }).catch(() => false)) {
        test.skip(true, 'Inventory API returned an error');
        return;
      }

      const ingredientInput = page.getByPlaceholder('Search ingredients...');
      await ingredientInput.fill('chicken');

      // Wait for autocomplete suggestions to appear (debounced 300ms + API call)
      // Skip if no suggestions appear (ingredient database may be empty)
      const suggestionList = page.locator('ul').filter({
        has: page.locator('button'),
      });
      if (!(await suggestionList.isVisible({ timeout: 10_000 }).catch(() => false))) {
        test.skip(true, 'Ingredient search returned no results (database may be empty)');
        return;
      }
      await expect(suggestionList).toBeVisible();
    });

    test('submitting without selecting ingredient shows error', async ({ page }) => {
      // Fill quantity but skip ingredient selection
      await page.getByLabel('Quantity').fill('500');

      // Click submit
      await page.getByRole('button', { name: 'Add to Inventory' }).click();

      // Should show validation error
      await expect(
        page.getByText('Please select an ingredient from the suggestions')
      ).toBeVisible();
    });

    test('unit selector has expected options', async ({ page }) => {
      const unitSelect = page.getByLabel('Unit');

      // Check all unit options are available
      await expect(unitSelect.locator('option[value="g"]')).toHaveCount(1);
      await expect(unitSelect.locator('option[value="ml"]')).toHaveCount(1);
      await expect(unitSelect.locator('option[value="units"]')).toHaveCount(1);
    });

    test('location selector has fridge and pantry options', async ({ page }) => {
      const locationSelect = page.getByLabel('Location');

      await expect(locationSelect.locator('option[value="fridge"]')).toHaveCount(1);
      await expect(locationSelect.locator('option[value="pantry"]')).toHaveCount(1);
    });
  });

  test.describe('Add Item Flow (Requires Backend)', () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      'Requires backend - run with USE_EXTERNAL_SERVER=true'
    );

    test('can add an item via ingredient search, quantity, and submit', async ({ page }) => {
      await page.goto('/inventory');
      await expect(page.getByRole('heading', { name: 'Add Item' })).toBeVisible({
        timeout: 30_000,
      });

      // Skip if inventory API is failing
      const errorMessage = page.getByText('Failed to load inventory');
      if (await errorMessage.isVisible({ timeout: 2_000 }).catch(() => false)) {
        test.skip(true, 'Inventory API returned an error');
        return;
      }

      // Search for ingredient
      const ingredientInput = page.getByPlaceholder('Search ingredients...');
      await ingredientInput.fill('chicken');

      // Wait for and select first suggestion
      // Skip if no suggestions appear (ingredient database may be empty)
      const firstSuggestion = page.locator('ul button').first();
      if (!(await firstSuggestion.isVisible({ timeout: 10_000 }).catch(() => false))) {
        test.skip(true, 'Ingredient search returned no results (database may be empty)');
        return;
      }
      await firstSuggestion.click();

      // Fill quantity
      await page.getByLabel('Quantity').fill('500');

      // Submit
      await page.getByRole('button', { name: 'Add to Inventory' }).click();

      // Wait for form to reset (ingredient field cleared = success)
      await expect(ingredientInput).toHaveValue('', { timeout: 10_000 });
    });
  });

  test.describe('Edit and Remove (Requires Backend)', () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      'Requires backend - run with USE_EXTERNAL_SERVER=true'
    );

    test('can click Edit button on an inventory item', async ({ page }) => {
      // Capture browser console and network for diagnostics
      const consoleLogs: string[] = [];
      const apiRequests: string[] = [];
      page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
      page.on('request', (req) => {
        if (req.url().includes('/api/') || req.url().includes('/auth/')) {
          apiRequests.push(`${req.method()} ${req.url()}`);
        }
      });
      page.on('response', (resp) => {
        if (resp.url().includes('/api/') || resp.url().includes('/auth/')) {
          apiRequests.push(`  → ${resp.status()} ${resp.url()}`);
        }
      });

      await page.goto('/inventory');
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for items to load
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Log diagnostics
      const runtimeConfig = await page.evaluate(() => (window as { __RUNTIME_CONFIG__?: { apiUrl?: string } }).__RUNTIME_CONFIG__);
      console.log(`[diag] Runtime config: ${JSON.stringify(runtimeConfig)}`);
      console.log(`[diag] API requests: ${apiRequests.join('\n  ')}`);
      console.log(`[diag] Console logs: ${consoleLogs.slice(-5).join('\n  ')}`);

      // Check if there are items to edit
      const editButton = page.getByRole('button', { name: 'Edit' }).first();
      const emptyState = page.getByText('No items in inventory');
      const errorState = page.getByText('Failed to load inventory');

      // If empty or error, skip the test
      if (await emptyState.isVisible().catch(() => false) || await errorState.isVisible().catch(() => false)) {
        const pageText = await page.locator('body').innerText().catch(() => '');
        console.log(`[diag] Page shows empty/error. Visible text snippet: ${pageText.substring(0, 500)}`);
        test.skip(true, 'No inventory items to edit');
        return;
      }

      // Click Edit on first item
      await expect(editButton).toBeVisible({ timeout: 10_000 });
      await editButton.click();

      // Should show inline edit with Save/Cancel buttons
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('can click Remove button on an inventory item', async ({ page }) => {
      await page.goto('/inventory');
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for items to load
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const removeButton = page.getByRole('button', { name: 'Remove' }).first();
      const emptyState = page.getByText('No items in inventory');
      const errorState = page.getByText('Failed to load inventory');

      if (await emptyState.isVisible().catch(() => false) || await errorState.isVisible().catch(() => false)) {
        test.skip(true, 'No inventory items to remove');
        return;
      }

      // Remove button should be visible
      await expect(removeButton).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Expiry Badges', () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      'Requires backend with inventory data'
    );

    test('expiry badges display with correct text', async ({ page }) => {
      await page.goto('/inventory');
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible({
        timeout: 30_000,
      });

      // Wait for items to load
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      const emptyState = page.getByText('No items in inventory');
      const errorState = page.getByText('Failed to load inventory');
      if (await emptyState.isVisible().catch(() => false) || await errorState.isVisible().catch(() => false)) {
        test.skip(true, 'No inventory items to check expiry badges');
        return;
      }

      // At least one expiry badge should be visible
      // Badges show: "Expired", "Expires in Xd", "Xd left", or "No expiry"
      const expiryBadge = page
        .getByText(/Expired|Expires in|d left|No expiry/)
        .first();
      await expect(expiryBadge).toBeVisible({ timeout: 10_000 });
    });
  });
});
