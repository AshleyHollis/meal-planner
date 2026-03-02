/**
 * E2E data seeding setup for Playwright tests.
 *
 * Runs AFTER auth.setup.ts (has authenticated storage state) and BEFORE
 * the main test suites. Seeds inventory items and creates a meal plan
 * so that tests don't skip due to missing data.
 *
 * Steps:
 *   1. Get access token from Auth0 BFF endpoint
 *   2. Look up seeded ingredients (from DB migration 002)
 *   3. Add inventory items with varied expiry dates
 *   4. Create a meal plan and wait for worker to complete
 *      (worker generates recipes, meal slots, and grocery list)
 */

import { test as setup } from '@playwright/test';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000';

interface SeedIngredient {
  id: string;
  name: string;
  default_unit: string;
  default_storage: string;
}

/**
 * Get a JWT access token by calling the Auth0 BFF token endpoint.
 * The page's storage state (cookies) provides the session.
 */
async function getAccessToken(
  request: ReturnType<typeof setup extends (n: string, fn: (args: infer A) => void) => void ? never : never>,
  baseURL: string
): Promise<string | null> {
  // Use absolute URL to hit the frontend's auth endpoint
  const resp = await request.get(`${baseURL}/auth/access-token`);
  if (!resp.ok()) {
    console.log(`[seed-data] Failed to get access token: ${resp.status()}`);
    return null;
  }
  const data = (await resp.json()) as { token: string };
  return data.token;
}

/**
 * Search for an ingredient by name. Returns the first match or null.
 */
async function findIngredient(
  request: Parameters<Parameters<typeof setup>[1]>[0]['request'],
  name: string,
  token: string
): Promise<SeedIngredient | null> {
  const resp = await request.get(`${API_URL}/api/v1/ingredients?q=${encodeURIComponent(name)}&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok()) return null;
  const data = (await resp.json()) as SeedIngredient[];
  return data.length > 0 ? data[0] : null;
}

/**
 * Return next Monday as ISO string (meal plans must start on Monday).
 */
function getNextMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntil = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntil);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

setup('seed test data', async ({ request, baseURL }) => {
  if (!process.env.USE_EXTERNAL_SERVER) {
    console.log('[seed-data] Skipping (USE_EXTERNAL_SERVER not set)');
    return;
  }

  const effectiveBaseURL = baseURL || process.env.BASE_URL || 'http://localhost:3000';

  // ── Step 1: Get access token ──────────────────────────────────────────
  console.log('[seed-data] Getting access token...');
  const resp = await request.get(`${effectiveBaseURL}/auth/access-token`);
  if (!resp.ok()) {
    console.warn(`[seed-data] Could not get access token (${resp.status()}), skipping seeding`);
    return;
  }
  const tokenData = (await resp.json()) as { token: string };
  const token = tokenData.token;
  if (!token) {
    console.warn('[seed-data] Access token is empty, skipping seeding');
    return;
  }
  console.log('[seed-data] Access token acquired');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // ── Step 2: Look up ingredients ───────────────────────────────────────
  console.log('[seed-data] Looking up ingredients...');
  const ingredientNames = ['chicken breast', 'jasmine rice', 'broccoli', 'olive oil', 'garlic'];
  const ingredients: SeedIngredient[] = [];

  for (const name of ingredientNames) {
    const ing = await findIngredient(request, name, token);
    if (ing) {
      ingredients.push(ing);
      console.log(`[seed-data]   Found: ${ing.name} (${ing.id})`);
    }
  }

  if (ingredients.length === 0) {
    console.warn('[seed-data] No ingredients found — ingredient DB may be empty');
    return;
  }

  // ── Step 3: Add inventory items with varied expiry dates ──────────────
  console.log('[seed-data] Adding inventory items...');

  const now = new Date();
  const expiryVariants: Array<{ offsetDays: number | null; label: string }> = [
    { offsetDays: -2, label: 'expired 2 days ago' },
    { offsetDays: 3, label: 'expires in 3 days' },
    { offsetDays: 14, label: 'expires in 14 days' },
    { offsetDays: null, label: 'no expiry' },
    { offsetDays: 30, label: 'expires in 30 days' },
  ];

  let inventoryAdded = 0;
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    const variant = expiryVariants[i % expiryVariants.length];

    let expiryDate: string | null = null;
    if (variant.offsetDays !== null) {
      const d = new Date(now);
      d.setDate(d.getDate() + variant.offsetDays);
      expiryDate = d.toISOString();
    }

    const body = {
      ingredient_id: ing.id,
      quantity: 500,
      unit: ing.default_unit || 'g',
      location: ing.default_storage || 'fridge',
      ...(expiryDate ? { expiry_date: expiryDate } : {}),
    };

    const addResp = await request.post(`${API_URL}/api/v1/inventory`, {
      headers,
      data: body,
    });

    if (addResp.ok()) {
      inventoryAdded++;
      console.log(`[seed-data]   Added ${ing.name} to inventory (${variant.label})`);
    } else {
      const errBody = await addResp.text().catch(() => '');
      console.log(`[seed-data]   Failed to add ${ing.name}: ${addResp.status()} ${errBody}`);
    }
  }
  console.log(`[seed-data] Inventory seeded: ${inventoryAdded}/${ingredients.length} items`);

  // ── Step 4: Create a meal plan ────────────────────────────────────────
  console.log('[seed-data] Creating meal plan...');
  const weekStart = getNextMonday();
  const planResp = await request.post(`${API_URL}/api/v1/meal-plans`, {
    headers,
    data: { week_start_date: weekStart },
  });

  if (!planResp.ok()) {
    const errText = await planResp.text().catch(() => '');
    console.warn(`[seed-data] Failed to create meal plan: ${planResp.status()} ${errText}`);
    console.log('[seed-data] Inventory was seeded — some tests will pass, meal plan tests may skip');
    return;
  }

  const plan = (await planResp.json()) as { id: string; status: string };
  console.log(`[seed-data] Created meal plan ${plan.id} (status: ${plan.status})`);

  // ── Step 5: Wait for worker to process the plan ───────────────────────
  console.log('[seed-data] Waiting for meal plan generation (up to 120s)...');
  const maxWait = 120_000;
  const pollInterval = 5_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const statusResp = await request.get(`${API_URL}/api/v1/meal-plans/${plan.id}`, {
      headers,
    });

    if (statusResp.ok()) {
      const updated = (await statusResp.json()) as {
        id: string;
        status: string;
        slots?: Array<{ id: string }>;
      };

      if (updated.status !== 'draft') {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[seed-data] Meal plan ${updated.status} after ${elapsed}s`);
        if (updated.status === 'active') {
          console.log(`[seed-data]   ${updated.slots?.length || 0} meal slots created`);
        } else if (updated.status === 'failed') {
          console.log('[seed-data]   Plan generation failed (LLM may not be configured)');
        }
        return;
      }
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.warn(`[seed-data] Meal plan still in draft after ${elapsed}s — worker may not be running`);
  console.log('[seed-data] Inventory was seeded — inventory and form tests will pass');
});
