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

describe("getQuickSuggestions", () => {
  it("calls GET /api/v1/quick-suggestions", async () => {
    const api = await freshApi();
    const mockData = {
      suggestions: [
        {
          title: "Quick Pasta",
          description: "Easy pasta dish",
          prep_time_min: 5,
          cook_time_min: 15,
          servings: 2,
          ingredients: [
            { name: "pasta", quantity: 200, unit: "g", on_hand: true },
          ],
        },
      ],
      message: null,
    };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse(mockData));

    const result = await api.getQuickSuggestions();
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/quick-suggestions`);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].title).toBe("Quick Pasta");
  });

  it("passes max_results query param when provided", async () => {
    const api = await freshApi();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse({ suggestions: [], message: null }));

    await api.getQuickSuggestions(5);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${API_URL}/api/v1/quick-suggestions?max_results=5`,
    );
  });

  it("returns empty suggestions with message", async () => {
    const api = await freshApi();
    const emptyData = {
      suggestions: [],
      message: "Add more items to your inventory to get suggestions.",
    };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse(emptyData));

    const result = await api.getQuickSuggestions();
    expect(result.suggestions).toHaveLength(0);
    expect(result.message).toBe(
      "Add more items to your inventory to get suggestions.",
    );
  });

  it("includes on_hand flag for ingredients", async () => {
    const api = await freshApi();
    const mockData = {
      suggestions: [
        {
          title: "Omelette",
          description: "Classic omelette",
          prep_time_min: 2,
          cook_time_min: 5,
          servings: 1,
          ingredients: [
            { name: "eggs", quantity: 3, unit: "units", on_hand: true },
            { name: "cheese", quantity: 50, unit: "g", on_hand: false },
          ],
        },
      ],
      message: null,
    };
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(mockResponse(mockData));

    const result = await api.getQuickSuggestions();
    const ingredients = result.suggestions[0].ingredients;
    expect(ingredients[0].on_hand).toBe(true);
    expect(ingredients[1].on_hand).toBe(false);
  });
});
