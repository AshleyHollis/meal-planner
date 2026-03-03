// TypeScript interfaces matching API Pydantic response models

// --- Enums / Union types ---

export type UnitType = "g" | "ml" | "units";
export type StorageLocation = "fridge" | "pantry" | "freezer";
export type ExpiryStatus = "safe" | "expiring" | "expired";
export type MealSlotStatus = "planned" | "cooked" | "skipped";
export type MealPlanStatus = "draft" | "active" | "completed" | "failed";
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
  defrost_hours: number | null;
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
  ingredient_name: string;
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

export interface DeductionItem {
  ingredient_id: string;
  ingredient_name: string;
  requested: number;
  deducted: number;
  remaining: number;
  unit: string;
  unit_mismatch: boolean;
}

export interface MealSlot {
  id: string;
  day: number;
  meal_type: string;
  status: string;
  cooked_at: string | null;
  recipe: Recipe | null;
  deductions?: DeductionItem[] | null;
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

// --- Meal History ---

export interface MealHistoryItem {
  slot_id: string;
  recipe_id: string;
  recipe_title: string;
  cooked_at: string;
  day: number;
  meal_type: string;
  rating: number | null;
  cuisine_type: string | null;
}

// --- Preferences ---

export type PreferenceType =
  | "dietary_restriction"
  | "allergy"
  | "dislike"
  | "like";

export interface MemberPreference {
  id: string;
  household_member_id: string;
  preference_type: PreferenceType;
  value: string;
  ingredient_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateMemberPreference {
  preference_type: PreferenceType;
  value: string;
  ingredient_id?: string | null;
  notes?: string | null;
}

// --- Ratings ---

export interface MealSlotRating {
  id: string;
  meal_slot_id: string;
  rated_by: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface CreateMealSlotRating {
  rating: number;
  feedback?: string | null;
}

// --- Favorites ---

export interface RecipeFavorite {
  id: string;
  recipe_id: string;
  recipe_title: string;
  created_at: string;
}

// --- Leftovers ---

export interface Leftover {
  id: string;
  meal_slot_id: string;
  recipe_id: string;
  household_id: string;
  portions: number;
  storage_location: string;
  expiry_date: string;
  used_at: string | null;
  created_at: string;
  is_expired: boolean;
}

// --- Staples ---

export interface StapleIngredient {
  id: string;
  household_id: string;
  ingredient_id: string;
  min_threshold: number;
  unit: string;
}

export interface StapleSuggestion {
  ingredient_id: string;
  ingredient_name: string;
  current_qty: number;
  min_threshold: number;
  quantity_needed: number;
  unit: string;
}

// --- Defrost ---

export interface DefrostReminder {
  ingredient_name: string;
  defrost_hours: number;
  meal_day: number;
  meal_type: string;
  recipe_title: string;
}

// --- Meal Type ---

export type MealType = "breakfast" | "lunch" | "dinner";

// --- Substitution ---

export interface SubstitutionRequest {
  original_ingredient_name: string;
  replacement_ingredient_name: string;
}

export interface GroceryChange {
  ingredient_name: string;
  action: "added" | "removed" | "updated";
  quantity: number;
  unit: string;
}

export interface SubstitutionResult {
  new_recipe: Recipe;
  allergen_warnings: string[];
  grocery_changes: GroceryChange[];
}

// --- Quick Suggestions ---

export interface SuggestionIngredient {
  name: string;
  quantity: number;
  unit: string;
  on_hand: boolean;
}

export interface QuickSuggestion {
  title: string;
  description: string;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  ingredients: SuggestionIngredient[];
}

export interface QuickSuggestionsResponse {
  suggestions: QuickSuggestion[];
  message: string | null;
}

// --- Recurring Meals ---

export interface RecurringMealTemplate {
  id: string;
  household_id: string;
  day: number;
  meal_type: string;
  recipe_id: string | null;
  recipe_title: string | null;
  is_active: boolean;
  created_at: string;
}
