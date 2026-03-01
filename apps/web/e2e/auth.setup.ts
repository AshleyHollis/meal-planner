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
 *
 * Handles both single-page and identifier-first (email then password) flows.
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
    console.log(`[auth-setup] Reached Auth0 login page: ${page.url()}`);

    // Check if Auth0 is showing an error page
    const errorElement = page.locator('.error-page, [class*="error"], #error-message').first();
    try {
      await errorElement.waitFor({ timeout: 2_000 });
      const errorText = await errorElement.textContent();
      console.error(`[auth-setup] Auth0 error page detected: ${errorText}`);
    } catch {
      // No error page — good, continue with login
    }

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
      console.log('[auth-setup] Email field handled');
    } catch {
      console.log('[auth-setup] Email field not found (may be pre-filled or identifier-first)');
    }

    // Check if password is already visible (single-page login form)
    let passwordInput = page
      .locator('input[name="password"], input[id="password"], input[type="password"]')
      .first();
    let passwordVisible = await passwordInput.isVisible().catch(() => false);

    // Identifier-first flow: click Continue/Submit to reveal password field
    if (!passwordVisible) {
      console.log('[auth-setup] Password not visible — trying identifier-first flow');
      const continueBtn = page
        .locator('button[name="action"], button[type="submit"], button[data-action-button-primary]')
        .first();
      try {
        await continueBtn.waitFor({ timeout: 5_000 });
        await continueBtn.click();
        console.log('[auth-setup] Clicked Continue button');
        // Wait for password field to appear after transition
        await passwordInput.waitFor({ timeout: 10_000 });
        passwordVisible = true;
      } catch {
        console.log('[auth-setup] Continue button not found or password still not visible');
      }
    }

    if (!passwordVisible) {
      // Last resort: log page content for debugging
      const pageContent = await page.content();
      const title = await page.title();
      console.error(`[auth-setup] Page title: ${title}`);
      console.error(`[auth-setup] Page URL: ${page.url()}`);
      console.error(`[auth-setup] Page content (first 2000 chars): ${pageContent.substring(0, 2000)}`);
      throw new Error('Password field not found on Auth0 login page');
    }

    // Fill password
    await passwordInput.fill(password);
    console.log('[auth-setup] Password filled');

    // Submit Auth0 login form
    const submitBtn = page.locator('button[name="action"], button[type="submit"]').first();
    await submitBtn.click();
    console.log('[auth-setup] Login form submitted');

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
