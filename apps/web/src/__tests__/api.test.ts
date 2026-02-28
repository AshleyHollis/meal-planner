// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiError,
  listInventory,
  addInventoryItem,
  updateInventoryItem,
  removeInventoryItem,
  listEquipment,
  registerEquipment,
  searchIngredients,
  listMealPlans,
  createMealPlan,
  getActiveMealPlan,
  getMealPlan,
  updatePlanStatus,
  updateMealSlot,
  adaptMealSlot,
  updateSlotStatus,
  saveRecipeVariation,
  getGroceryList,
  checkGroceryItem,
  completeShopping,
} from "@/services/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_URL = "http://localhost:8000";

/** Build a mock Response. */
function mockResponse(
  body: unknown,
  init?: { status?: number; statusText?: string },
): Response {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? "OK";
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    type: "basic" as ResponseType,
    url: "",
    clone: () => mockResponse(body, init) as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(body)),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

/** Token response from Auth0 BFF endpoint. */
function tokenResponse(token = "test-jwt-token") {
  return mockResponse({ token, expires_at: Math.floor(Date.now() / 1000) + 3600 });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Reset module-level token cache by re-importing (vi.resetModules handled by vitest)
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  // Clear cached token by resetting modules
  vi.resetModules();
});

/**
 * Dynamically import the API module so each test gets a fresh token cache.
 * Avoids stale _cachedToken from previous tests.
 */
async function freshApi() {
  const mod = await import("@/services/api");
  return mod;
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("stores status, statusText, and body", () => {
    const err = new ApiError(404, "Not Found", { detail: "missing" });
    expect(err.status).toBe(404);
    expect(err.statusText).toBe("Not Found");
    expect(err.body).toEqual({ detail: "missing" });
    expect(err.message).toBe("API 404: Not Found");
    expect(err.name).toBe("ApiError");
  });

  it("isAuthError returns true for 401 and 403", () => {
    expect(new ApiError(401, "Unauthorized", null).isAuthError).toBe(true);
    expect(new ApiError(403, "Forbidden", null).isAuthError).toBe(true);
    expect(new ApiError(404, "Not Found", null).isAuthError).toBe(false);
  });

  it("isServerError returns true for 5xx", () => {
    expect(new ApiError(500, "Internal Server Error", null).isServerError).toBe(true);
    expect(new ApiError(502, "Bad Gateway", null).isServerError).toBe(true);
    expect(new ApiError(400, "Bad Request", null).isServerError).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchApi wrapper behavior
// ---------------------------------------------------------------------------

describe("fetchApi wrapper", () => {
  it("adds Content-Type and Authorization headers", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([]));

    await api.listInventory();

    // Second call is the actual API request
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/inventory`);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["Authorization"]).toBe("Bearer test-jwt-token");
  });

  it("skips Authorization when token fetch fails", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(mockResponse(null, { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(mockResponse([]));

    await api.listInventory();

    const [, init] = fetchMock.mock.calls[1];
    expect(init.headers["Authorization"]).toBeUndefined();
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("throws ApiError on non-OK response", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        mockResponse({ detail: "not found" }, { status: 404, statusText: "Not Found" }),
      );

    try {
      await api.listInventory();
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(api.ApiError);
      expect((e as InstanceType<typeof api.ApiError>).status).toBe(404);
      expect((e as InstanceType<typeof api.ApiError>).body).toEqual({ detail: "not found" });
    }
  });

  it("returns undefined for 204 No Content", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ...mockResponse(null),
        ok: true,
        status: 204,
        statusText: "No Content",
        json: () => Promise.reject(new Error("no body")),
      } as Response);

    const result = await api.removeInventoryItem("item-1");
    expect(result).toBeUndefined();
  });

  it("handles JSON parse error in error body gracefully", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("invalid json")),
        headers: new Headers(),
      } as unknown as Response);

    try {
      await api.listInventory();
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(api.ApiError);
      expect((e as InstanceType<typeof api.ApiError>).body).toBeNull();
    }
  });

  it("caches token across calls", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([]))
      .mockResolvedValueOnce(mockResponse([]));

    await api.listInventory();
    await api.listEquipment();

    // Token fetched only once (first call), then cached
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 token + 2 API
    expect(fetchMock.mock.calls[0][0]).toBe("/auth/access-token");
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/inventory`);
    expect(fetchMock.mock.calls[2][0]).toBe(`${API_URL}/api/v1/equipment`);
  });
});

// ---------------------------------------------------------------------------
// Inventory endpoints
// ---------------------------------------------------------------------------

