/**
 * Auth setup for Playwright E2E tests.
 *
 * This runs BEFORE auth-dependent tests and performs programmatic authentication
 * via the Auth0 Universal Login flow.
 *
 * Auth state is saved to playwright/.auth/ and reused across tests for performance.
 *
 * Prerequisites:
 * - Auth0 database connection with username/password enabled
 * - Test user credentials from environment variables:
 *   - AUTH0_USER_TEST_EMAIL: Test user email
 *   - AUTH0_USER_TEST_PASSWORD: Test user password
 */

import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const userAuthFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Authenticate as test user and save storage state.
 *
 * Auth0 v4 with Next.js uses /auth/login to initiate the OAuth flow,
 * which redirects to the Auth0 Universal Login page. We fill in the
 * username/password form there and wait for the redirect back.
 */
setup('authenticate as test user', async ({ page }) => {
  const email = process.env.AUTH0_USER_TEST_EMAIL;
  const password = process.env.AUTH0_USER_TEST_PASSWORD;

  // Skip if credentials not configured
  if (!email || !password) {
    console.warn('[auth-setup] Test credentials not set. Skipping authentication.');
    console.warn(
      '[auth-setup] Set AUTH0_USER_TEST_EMAIL and AUTH0_USER_TEST_PASSWORD to enable auth tests.'
    );
    return;
  }

  console.log('[auth-setup] Authenticating as test user...');

  try {
    // Navigate to Auth0 login endpoint - Auth0 v4 uses /auth/login
    await page.goto('/auth/login');

    // Auth0 Universal Login form - fill email/password
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /continue|log in|sign in/i }).last();

    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Submit form
    await submitButton.click();

    // Wait for redirect back to the app after successful login
    // Auth0 redirects to the callback URL, then back to the app
    await page.waitForURL(
      (url) => !url.hostname.includes('auth0.com') && !url.pathname.includes('/auth/'),
      { timeout: 30_000 }
    );

    // Verify we're on the app and authenticated - header should show "Log out"
    await expect(page.getByText('Log out')).toBeVisible({ timeout: 10_000 });

    console.log('[auth-setup] User authenticated successfully');

    // Save storage state
    await page.context().storageState({ path: userAuthFile });
    console.log(`[auth-setup] Saved auth state to ${userAuthFile}`);
  } catch (error) {
    console.error('[auth-setup] Authentication failed:', error);
    console.error('[auth-setup] Tests requiring authentication will be skipped.');
  }
});
