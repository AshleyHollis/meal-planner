import type {
  Equipment,
  GroceryItem,
  GroceryList,
  Ingredient,
  InventoryItem,
  MealPlan,
  MealPlanDetail,
  MealSlot,
  EffortLevel,
  MealPlanStatus,
  MealSlotStatus,
  UnitType,
  StorageLocation,
  MealHistoryItem,
  MealSlotRating,
  CreateMealSlotRating,
  RecipeFavorite,
  MemberPreference,
  CreateMemberPreference,
} from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// IMPORTANT: Do NOT cache this at module init time. The runtime-config.js may not have
// executed yet when this module first loads. Instead, getApiBaseUrl() is called lazily
// inside buildUrl() on each request so that window.__RUNTIME_CONFIG__ is read after
// the page has fully initialized.
import { getApiBaseUrl } from "./runtimeConfig";

function buildUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = "ApiError";
  }

  /** True for 401/403 responses. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** True for 5xx responses. */
  get isServerError(): boolean {
    return this.status >= 500;
  }
}

// ---------------------------------------------------------------------------
// Auth token helper
// ---------------------------------------------------------------------------

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

/**
 * Retrieves a JWT access token from the Auth0 BFF endpoint.
 * Caches the token until 60 seconds before expiry.
 */
async function getAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt) {
    return _cachedToken;
  }

  try {
    const res = await fetch("/auth/access-token");
    if (!res.ok) {
      _cachedToken = null;
      _tokenExpiresAt = 0;
      return null;
    }
    const data = (await res.json()) as {
      token: string;
      expires_at?: number;
    };
    _cachedToken = data.token;
    // Expire cache 60 seconds before real expiry, or after 5 minutes by default
    const expiresIn = data.expires_at
      ? data.expires_at * 1000 - now - 60_000
      : 5 * 60 * 1000;
    _tokenExpiresAt = now + Math.max(expiresIn, 0);
    return _cachedToken;
  } catch {
    _cachedToken = null;
    _tokenExpiresAt = 0;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, body);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Request body types (mirrors API Pydantic request models)
// ---------------------------------------------------------------------------

export interface CreateInventoryItemBody {
  ingredient_id: string;
  quantity: number;
  unit: UnitType;
  location: StorageLocation;
  expiry_date?: string | null;
}

export interface UpdateInventoryItemBody {
  quantity?: number | null;
  expiry_date?: string | null;
}

export interface CreateEquipmentMode {
  name: string;
  category: string;
  min_temp?: number | null;
  max_temp?: number | null;
}

export interface CreateEquipmentBody {
  name: string;
  modes?: CreateEquipmentMode[];
}

export interface CreateMealPlanBody {
  week_start_date: string;
  cuisine_preferences?: string[];
}

export interface UpdatePlanStatusBody {
  status: MealPlanStatus;
}

export interface UpdateMealSlotBody {
  recipe_id?: string | null;
}

export interface UpdateSlotStatusBody {
  status: MealSlotStatus;
}

export interface AdaptMealSlotBody {
  effort_level: EffortLevel;
}

export interface UpdateGroceryItemBody {
  is_checked: boolean;
}

export interface PurchasedItem {
  ingredient_id: string;
  quantity: number;
}

