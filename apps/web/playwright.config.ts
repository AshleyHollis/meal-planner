import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Meal Planner E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Global setup - warms up SWA and waits for API readiness
  globalSetup: process.env.USE_EXTERNAL_SERVER ? './e2e/global-setup.ts' : undefined,

  // Maximum timeout for each test
  // 180s to accommodate SWA cold starts and API latency
  timeout: 180_000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests once for reliability
  retries: 1,

  // Workers: 4 on CI for parallelism, 1 locally for debugging
  workers: process.env.CI ? 4 : 1,

  // Reporter to use
  reporter: [['html', { open: 'never' }], ['list']],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Standard viewport
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects
  projects: [
    // Auth setup - authenticates with Auth0 and saves storage state
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Data seeding - seeds inventory, meal plan, grocery data via API
    {
      name: 'seed-data',
      testMatch: /seed-data\.setup\.ts/,
      use: {
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['auth-setup'],
    },
    // Chromium tests - use authenticated storage state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated storage state for tests that require auth
        storageState: 'playwright/.auth/user.json',
      },
      // Run after auth and data seeding
      dependencies: ['seed-data'],
    },
  ],

  // Run local dev server before starting the tests
  // Set USE_EXTERNAL_SERVER=true to skip when using a deployed environment
  webServer: process.env.USE_EXTERNAL_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000, // 2 minutes for Next.js to start
      },
});
