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

describe("substituteIngredient", () => {
  it("calls POST /api/v1/meal-plans/:planId/slots/:slotId/substitute", async () => {
    const api = await freshApi();
    const mockResult = {
      new_recipe: { id: "r2", title: "New Recipe", ingredients: [], steps: [] },
      allergen_warnings: [],
      grocery_changes: [],
    };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse(mockResult));

    const result = await api.substituteIngredient("plan1", "slot1", {
      original_ingredient_name: "butter",
      replacement_ingredient_name: "olive oil",
    });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/v1/meal-plans/plan1/slots/slot1/substitute`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      original_ingredient_name: "butter",
      replacement_ingredient_name: "olive oil",
    });
    expect(result).toEqual(mockResult);
  });

  it("throws ApiError on failure", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        mockResponse({ detail: "not found" }, { status: 404, statusText: "Not Found" }),
      );

    await expect(
      api.substituteIngredient("plan1", "slot1", {
        original_ingredient_name: "butter",
        replacement_ingredient_name: "olive oil",
      }),
    ).rejects.toBeInstanceOf(api.ApiError);
  });
});

describe("substituteIngredient includes allergen warnings", () => {
  it("returns allergen_warnings from response", async () => {
    const api = await freshApi();
    const mockResult = {
      new_recipe: { id: "r3", title: "Nut-free Recipe", ingredients: [], steps: [] },
      allergen_warnings: ["Contains peanuts"],
      grocery_changes: [
        { ingredient_name: "almond milk", action: "added", quantity: 500, unit: "ml" },
      ],
    };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse(mockResult));

    const result = await api.substituteIngredient("plan1", "slot1", {
      original_ingredient_name: "dairy milk",
      replacement_ingredient_name: "almond milk",
    });

    expect(result.allergen_warnings).toEqual(["Contains peanuts"]);
    expect(result.grocery_changes).toHaveLength(1);
  });
});
