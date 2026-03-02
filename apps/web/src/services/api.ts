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
  Leftover,
  StapleIngredient,
  StapleSuggestion,
  DefrostReminder,
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
  defrost_hours?: number | null;
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

export interface CreateLeftoverBody {
  portions: number;
  storage_location: StorageLocation;
  expiry_date: string;
}

export interface CreateStapleBody {
  ingredient_id: string;
  min_threshold: number;
  unit: string;
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
// Leftovers
// ---------------------------------------------------------------------------

export async function createLeftover(
  planId: string,
  slotId: string,
  body: CreateLeftoverBody,
): Promise<Leftover> {
  return fetchApi<Leftover>(
    `/api/v1/meal-plans/${planId}/slots/${slotId}/leftovers`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function listLeftovers(
  includeUsed = false,
): Promise<Leftover[]> {
  const params = includeUsed ? "?include_used=true" : "";
  return fetchApi<Leftover[]>(`/api/v1/leftovers${params}`);
}

export async function markLeftoverUsed(leftoverId: string): Promise<Leftover> {
  return fetchApi<Leftover>(`/api/v1/leftovers/${leftoverId}`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
}

// ---------------------------------------------------------------------------
// Staples
// ---------------------------------------------------------------------------

export async function listStaples(): Promise<StapleIngredient[]> {
  return fetchApi<StapleIngredient[]>("/api/v1/staples");
}

export async function addStaple(
  body: CreateStapleBody,
): Promise<StapleIngredient> {
  return fetchApi<StapleIngredient>("/api/v1/staples", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeStaple(stapleId: string): Promise<void> {
  return fetchApi<void>(`/api/v1/staples/${stapleId}`, {
    method: "DELETE",
  });
}

export async function getStapleSuggestions(): Promise<StapleSuggestion[]> {
  return fetchApi<StapleSuggestion[]>("/api/v1/staples/suggestions");
}

// ---------------------------------------------------------------------------
// Defrost
// ---------------------------------------------------------------------------

export async function getDefrostReminders(
  daysAhead = 7,
): Promise<DefrostReminder[]> {
  return fetchApi<DefrostReminder[]>(
    `/api/v1/inventory/defrost-reminders?days_ahead=${daysAhead}`,
  );
}