export interface CompleteShoppingBody {
  purchased_items: PurchasedItem[];
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function listInventory(
  location?: string,
): Promise<InventoryItem[]> {
  const params = location ? `?location=${encodeURIComponent(location)}` : "";
  return fetchApi<InventoryItem[]>(`/api/v1/inventory${params}`);
}

export async function addInventoryItem(
  body: CreateInventoryItemBody,
): Promise<InventoryItem> {
  return fetchApi<InventoryItem>("/api/v1/inventory", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateInventoryItem(
  itemId: string,
  body: UpdateInventoryItemBody,
): Promise<InventoryItem> {
  return fetchApi<InventoryItem>(`/api/v1/inventory/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function removeInventoryItem(itemId: string): Promise<void> {
  return fetchApi<void>(`/api/v1/inventory/${itemId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export async function listEquipment(): Promise<Equipment[]> {
  return fetchApi<Equipment[]>("/api/v1/equipment");
}

export async function registerEquipment(
  body: CreateEquipmentBody,
): Promise<Equipment> {
  return fetchApi<Equipment>("/api/v1/equipment", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

export async function searchIngredients(
  q?: string,
  limit?: number,
): Promise<Ingredient[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchApi<Ingredient[]>(`/api/v1/ingredients${qs ? `?${qs}` : ""}`);
}

// ---------------------------------------------------------------------------
// Meal Plans
// ---------------------------------------------------------------------------

export async function listMealPlans(): Promise<MealPlan[]> {
  return fetchApi<MealPlan[]>("/api/v1/meal-plans");
}

export async function createMealPlan(
  body: CreateMealPlanBody,
): Promise<MealPlan> {
  return fetchApi<MealPlan>("/api/v1/meal-plans", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getActiveMealPlan(): Promise<MealPlanDetail> {
  return fetchApi<MealPlanDetail>("/api/v1/meal-plans/active");
}

export async function getMealPlan(planId: string): Promise<MealPlanDetail> {
  return fetchApi<MealPlanDetail>(`/api/v1/meal-plans/${planId}`);
}

export async function updatePlanStatus(
  planId: string,
  body: UpdatePlanStatusBody,
): Promise<MealPlan> {
  return fetchApi<MealPlan>(`/api/v1/meal-plans/${planId}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateMealSlot(
  planId: string,
  slotId: string,
  body: UpdateMealSlotBody,
): Promise<MealSlot> {
  return fetchApi<MealSlot>(`/api/v1/meal-plans/${planId}/slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function adaptMealSlot(
  planId: string,
  slotId: string,
  body: AdaptMealSlotBody,
): Promise<{
  plan_id: string;
  slot_id: string;
  effort_level: string;
  status: string;
}> {
  return fetchApi(`/api/v1/meal-plans/${planId}/slots/${slotId}/adapt`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSlotStatus(
  planId: string,
  slotId: string,
  body: UpdateSlotStatusBody,
): Promise<MealSlot> {
  return fetchApi<MealSlot>(
    `/api/v1/meal-plans/${planId}/slots/${slotId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export async function saveRecipeVariation(
  recipeId: string,
): Promise<{ recipe_id: string; status: string }> {
  return fetchApi(`/api/v1/recipes/${recipeId}/save-variation`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Grocery
// ---------------------------------------------------------------------------

export async function getGroceryList(mealPlanId: string): Promise<GroceryList> {
  return fetchApi<GroceryList>(`/api/v1/meal-plans/${mealPlanId}/grocery-list`);
}

export async function checkGroceryItem(
  itemId: string,
  body: UpdateGroceryItemBody,
): Promise<GroceryItem> {
  return fetchApi<GroceryItem>(`/api/v1/grocery-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function completeShopping(
  groceryListId: string,
  body: CompleteShoppingBody,
): Promise<InventoryItem[]> {
  return fetchApi<InventoryItem[]>(
    `/api/v1/grocery-lists/${groceryListId}/complete`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getPreferences(
  memberId: string,
): Promise<MemberPreference[]> {
  return fetchApi<MemberPreference[]>(
    `/api/v1/members/${memberId}/preferences`,
  );
}

export async function addPreference(
  memberId: string,
  data: CreateMemberPreference,
): Promise<MemberPreference> {
  return fetchApi<MemberPreference>(`/api/v1/members/${memberId}/preferences`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deletePreference(
  memberId: string,
  preferenceId: string,
): Promise<void> {
  return fetchApi<void>(
    `/api/v1/members/${memberId}/preferences/${preferenceId}`,
    {
      method: "DELETE",
    },
  );
}

export async function getDietaryTypes(): Promise<string[]> {
  return fetchApi<string[]>("/api/v1/preferences/dietary-types");
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

export async function submitRating(
  planId: string,
  slotId: string,
  data: CreateMealSlotRating,
): Promise<MealSlotRating> {
  return fetchApi<MealSlotRating>(
    `/api/v1/meal-plans/${planId}/slots/${slotId}/rating`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function getRating(
  planId: string,
  slotId: string,
): Promise<MealSlotRating | null> {
  try {
    return await fetchApi<MealSlotRating>(
      `/api/v1/meal-plans/${planId}/slots/${slotId}/rating`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export async function addFavorite(recipeId: string): Promise<RecipeFavorite> {
  return fetchApi<RecipeFavorite>(`/api/v1/recipes/${recipeId}/favorite`, {
    method: "POST",
  });
}

export async function removeFavorite(recipeId: string): Promise<void> {
  return fetchApi<void>(`/api/v1/recipes/${recipeId}/favorite`, {
    method: "DELETE",
  });
}

export async function listFavorites(): Promise<RecipeFavorite[]> {
  return fetchApi<RecipeFavorite[]>("/api/v1/favorites");
}

// ---------------------------------------------------------------------------
// Meal History
// ---------------------------------------------------------------------------

export async function getMealHistory(
  page?: number,
  pageSize?: number,
): Promise<MealHistoryItem[]> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (pageSize !== undefined) params.set("page_size", String(pageSize));
  const qs = params.toString();
  return fetchApi<MealHistoryItem[]>(
    `/api/v1/meal-history${qs ? `?${qs}` : ""}`,
  );
}
