import {Injectable, computed, inject, signal} from '@angular/core';
import {FOOD_DATABASE} from '../data/food-database';
import {
  AIAnalysisResponse,
  CalculatedTargets,
  FoodItem,
  LoggedFoodItem,
  MealType,
  UserProfile,
} from '../models/nutrition.models';
import {ChatService} from './chat.service';

const DEFAULT_PROFILE: UserProfile = {
  gender: 'male',
  age: 28,
  weightKg: 75,
  heightCm: 176,
  activityLevel: 'moderate',
  goal: 'fat_loss_moderate',
  macroPreset: 'high_protein',
  customProteinPct: 30,
  customCarbsPct: 40,
  customFatPct: 30,
};

@Injectable({
  providedIn: 'root',
})
export class NutritionService {
  // State Signals
  readonly userProfile = signal<UserProfile>(this.loadStoredProfile());
  readonly foodCatalog = signal<FoodItem[]>([...FOOD_DATABASE]);
  readonly loggedFoods = signal<LoggedFoodItem[]>(this.loadStoredLogs());

  // Calculated nutrition targets from user profile
  readonly targets = computed<CalculatedTargets>(() => {
    const p = this.userProfile();

    // 1. Basal Metabolic Rate (Mifflin-St Jeor)
    let bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
    if (p.gender === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }
    bmr = Math.round(bmr);

    // 2. Activity Multiplier
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const pal = activityMultipliers[p.activityLevel] || 1.55;
    const tdee = Math.round(bmr * pal);

    // 3. Goal Adjustment
    let targetCalories = tdee;
    let calorieDiff = 0;
    switch (p.goal) {
      case 'fat_loss_aggressive':
        calorieDiff = -Math.round(tdee * 0.25);
        targetCalories = tdee + calorieDiff;
        break;
      case 'fat_loss_moderate':
        calorieDiff = -Math.round(tdee * 0.2);
        targetCalories = tdee + calorieDiff;
        break;
      case 'fat_loss_light':
        calorieDiff = -Math.round(tdee * 0.15);
        targetCalories = tdee + calorieDiff;
        break;
      case 'maintain':
        calorieDiff = 0;
        targetCalories = tdee;
        break;
      case 'muscle_gain_lean':
        calorieDiff = Math.round(tdee * 0.1);
        targetCalories = tdee + calorieDiff;
        break;
      case 'muscle_gain_bulk':
        calorieDiff = Math.round(tdee * 0.15);
        targetCalories = tdee + calorieDiff;
        break;
    }

    // Ensure safe minimum calories (1200 for women, 1500 for men typically)
    const minSafeCalories = p.gender === 'male' ? 1400 : 1100;
    if (targetCalories < minSafeCalories) {
      targetCalories = minSafeCalories;
    }

    // 4. Macro Splits
    let proteinPct = 25;
    let carbsPct = 50;
    let fatPct = 25;

    switch (p.macroPreset) {
      case 'balanced':
        proteinPct = 25;
        carbsPct = 50;
        fatPct = 25;
        break;
      case 'high_protein':
        proteinPct = 35;
        carbsPct = 40;
        fatPct = 25;
        break;
      case 'low_carb':
        proteinPct = 35;
        carbsPct = 20;
        fatPct = 45;
        break;
      case 'keto':
        proteinPct = 25;
        carbsPct = 5;
        fatPct = 70;
        break;
      case 'custom':
        proteinPct = p.customProteinPct;
        carbsPct = p.customCarbsPct;
        fatPct = p.customFatPct;
        break;
    }

    // Grams calculation: 4 kcal per gram of protein & carbs, 9 kcal per gram of fat
    const targetProteinGrams = Math.round(
      (targetCalories * (proteinPct / 100)) / 4,
    );
    const targetCarbsGrams = Math.round(
      (targetCalories * (carbsPct / 100)) / 4,
    );
    const targetFatGrams = Math.round((targetCalories * (fatPct / 100)) / 9);

    // Recommended Fiber (14g per 1000 kcal)
    const targetFiberGrams = Math.round((targetCalories / 1000) * 14);

    // Recommended Water (liters)
    const baseWater = (p.weightKg * 35) / 1000;
    const activityWaterBonus =
      p.activityLevel === 'active' || p.activityLevel === 'very_active'
        ? 0.6
        : 0.3;
    const targetWaterLiters =
      Math.round((baseWater + activityWaterBonus) * 10) / 10;

    return {
      bmr,
      tdee,
      targetCalories,
      targetProteinGrams,
      targetCarbsGrams,
      targetFatGrams,
      targetFiberGrams,
      targetWaterLiters,
      calorieDifference: calorieDiff,
      proteinPct,
      carbsPct,
      fatPct,
    };
  });