describe("Inventory API methods", () => {
  it("listInventory calls GET /api/v1/inventory", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([{ id: "1" }]));

    const result = await api.listInventory();
    expect(result).toEqual([{ id: "1" }]);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/inventory`);
  });

  it("listInventory with location filter", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([]));

    await api.listInventory("fridge");
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/inventory?location=fridge`);
  });

  it("addInventoryItem calls POST /api/v1/inventory", async () => {
    const api = await freshApi();
    const body = { ingredient_id: "i1", quantity: 500, unit: "g" as const, location: "pantry" as const };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "new" }));

    await api.addInventoryItem(body);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/inventory`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(body);
  });

  it("updateInventoryItem calls PATCH /api/v1/inventory/:id", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "x" }));

    await api.updateInventoryItem("x", { quantity: 100 });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/inventory/x`);
    expect(init.method).toBe("PATCH");
  });

  it("removeInventoryItem calls DELETE /api/v1/inventory/:id", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ...mockResponse(null),
        ok: true,
        status: 204,
        statusText: "No Content",
        json: () => Promise.reject(new Error("no body")),
      } as Response);

    await api.removeInventoryItem("x");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/inventory/x`);
    expect(init.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// Equipment endpoints
// ---------------------------------------------------------------------------

describe("Equipment API methods", () => {
  it("listEquipment calls GET /api/v1/equipment", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([{ id: "eq1", name: "Ninja" }]));

    const result = await api.listEquipment();
    expect(result).toEqual([{ id: "eq1", name: "Ninja" }]);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/equipment`);
  });

  it("registerEquipment calls POST /api/v1/equipment", async () => {
    const api = await freshApi();
    const body = { name: "Ninja Combi", modes: [{ name: "Air Fry", category: "fry" }] };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "eq2" }));

    await api.registerEquipment(body);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/equipment`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(body);
  });
});

// ---------------------------------------------------------------------------
// Ingredients endpoint
// ---------------------------------------------------------------------------

describe("Ingredients API methods", () => {
  it("searchIngredients calls GET /api/v1/ingredients", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([{ id: "i1", name: "Chicken" }]));

    const result = await api.searchIngredients();
    expect(result).toEqual([{ id: "i1", name: "Chicken" }]);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/ingredients`);
  });

  it("searchIngredients passes query params", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([]));

    await api.searchIngredients("chick", 10);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/ingredients?q=chick&limit=10`);
  });
});

// ---------------------------------------------------------------------------
// Meal Plans endpoints
// ---------------------------------------------------------------------------

describe("Meal Plans API methods", () => {
  it("listMealPlans calls GET /api/v1/meal-plans", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([]));

    await api.listMealPlans();
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/meal-plans`);
  });

  it("createMealPlan calls POST /api/v1/meal-plans", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "mp1" }));

    await api.createMealPlan({ week_start_date: "2026-03-02" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/meal-plans`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ week_start_date: "2026-03-02" });
  });

  it("getActiveMealPlan calls GET /api/v1/meal-plans/active", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "mp1", slots: [] }));

    await api.getActiveMealPlan();
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/meal-plans/active`);
  });

  it("getMealPlan calls GET /api/v1/meal-plans/:id", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "mp1", slots: [] }));

    await api.getMealPlan("mp1");
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/meal-plans/mp1`);
  });

  it("updatePlanStatus calls PATCH /api/v1/meal-plans/:id/status", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "mp1", status: "active" }));

    await api.updatePlanStatus("mp1", { status: "active" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/meal-plans/mp1/status`);
    expect(init.method).toBe("PATCH");
  });

  it("updateMealSlot calls PATCH /api/v1/meal-plans/:planId/slots/:slotId", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "s1" }));

    await api.updateMealSlot("mp1", "s1", { recipe_id: "r1" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/meal-plans/mp1/slots/s1`);
    expect(init.method).toBe("PATCH");
  });

  it("adaptMealSlot calls POST /api/v1/meal-plans/:planId/slots/:slotId/adapt", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ plan_id: "mp1", slot_id: "s1" }));

    await api.adaptMealSlot("mp1", "s1", { effort_level: "quick" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/meal-plans/mp1/slots/s1/adapt`);
    expect(init.method).toBe("POST");
  });

  it("updateSlotStatus calls PATCH /api/v1/meal-plans/:planId/slots/:slotId/status", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "s1" }));

    await api.updateSlotStatus("mp1", "s1", { status: "cooked" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/meal-plans/mp1/slots/s1/status`);
    expect(init.method).toBe("PATCH");
  });
});

// ---------------------------------------------------------------------------
// Recipes endpoint
// ---------------------------------------------------------------------------

describe("Recipes API methods", () => {
  it("saveRecipeVariation calls POST /api/v1/recipes/:id/save-variation", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ recipe_id: "r1", status: "saved" }));

    await api.saveRecipeVariation("r1");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/recipes/r1/save-variation`);
    expect(init.method).toBe("POST");
  });
});

// ---------------------------------------------------------------------------
// Grocery endpoints
// ---------------------------------------------------------------------------

describe("Grocery API methods", () => {
  it("getGroceryList calls GET /api/v1/meal-plans/:id/grocery-list", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "gl1", items: [] }));

    await api.getGroceryList("mp1");
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/meal-plans/mp1/grocery-list`);
  });

  it("checkGroceryItem calls PATCH /api/v1/grocery-items/:id", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "gi1", is_checked: true }));

    await api.checkGroceryItem("gi1", { is_checked: true });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/grocery-items/gi1`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ is_checked: true });
  });

  it("completeShopping calls POST /api/v1/grocery-lists/:id/complete", async () => {
    const api = await freshApi();
    const body = { purchased_items: [{ ingredient_id: "i1", quantity: 500 }] };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([{ id: "inv1" }]));

    await api.completeShopping("gl1", body);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/grocery-lists/gl1/complete`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(body);
  });
});
