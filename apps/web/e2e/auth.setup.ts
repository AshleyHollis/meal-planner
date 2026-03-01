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

import { test as setup } from '@playwright/test';
import * as path from 'path';

const userAuthFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Authenticate via Auth0 Universal Login.
 *
 * Navigates to /api/auth/login (which redirects to Auth0), fills the
 * username/password on Auth0's login page, and waits for redirect back.
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
    // Navigate to Auth0 login endpoint with login_hint for email pre-fill
    const loginUrl = `/api/auth/login?connection=Username-Password-Authentication&login_hint=${encodeURIComponent(email)}`;
    await page.goto(loginUrl);

    // Wait for redirect to Auth0's login page
    await page.waitForURL((url) => url.hostname.includes('auth0.com'), { timeout: 20_000 });
    console.log('[auth-setup] Reached Auth0 login page');

    // Auth0 Universal Login — email may already be pre-filled via login_hint
    const emailInput = page
      .locator('input[name="username"], input[id="username"], input[type="email"]')
      .first();
    try {
      await emailInput.waitFor({ timeout: 5_000 });
      const currentEmail = await emailInput.inputValue();
      if (!currentEmail) {
        await emailInput.fill(email);
      }
    } catch {
      // email field not present or already filled — continue
    }

    // Fill password on Auth0's page
    const passwordInput = page
      .locator('input[name="password"], input[id="password"], input[type="password"]')
      .first();
    await passwordInput.waitFor({ timeout: 15_000 });
    await passwordInput.fill(password);

    // Submit Auth0 login form
    const submitBtn = page.locator('button[name="action"], button[type="submit"]').first();
    await submitBtn.click();

    // Wait for redirect back to the app (away from auth0.com)
    await page.waitForURL((url) => !url.hostname.includes('auth0.com'), { timeout: 30_000 });
    console.log('[auth-setup] User authenticated successfully — redirected to app');

    // Save storage state
    await page.context().storageState({ path: userAuthFile });
    console.log(`[auth-setup] Saved auth state to ${userAuthFile}`);
  } catch (error) {
    console.error('[auth-setup] Authentication failed:', error);
    console.error('[auth-setup] Tests requiring authentication will be skipped.');
  }
});
