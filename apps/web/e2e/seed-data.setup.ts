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

import { test as setup, expect } from "@playwright/test";

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
  // Return date-only string to avoid timezone issues (UTC vs local)
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  expect(
    tokenResp.ok(),
    `Failed to get access token: ${tokenResp.status()}`,
  ).toBeTruthy();
  const tokenData = (await tokenResp.json()) as { token: string };
  const token = tokenData.token;
  expect(token, "Access token is empty").toBeTruthy();
  console.log("[seed-data] Access token acquired");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ── Step 2: Look up ingredients ───────────────────────────────────────
  const ingredientNames = [
    // Keep existing
    "chicken breast",
    "jasmine rice",
    "broccoli",
    "olive oil",
    "garlic",
    // Add proteins
    "eggs",
    "beef mince",
    "salmon fillet",
    "bacon rashers",
    // Add dairy
    "milk",
    "butter",
    "tasty cheese",
    "greek yoghurt",
    "parmesan",
    // Add carbs
    "spaghetti",
    "bread (sliced)",
    "plain flour",
    "potato",
    // Add produce
    "onion",
    "tomato",
    "carrot",
    "spinach",
    "capsicum",
    "lemon",
    // Add pantry
    "salt",
    "black pepper",
    "soy sauce",
    "diced tomatoes (canned)",
    "chicken stock",
  ];
  console.log(
    `[seed-data] Looking up ${ingredientNames.length} ingredients in parallel...`,
  );
  const ingredientPromises = ingredientNames.map(async (name) => {
    const resp = await request.get(
      `${API_URL}/api/v1/ingredients?q=${encodeURIComponent(name)}&limit=1`,
      { headers },
    );
    if (resp.ok()) {
      const data = (await resp.json()) as SeedIngredient[];
      if (data.length > 0) return data[0];
    }
    return null;
  });
  const ingredientResults = await Promise.all(ingredientPromises);
  const ingredients: SeedIngredient[] = ingredientResults.filter(
    (r): r is SeedIngredient => r !== null,
  );
  console.log(
    `[seed-data] Ingredients found: ${ingredients.length}/${ingredientNames.length}`,
  );
  expect(
    ingredients.length,
    "No ingredients found — ingredient DB may be empty. This is critical for tests.",
  ).toBeGreaterThan(0);

  // ── Step 3: Clear existing inventory then add fresh items ───────────────
  console.log("[seed-data] Clearing existing inventory before seeding...");
  const clearResp = await request.get(`${API_URL}/api/v1/inventory`, {
    headers,
  });
  if (clearResp.ok()) {
    const existingItems = (await clearResp.json()) as Array<{ id: string }>;
    console.log(
      `[seed-data]   Deleting ${existingItems.length} existing inventory items`,
    );
    await Promise.all(
      existingItems.map((item) =>
        request.delete(`${API_URL}/api/v1/inventory/${item.id}`, { headers }),
      ),
    );
    console.log("[seed-data]   Existing inventory cleared");
  } else {
    console.log(
      `[seed-data]   Could not list inventory for cleanup: ${clearResp.status()}`,
    );
  }

  console.log("[seed-data] Adding inventory items in parallel...");

  const now = new Date();
  const expiryVariants: Array<{ offsetDays: number | null; label: string }> = [
    { offsetDays: -2, label: "expired 2 days ago" },
    { offsetDays: 3, label: "expires in 3 days" },
    { offsetDays: 7, label: "expires in 7 days" },
    { offsetDays: 14, label: "expires in 14 days" },
    { offsetDays: 21, label: "expires in 21 days" },
    { offsetDays: 30, label: "expires in 30 days" },
    { offsetDays: 90, label: "expires in 90 days" },
    { offsetDays: 180, label: "expires in 180 days" },
    { offsetDays: 365, label: "expires in 365 days" },
    { offsetDays: null, label: "no expiry" },
  ];

  const inventoryPromises = ingredients.map(async (ing, i) => {
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
    return addResp.ok() ? 1 : 0;
  });
  const inventoryResults = await Promise.all(inventoryPromises);
  let inventoryAdded = inventoryResults.reduce(
    (sum: number, v: number) => sum + v,
    0,
  );
  console.log(
    `[seed-data] Inventory seeded: ${inventoryAdded}/${ingredients.length} items`,
  );

  // Fail hard if no inventory items could be added — this catches backend 500 errors
  expect(
    inventoryAdded,
    `Inventory seeding failed: 0/${ingredients.length} items added. Backend may be returning 500 errors.`,
  ).toBeGreaterThan(0);

  // ── Step 3b: Seed product mappings for shop filtering E2E tests ──────
  console.log("[seed-data] Seeding product mappings in parallel...");
  const shopAssignments: Array<{
    ingredientName: string;
    brand: string;
    productName: string;
    shop: string;
    price: number;
  }> = [
    // Coles products
    {
      ingredientName: "chicken breast",
      brand: "Coles",
      productName: "RSPCA Chicken Breast 1kg",
      shop: "Coles",
      price: 12.0,
    },
    {
      ingredientName: "milk",
      brand: "Dairy Farmers",
      productName: "Full Cream Milk 2L",
      shop: "Coles",
      price: 3.8,
    },
    {
      ingredientName: "bread (sliced)",
      brand: "Tip Top",
      productName: "The One White Bread 700g",
      shop: "Coles",
      price: 3.5,
    },
    {
      ingredientName: "bacon rashers",
      brand: "Coles",
      productName: "Rindless Bacon 250g",
      shop: "Coles",
      price: 6.5,
    },
    {
      ingredientName: "tasty cheese",
      brand: "Bega",
      productName: "Tasty Block Cheese 500g",
      shop: "Coles",
      price: 7.0,
    },
    {
      ingredientName: "diced tomatoes (canned)",
      brand: "Coles",
      productName: "Diced Tomatoes 400g",
      shop: "Coles",
      price: 1.0,
    },
    {
      ingredientName: "spinach",
      brand: "Fresh",
      productName: "Baby Spinach 120g",
      shop: "Coles",
      price: 3.0,
    },
    // Woolworths products
    {
      ingredientName: "jasmine rice",
      brand: "SunRice",
      productName: "Jasmine Rice 5kg",
      shop: "Woolworths",
      price: 9.0,
    },
    {
      ingredientName: "eggs",
      brand: "Woolworths",
      productName: "Free Range Eggs 12pk",
      shop: "Woolworths",
      price: 7.0,
    },
    {
      ingredientName: "salmon fillet",
      brand: "Tassal",
      productName: "Tasmanian Salmon 200g",
      shop: "Woolworths",
      price: 9.5,
    },
    {
      ingredientName: "greek yoghurt",
      brand: "Chobani",
      productName: "Greek Yoghurt 907g",
      shop: "Woolworths",
      price: 8.0,
    },
    {
      ingredientName: "spaghetti",
      brand: "San Remo",
      productName: "Spaghetti No.5 500g",
      shop: "Woolworths",
      price: 2.0,
    },
    {
      ingredientName: "onion",
      brand: "Fresh",
      productName: "Brown Onions 1kg",
      shop: "Woolworths",
      price: 2.0,
    },
    {
      ingredientName: "broccoli",
      brand: "Fresh",
      productName: "Broccoli Head",
      shop: "Woolworths",
      price: 3.5,
    },
    {
      ingredientName: "parmesan",
      brand: "Perfect Italiano",
      productName: "Parmesan Grated 125g",
      shop: "Woolworths",
      price: 4.5,
    },
    // Aldi products
    {
      ingredientName: "olive oil",
      brand: "Cobram Estate",
      productName: "Extra Virgin 750ml",
      shop: "Aldi",
      price: 8.5,
    },
    {
      ingredientName: "beef mince",
      brand: "Aldi",
      productName: "Beef Mince 500g",
      shop: "Aldi",
      price: 5.5,
    },
    {
      ingredientName: "butter",
      brand: "Westacre",
      productName: "Salted Butter 500g",
      shop: "Aldi",
      price: 4.5,
    },
    {
      ingredientName: "plain flour",
      brand: "Molenaar",
      productName: "Plain Flour 1kg",
      shop: "Aldi",
      price: 1.5,
    },
    {
      ingredientName: "soy sauce",
      brand: "Remano",
      productName: "Soy Sauce 250ml",
      shop: "Aldi",
      price: 1.8,
    },
    {
      ingredientName: "capsicum",
      brand: "Fresh",
      productName: "Red Capsicum 500g",
      shop: "Aldi",
      price: 2.5,
    },
    {
      ingredientName: "lemon",
      brand: "Fresh",
      productName: "Lemons 500g",
      shop: "Aldi",
      price: 2.0,
    },
    {
      ingredientName: "black pepper",
      brand: "Stonemill",
      productName: "Black Pepper 50g",
      shop: "Aldi",
      price: 2.5,
    },
  ];

  const productPromises = shopAssignments.map(async (mapping) => {
    const ing = ingredients.find(
      (i) => i.name.toLowerCase() === mapping.ingredientName,
    );
    if (!ing) return 0;
    const createResp = await request.post(`${API_URL}/api/v1/products`, {
      headers,
      data: {
        ingredient_id: ing.id,
        brand: mapping.brand,
        product_name: mapping.productName,
        shop: mapping.shop,
        price: mapping.price,
        size_desc: null,
        notes: "Seeded by E2E setup",
      },
    });
    return createResp.ok() ||
      createResp.status() === 201 ||
      createResp.status() === 409
      ? 1
      : 0;
  });
  const productResults = await Promise.all(productPromises);
  let productsAdded = productResults.reduce(
    (sum: number, v: number) => sum + v,
    0,
  );
  console.log(
    `[seed-data] Products seeded: ${productsAdded}/${shopAssignments.length}`,
  );

  // ── Step 4: Create a meal plan ────────────────────────────────────────
  // First, warm up the preferences endpoint (not seeded, so it's cold when
  // preferences tests run — causing them to fail on GET/POST).
  console.log("[seed-data] Warming up preferences endpoint...");
  const dietaryTypesResp = await request.get(
    `${API_URL}/api/v1/preferences/dietary-types`,
    { headers },
  );
  console.log(
    `[seed-data] Preferences warm-up: dietary-types ${dietaryTypesResp.status()}`,
  );

  console.log("[seed-data] Creating meal plan...");
  const weekStart = getNextMonday();
  const planResp = await request.post(`${API_URL}/api/v1/meal-plans`, {
    headers,
    data: { week_start_date: weekStart },
  });

  if (planResp.status() === 409) {
    console.log(
      "[seed-data] Meal plan already exists (409 Conflict) — skipping creation",
    );
    return;
  }

  if (!planResp.ok()) {
    const errText = await planResp.text().catch(() => "");
    expect(
      false,
      `Failed to create meal plan: ${planResp.status()} ${errText}`,
    ).toBeTruthy();
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
