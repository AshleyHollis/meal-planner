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

import { test as setup } from "@playwright/test";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://localhost:8000";

interface SeedIngredient {
  id: string;
  name: string;
  default_unit: string;
  default_storage: string;
}

function getNextMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntil = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntil);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

setup("seed test data", async ({ request, baseURL }) => {
  if (!process.env.USE_EXTERNAL_SERVER) {
    console.log("[seed-data] Skipping (USE_EXTERNAL_SERVER not set)");
    return;
  }

  const effectiveBaseURL =
    baseURL || process.env.BASE_URL || "http://localhost:3000";

  // ── Step 1: Get access token ──────────────────────────────────────────
  console.log("[seed-data] Getting access token...");
  const tokenResp = await request.get(`${effectiveBaseURL}/auth/access-token`);
  if (!tokenResp.ok()) {
    console.warn(
      `[seed-data] Could not get access token (${tokenResp.status()}), skipping seeding`,
    );
    return;
  }
  const tokenData = (await tokenResp.json()) as { token: string };
  const token = tokenData.token;
  if (!token) {
    console.warn("[seed-data] Access token is empty, skipping seeding");
    return;
  }
  console.log("[seed-data] Access token acquired");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ── Step 2: Look up ingredients ───────────────────────────────────────
  console.log("[seed-data] Looking up ingredients...");
  const ingredientNames = [
    "chicken breast",
    "jasmine rice",
    "broccoli",
    "olive oil",
    "garlic",
  ];
  const ingredients: SeedIngredient[] = [];

  for (const name of ingredientNames) {
    const resp = await request.get(
      `${API_URL}/api/v1/ingredients?q=${encodeURIComponent(name)}&limit=1`,
      { headers },
    );
    if (resp.ok()) {
      const data = (await resp.json()) as SeedIngredient[];
      if (data.length > 0) {
        ingredients.push(data[0]);
        console.log(`[seed-data]   Found: ${data[0].name} (${data[0].id})`);
      } else {
        console.log(`[seed-data]   Search "${name}": 200 OK but 0 results`);
      }
    } else {
      const body = await resp.text().catch(() => "");
      console.log(
        `[seed-data]   Search "${name}": ${resp.status()} ${body.substring(0, 200)}`,
      );
    }
  }

  if (ingredients.length === 0) {
    console.warn(
      "[seed-data] No ingredients found — ingredient DB may be empty",
    );
    return;
  }

  // ── Step 3: Add inventory items with varied expiry dates ──────────────
  console.log("[seed-data] Adding inventory items...");

  const now = new Date();
  const expiryVariants: Array<{ offsetDays: number | null; label: string }> = [
    { offsetDays: -2, label: "expired 2 days ago" },
    { offsetDays: 3, label: "expires in 3 days" },
    { offsetDays: 14, label: "expires in 14 days" },
    { offsetDays: null, label: "no expiry" },
    { offsetDays: 30, label: "expires in 30 days" },
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
      unit: ing.default_unit || "g",
      location: ing.default_storage || "fridge",
      ...(expiryDate ? { expiry_date: expiryDate } : {}),
    };

    const addResp = await request.post(`${API_URL}/api/v1/inventory`, {
      headers,
      data: body,
    });

    if (addResp.ok()) {
      inventoryAdded++;
      console.log(
        `[seed-data]   Added ${ing.name} to inventory (${variant.label})`,
      );
    } else {
      const errBody = await addResp.text().catch(() => "");
      console.log(
        `[seed-data]   Failed to add ${ing.name}: ${addResp.status()} ${errBody}`,
      );
    }
  }
  console.log(
    `[seed-data] Inventory seeded: ${inventoryAdded}/${ingredients.length} items`,
  );

  // ── Step 4: Create a meal plan ────────────────────────────────────────
  console.log("[seed-data] Creating meal plan...");
  const weekStart = getNextMonday();
  const planResp = await request.post(`${API_URL}/api/v1/meal-plans`, {
    headers,
    data: { week_start_date: weekStart },
  });

  if (!planResp.ok()) {
    const errText = await planResp.text().catch(() => "");
    console.warn(
      `[seed-data] Failed to create meal plan: ${planResp.status()} ${errText}`,
    );
    console.log(
      "[seed-data] Inventory was seeded — some tests will pass, meal plan tests may skip",
    );
    return;
  }

  const plan = (await planResp.json()) as { id: string; status: string };
  console.log(
    `[seed-data] Created meal plan ${plan.id} (status: ${plan.status})`,
  );

  // ── Step 5: Wait for worker to process the plan ───────────────────────
  console.log("[seed-data] Waiting for meal plan generation (up to 120s)...");
  const maxWait = 120_000;
  const pollInterval = 5_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const statusResp = await request.get(
      `${API_URL}/api/v1/meal-plans/${plan.id}`,
      {
        headers,
      },
    );

    if (statusResp.ok()) {
      const updated = (await statusResp.json()) as {
        id: string;
        status: string;
        slots?: Array<{ id: string }>;
      };

      if (updated.status !== "draft") {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(
          `[seed-data] Meal plan ${updated.status} after ${elapsed}s`,
        );
        if (updated.status === "active") {
          console.log(
            `[seed-data]   ${updated.slots?.length || 0} meal slots created`,
          );
        } else if (updated.status === "failed") {
          console.log(
            "[seed-data]   Plan generation failed (LLM may not be configured)",
          );
        }
        return;
      }
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.warn(
    `[seed-data] Meal plan still in draft after ${elapsed}s — worker may not be running`,
  );
  console.log(
    "[seed-data] Inventory was seeded — inventory and form tests will pass",
  );
});
