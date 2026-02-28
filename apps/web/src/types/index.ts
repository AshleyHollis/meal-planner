// TypeScript interfaces matching API Pydantic response models

// --- Enums / Union types ---

export type UnitType = "g" | "ml" | "units";
export type StorageLocation = "fridge" | "pantry";
export type ExpiryStatus = "safe" | "expiring" | "expired";
export type MealSlotStatus = "planned" | "cooked" | "skipped";
export type MealPlanStatus = "draft" | "active" | "completed";
export type EffortLevel = "quick" | "standard" | "elaborate";

// --- Ingredient ---

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  default_unit: string;
  default_storage: string;
  typical_shelf_life_days: number | null;
}

// --- Inventory ---

export interface InventoryItem {
  id: string;
  ingredient: Ingredient;
  quantity: number;
  unit: string;
  location: string;
  expiry_date: string | null;
  created_at: string;
  expiry_status: ExpiryStatus;
}

// --- Equipment ---

export interface EquipmentMode {
  id: string;
  name: string;
  category: string;
  min_temp: number | null;
  max_temp: number | null;
}

export interface Equipment {
  id: string;
  name: string;
  is_active: boolean;
  modes: EquipmentMode[];
  created_at: string;
}

// --- Recipe ---

export interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
}

export interface RecipeStep {
  id: string;
  step_order: number;
  instruction: string;
  equipment_mode_id: string | null;
  temperature: number | null;
  duration_min: number | null;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  is_ai_generated: boolean;
  source_recipe_id: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

// --- Meal Plan ---

export interface MealSlot {
  id: string;
  day: number;
  meal_type: string;
  status: string;
  cooked_at: string | null;
  recipe: Recipe | null;
}

export interface MealPlan {
  id: string;
  week_start_date: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface MealPlanDetail extends MealPlan {
  slots: MealSlot[];
}

// --- Grocery ---

export interface GroceryItem {
  id: string;
  ingredient_id: string;
  quantity_needed: number;
  unit: string;
  is_checked: boolean;
  preferred_store: string | null;
}

export interface GroceryList {
  id: string;
  meal_plan_id: string;
  created_at: string;
  items: GroceryItem[];
}
