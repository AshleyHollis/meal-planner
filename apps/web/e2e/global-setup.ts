/**
 * Global setup for Playwright E2E tests.
 *
 * This runs ONCE before all tests when USE_EXTERNAL_SERVER is set.
 * It warms up the SWA frontend and waits for the API to be ready.
 */

import { FullConfig } from "@playwright/test";

/**
 * Warm up the SWA (Static Web App) preview environment.
 *
 * SWA preview environments cold-start on first request: the Node.js SSR
 * container must spin up and compile the Next.js app. This can take 60-120s.
 *
 * By absorbing this penalty here (once, before any tests run), individual
 * tests no longer need try/catch/skip wrappers around page.goto().
 */
async function warmUpSwa(): Promise<void> {
  const WEB_URL = process.env.BASE_URL || "http://localhost:3000";
  const maxRetries = 12;
  const retryDelay = 10_000; // 10 seconds between retries (120s max wait)

  console.log(`[global-setup] Warming up SWA at ${WEB_URL}...`);
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(WEB_URL, {
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (
        response.ok ||
        response.status === 308 ||
        response.status === 307 ||
        response.status === 302
      ) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(
          `[global-setup] SWA warm-up complete (${elapsed}s, status=${response.status})`,
        );
        return;
      }
      console.log(
        `[global-setup] SWA attempt ${attempt}/${maxRetries}: status=${response.status}`,
      );
    } catch (error) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `[global-setup] SWA attempt ${attempt}/${maxRetries} failed (${elapsed}s): ${error instanceof Error ? error.message : error}`,
      );
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(
    `[global-setup] SWA warm-up did not succeed after ${elapsed}s - tests may experience cold-start delays`,
  );
}

/**
 * Warm up the SWA auth endpoint.
 *
 * The /api/auth/login route is served by Next.js SSR and may cold-start
 * independently from the frontend. Pre-warming it ensures the auth redirect
 * works when auth.setup.ts runs.
 */
async function warmUpAuth(): Promise<void> {
  const WEB_URL = process.env.BASE_URL || "http://localhost:3000";
  const maxRetries = 6;
  const retryDelay = 5_000;

  console.log(`[global-setup] Warming up auth endpoint...`);
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(`${WEB_URL}/api/auth/login`, {
        redirect: "manual", // Don't follow redirect, just verify endpoint responds
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      // 302/307 means the auth endpoint is working (redirecting to Auth0)
      if (
        response.status === 302 ||
        response.status === 307 ||
        response.status === 200
      ) {
        console.log(
          `[global-setup] Auth endpoint ready (${elapsed}s, status=${response.status})`,
        );
        return;
      }
      console.log(
        `[global-setup] Auth attempt ${attempt}/${maxRetries}: status=${response.status} (${elapsed}s)`,
      );
    } catch (error) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `[global-setup] Auth attempt ${attempt}/${maxRetries} failed (${elapsed}s): ${error instanceof Error ? error.message : error}`,
      );
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  console.log(
    "[global-setup] Auth endpoint warm-up did not succeed - auth tests may be slow",
  );
}

/**
 * Wait for the backend API to be ready.
 */
async function waitForApi(): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const maxRetries = 12;
  const retryDelay = 10_000;

  console.log(`[global-setup] Waiting for API at ${API_URL}...`);
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(`${API_URL}/health/live`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[global-setup] API ready (${elapsed}s)`);
        return;
      }
      console.log(
        `[global-setup] API attempt ${attempt}/${maxRetries}: status=${response.status}`,
      );
    } catch (error) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `[global-setup] API attempt ${attempt}/${maxRetries} failed (${elapsed}s): ${error instanceof Error ? error.message : error}`,
      );
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  console.log("[global-setup] API did not become ready - tests may fail");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_config: FullConfig) {
  if (!process.env.USE_EXTERNAL_SERVER) {
    console.log("[global-setup] Skipping (USE_EXTERNAL_SERVER not set)");
    return;
  }

  // Warm up the SWA frontend first
  await warmUpSwa();

  // Warm up the auth endpoint (SWA cold-starts for API routes separately)
  await warmUpAuth();

  // Then wait for the API backend
  await waitForApi();
}

export default globalSetup;