  // Aggregated logged nutrition for today
  readonly dailyTotals = computed(() => {
    const logs = this.loggedFoods();
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sodium = 0;
    let sugar = 0;

    for (const item of logs) {
      calories += item.calories;
      protein += item.protein;
      carbs += item.carbs;
      fat += item.fat;
      fiber += item.fiber;
      sodium += item.sodiumMg || 0;
      sugar += item.sugar || 0;
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      sodium: Math.round(sodium),
      sugar: Math.round(sugar * 10) / 10,
      totalCount: logs.length,
    };
  });

  // Totals by meal type
  readonly mealSummaries = computed(() => {
    const logs = this.loggedFoods();
    const meals: Record<
      MealType,
      {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        items: LoggedFoodItem[];
      }
    > = {
      breakfast: {calories: 0, protein: 0, carbs: 0, fat: 0, items: []},
      lunch: {calories: 0, protein: 0, carbs: 0, fat: 0, items: []},
      dinner: {calories: 0, protein: 0, carbs: 0, fat: 0, items: []},
      snack: {calories: 0, protein: 0, carbs: 0, fat: 0, items: []},
    };

    for (const item of logs) {
      if (meals[item.mealType]) {
        meals[item.mealType].calories += item.calories;
        meals[item.mealType].protein += item.protein;
        meals[item.mealType].carbs += item.carbs;
        meals[item.mealType].fat += item.fat;
        meals[item.mealType].items.push(item);
      }
    }

    return meals;
  });

  // Profile management
  updateProfile(partial: Partial<UserProfile>): void {
    this.userProfile.update((prev) => {
      const next = {...prev, ...partial};
      this.saveProfileToStorage(next);
      return next;
    });
  }

  // Food log management
  addFoodToLog(
    food: FoodItem,
    grams: number,
    mealType: MealType,
    customName?: string,
  ): void {
    const factor = grams / 100;
    const newItem: LoggedFoodItem = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      foodId: food.id,
      mealType,
      name: customName || food.name,
      grams,
      calories: Math.round(food.caloriesPer100g * factor),
      protein: Math.round(food.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
      fat: Math.round(food.fatPer100g * factor * 10) / 10,
      fiber: Math.round(food.fiberPer100g * factor * 10) / 10,
      sodiumMg: food.sodiumMgPer100g
        ? Math.round(food.sodiumMgPer100g * factor)
        : 0,
      sugar: food.sugarPer100g
        ? Math.round(food.sugarPer100g * factor * 10) / 10
        : undefined,
      timestamp: Date.now(),
    };

    this.loggedFoods.update((prev) => {
      const updated = [...prev, newItem];
      this.saveLogsToStorage(updated);
      return updated;
    });
  }

  addManualItemToLog(
    item: Omit<LoggedFoodItem, 'id' | 'timestamp'>,
  ): void {
    const newItem: LoggedFoodItem = {
      ...item,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
    };

    this.loggedFoods.update((prev) => {
      const updated = [...prev, newItem];
      this.saveLogsToStorage(updated);
      return updated;
    });
  }

  removeLoggedFood(id: string): void {
    this.loggedFoods.update((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      this.saveLogsToStorage(filtered);
      return filtered;
    });
  }

