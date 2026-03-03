// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const API_URL = "http://localhost:8000";

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

function tokenResponse(token = "test-jwt-token") {
  return mockResponse({
    token,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
});

async function freshApi() {
  return import("@/services/api");
}

const mockTemplate = {
  id: "rt1",
  household_id: "hh1",
  day: 0,
  meal_type: "dinner",
  recipe_id: null,
  recipe_title: "Monday Pasta",
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
};

describe("MealTypeSelector — createMealPlan with meal_types", () => {
  it("createMealPlan accepts meal_types field", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ id: "mp1" }));

    await api.createMealPlan({
      week_start_date: "2026-03-02",
      meal_types: ["breakfast", "dinner"],
    });

    const [, init] = fetchMock.mock.calls[1];
    expect(JSON.parse(init.body)).toEqual({
      week_start_date: "2026-03-02",
      meal_types: ["breakfast", "dinner"],
    });
  });
});

describe("listRecurringMeals", () => {
  it("calls GET /api/v1/recurring-meals", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse([mockTemplate]));

    const result = await api.listRecurringMeals();
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/recurring-meals`);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rt1");
  });
});

describe("createRecurringMeal", () => {
  it("calls POST /api/v1/recurring-meals", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse(mockTemplate));

    const result = await api.createRecurringMeal({
      day: 0,
      meal_type: "dinner",
      recipe_title: "Monday Pasta",
    });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/recurring-meals`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      day: 0,
      meal_type: "dinner",
      recipe_title: "Monday Pasta",
    });
    expect(result.id).toBe("rt1");
  });
});

describe("updateRecurringMeal", () => {
  it("calls PATCH /api/v1/recurring-meals/:id", async () => {
    const api = await freshApi();
    const updated = { ...mockTemplate, recipe_title: "Updated Pasta" };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse(updated));

    const result = await api.updateRecurringMeal("rt1", {
      recipe_title: "Updated Pasta",
    });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/recurring-meals/rt1`);
    expect(init.method).toBe("PATCH");
    expect(result.recipe_title).toBe("Updated Pasta");
  });
});

describe("deleteRecurringMeal", () => {
  it("calls DELETE /api/v1/recurring-meals/:id", async () => {
    const api = await freshApi();
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce({
      ...mockResponse(null),
      ok: true,
      status: 204,
      statusText: "No Content",
      json: () => Promise.reject(new Error("no body")),
    } as Response);

    await api.deleteRecurringMeal("rt1");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/recurring-meals/rt1`);
    expect(init.method).toBe("DELETE");
  });
});
