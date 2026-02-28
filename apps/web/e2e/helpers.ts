import { Page, expect } from '@playwright/test';

/**
 * Shared E2E test helpers for Meal Planner.
 */

// ---------------------------------------------------------------------------
// API Readiness
// ---------------------------------------------------------------------------

/**
 * Get the API base URL from environment or default to localhost.
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

/**
 * Wait for the backend API to be ready by polling a health or list endpoint.
 * Retries up to maxRetries times with a delay between each attempt.
 */
export async function waitForApiReady(
  options: { maxRetries?: number; retryDelayMs?: number } = {}
): Promise<boolean> {
  const { maxRetries = 10, retryDelayMs = 5_000 } = options;
  const apiUrl = getApiUrl();

  console.log(`[helpers] Waiting for API at ${apiUrl}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(`${apiUrl}/api/v1/ingredients?limit=1`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        console.log(`[helpers] API ready (attempt ${attempt})`);
        return true;
      }
      console.log(`[helpers] API attempt ${attempt}/${maxRetries}: status=${response.status}`);
    } catch (error) {
      console.log(
        `[helpers] API attempt ${attempt}/${maxRetries} failed: ${error instanceof Error ? error.message : error}`
      );
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  console.warn('[helpers] API did not become ready');
  return false;
}

// ---------------------------------------------------------------------------
// Login helper
// ---------------------------------------------------------------------------

/**
 * Log in via Auth0 Universal Login.
 *
 * This navigates to /auth/login which triggers the Auth0 OAuth flow.
 * Only needed when NOT using stored auth state from auth.setup.ts.
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/auth/login');

  const emailInput = page.getByLabel(/email/i);
  const passwordInput = page.getByLabel(/password/i);
  const submitButton = page.getByRole('button', { name: /continue|log in|sign in/i }).last();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  // Wait for redirect back to the app
  await page.waitForURL(
    (url) => !url.hostname.includes('auth0.com') && !url.pathname.includes('/auth/'),
    { timeout: 30_000 }
  );

  await expect(page.getByText('Log out')).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Page load helpers
// ---------------------------------------------------------------------------

/**
 * Wait for the page to finish loading (spinner gone, content visible).
 * Looks for the main heading to be visible and any Spinner to disappear.
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  // Wait for the main content area to be present
  await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

  // Wait for any loading spinners to disappear
  const spinners = page.locator('[class*="animate-spin"]');
  const spinnerCount = await spinners.count();
  if (spinnerCount > 0) {
    for (let i = 0; i < spinnerCount; i++) {
      await expect(spinners.nth(i)).not.toBeVisible({ timeout: 30_000 });
    }
  }
}

// ---------------------------------------------------------------------------
// Common selectors
// ---------------------------------------------------------------------------

/** Navigation selectors - bottom nav bar */
export const NAV = {
  home: 'nav >> text=Home',
  inventory: 'nav >> text=Inventory',
  mealPlan: 'nav >> text=Meal Plan',
  grocery: 'nav >> text=Grocery',
} as const;

/** Header selectors */
export const HEADER = {
  appTitle: 'text=Meal Planner',
  logIn: 'text=Log in',
  logOut: 'text=Log out',
} as const;