  updateLoggedFoodGrams(id: string, newGrams: number): void {
    this.loggedFoods.update((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target || target.grams <= 0) return prev;

      const ratio = newGrams / target.grams;
      const updated = prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            grams: newGrams,
            calories: Math.round(item.calories * ratio),
            protein: Math.round(item.protein * ratio * 10) / 10,
            carbs: Math.round(item.carbs * ratio * 10) / 10,
            fat: Math.round(item.fat * ratio * 10) / 10,
            fiber: Math.round(item.fiber * ratio * 10) / 10,
            sodiumMg: item.sodiumMg ? Math.round(item.sodiumMg * ratio) : undefined,
            sugar: item.sugar ? Math.round(item.sugar * ratio * 10) / 10 : undefined,
          };
        }
        return item;
      });
      this.saveLogsToStorage(updated);
      return updated;
    });
  }

  clearAllLogs(): void {
    this.loggedFoods.set([]);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('nutri_calc_food_log');
    }
  }

  loadInitialSampleData(): void {
    const samples: LoggedFoodItem[] = [
      {
        id: 'sample-1',
        foodId: 'avena-copos',
        mealType: 'breakfast',
        name: 'Avena en copos integrales',
        grams: 50,
        calories: 188,
        protein: 6.8,
        carbs: 29.4,
        fat: 3.5,
        fiber: 5,
        timestamp: Date.now() - 3600000 * 5,
      },
      {
        id: 'sample-2',
        foodId: 'platano',
        mealType: 'breakfast',
        name: 'Plátano / Banana',
        grams: 100,
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3,
        fiber: 2.6,
        timestamp: Date.now() - 3600000 * 5,
      },
      {
        id: 'sample-3',
        foodId: 'pechuga-pollo-plancha',
        mealType: 'lunch',
        name: 'Pechuga de pollo a la plancha',
        grams: 180,
        calories: 297,
        protein: 55.8,
        carbs: 0,
        fat: 6.5,
        fiber: 0,
        timestamp: Date.now() - 3600000 * 2,
      },
      {
        id: 'sample-4',
        foodId: 'arroz-blanco-cocido',
        mealType: 'lunch',
        name: 'Arroz blanco cocido',
        grams: 160,
        calories: 208,
        protein: 4.3,
        carbs: 45.1,
        fat: 0.5,
        fiber: 0.6,
        timestamp: Date.now() - 3600000 * 2,
      },
      {
        id: 'sample-5',
        foodId: 'aceite-oliva-virgen-extra',
        mealType: 'lunch',
        name: 'Aceite de oliva virgen extra (AOVE)',
        grams: 10,
        calories: 88,
        protein: 0,
        carbs: 0,
        fat: 10,
        fiber: 0,
        timestamp: Date.now() - 3600000 * 2,
      },
    ];

    this.loggedFoods.set(samples);
    this.saveLogsToStorage(samples);
  }

  private readonly chatService = inject(ChatService);

  // AI Food Analysis client caller
  async analyzeFoodWithAI(query: string): Promise<AIAnalysisResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const key = this.chatService.apiKey().trim();
      if (key) {
        headers['x-gemini-api-key'] = key;
      }

      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers,
        body: JSON.stringify({query}),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        return {
          success: false,
          message:
            errorData.message ||
            'No se pudo conectar con el servicio de análisis nutricional',
        };
      }

      const data = (await response.json()) as AIAnalysisResponse;
      return data;
    } catch {
      return {
        success: false,
        message: 'Error de red al consultar el analizador nutricional',
      };
    }
  }

  // Local Storage Helpers
  private loadStoredProfile(): UserProfile {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_PROFILE;
    }
    try {
      const saved = window.localStorage.getItem('nutri_calc_profile');
      if (saved) {
        return {...DEFAULT_PROFILE, ...JSON.parse(saved)};
      }
    } catch (e) {
      console.warn('Error reading profile from localStorage', e);
    }
    return DEFAULT_PROFILE;
  }

  private saveProfileToStorage(profile: UserProfile): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem('nutri_calc_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Error saving profile to localStorage', e);
    }
  }

  private loadStoredLogs(): LoggedFoodItem[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const saved = window.localStorage.getItem('nutri_calc_food_log');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading logs from localStorage', e);
    }
    return [];
  }

  private saveLogsToStorage(logs: LoggedFoodItem[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem('nutri_calc_food_log', JSON.stringify(logs));
    } catch (e) {
      console.warn('Error saving logs to localStorage', e);
    }
  }
}
