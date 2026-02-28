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
} from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
}

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------

async function fetchApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
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
  return fetchApi<MealSlot>(
    `/api/v1/meal-plans/${planId}/slots/${slotId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function adaptMealSlot(
  planId: string,
  slotId: string,
  body: AdaptMealSlotBody,
): Promise<{ plan_id: string; slot_id: string; effort_level: string; status: string }> {
  return fetchApi(
    `/api/v1/meal-plans/${planId}/slots/${slotId}/adapt`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
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

export async function getGroceryList(
  mealPlanId: string,
): Promise<GroceryList> {
  return fetchApi<GroceryList>(
    `/api/v1/meal-plans/${mealPlanId}/grocery-list`,
  );
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
