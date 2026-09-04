export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type NutritionGoal =
  | 'fat_loss_aggressive'
  | 'fat_loss_moderate'
  | 'fat_loss_light'
  | 'maintain'
  | 'muscle_gain_lean'
  | 'muscle_gain_bulk';

export type MacroPreset =
  | 'balanced'
  | 'high_protein'
  | 'low_carb'
  | 'keto'
  | 'custom';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface UserProfile {
  gender: Gender;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  macroPreset: MacroPreset;
  customProteinPct: number;
  customCarbsPct: number;
  customFatPct: number;
}

export interface CalculatedTargets {
  bmr: number; // Basal Metabolic Rate
  tdee: number; // Total Daily Energy Expenditure
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  targetFiberGrams: number;
  targetWaterLiters: number;
  calorieDifference: number; // e.g., -500 for deficit
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  servingDescription: string;
  servingWeightGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sodiumMgPer100g?: number;
  sugarPer100g?: number;
  icon?: string;
}

export interface LoggedFoodItem {
  id: string;
  foodId?: string;
  mealType: MealType;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodiumMg?: number;
  sugar?: number;
  timestamp: number;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodiumMg?: number;
  sugar?: number;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
}

export interface AnalyzedFoodResult {
  name: string;
  portion: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar?: number;
}

export interface AIAnalysisResponse {
  success: boolean;
  item?: AnalyzedFoodResult;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
