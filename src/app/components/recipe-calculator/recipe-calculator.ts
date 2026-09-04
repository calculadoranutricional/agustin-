import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FOOD_DATABASE} from '../../data/food-database';
import {RecipeIngredient} from '../../models/nutrition.models';
import {NutritionService} from '../../services/nutrition.service';

@Component({
  selector: 'app-recipe-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './recipe-calculator.html',
})
export class RecipeCalculatorComponent {
  readonly nutritionService = inject(NutritionService);
  readonly catalog = FOOD_DATABASE;

  readonly recipeName = signal('Batido Energético de Avena y Plátano');
  readonly servings = signal(2);

  // Initial preset ingredients
  readonly ingredients = signal<RecipeIngredient[]>([
    {
      id: 'ing-1',
      name: 'Avena en copos integrales',
      grams: 60,
      calories: 225,
      protein: 8.1,
      carbs: 35.2,
      fat: 4.2,
      fiber: 6.0,
      sodiumMg: 3,
    },
    {
      id: 'ing-2',
      name: 'Plátano / Banana',
      grams: 120,
      calories: 107,
      protein: 1.3,
      carbs: 27.4,
      fat: 0.4,
      fiber: 3.1,
      sodiumMg: 1,
    },
    {
      id: 'ing-3',
      name: 'Leche de vaca entera',
      grams: 250,
      calories: 163,
      protein: 8.0,
      carbs: 12.0,
      fat: 9.0,
      fiber: 0,
      sodiumMg: 110,
    },
    {
      id: 'ing-4',
      name: 'Crema / Mantequilla de cacahuete 100%',
      grams: 20,
      calories: 118,
      protein: 5.0,
      carbs: 4.0,
      fat: 10.0,
      fiber: 1.2,
      sodiumMg: 3,
    },
  ]);

  // Ingredient search & add state
  readonly selectedFoodId = signal<string>(this.catalog[0].id);
  readonly addGrams = signal<number>(100);

  // Totals of entire recipe
  readonly recipeTotals = computed(() => {
    const ings = this.ingredients();
    let weight = 0;
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sodium = 0;

    for (const ing of ings) {
      weight += ing.grams;
      calories += ing.calories;
      protein += ing.protein;
      carbs += ing.carbs;
      fat += ing.fat;
      fiber += ing.fiber;
      sodium += ing.sodiumMg || 0;
    }

    return {
      weight: Math.round(weight),
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      sodium: Math.round(sodium),
    };
  });

  // Per single serving
  readonly perServing = computed(() => {
    const t = this.recipeTotals();
    const s = Math.max(1, this.servings());

    const cals = Math.round(t.calories / s);
    const prot = Math.round((t.protein / s) * 10) / 10;
    const carb = Math.round((t.carbs / s) * 10) / 10;
    const fat = Math.round((t.fat / s) * 10) / 10;
    const fib = Math.round((t.fiber / s) * 10) / 10;
    const sod = Math.round(t.sodium / s);
    const w = Math.round(t.weight / s);

    // % Daily Values based on standard 2000 kcal diet reference (FDA/OMS)
    // Reference: Fat: 78g, Carbs: 275g, Protein: 50g, Fiber: 28g, Sodium: 2300mg
    const dvFat = Math.round((fat / 78) * 100);
    const dvCarb = Math.round((carb / 275) * 100);
    const dvProt = Math.round((prot / 50) * 100);
    const dvFib = Math.round((fib / 28) * 100);
    const dvSod = Math.round((sod / 2300) * 100);

    return {
      weight: w,
      calories: cals,
      protein: prot,
      carbs: carb,
      fat: fat,
      fiber: fib,
      sodium: sod,
      dvFat,
      dvCarb,
      dvProt,
      dvFib,
      dvSod,
    };
  });

  setServings(val: number): void {
    this.servings.set(Math.max(1, Math.min(24, Math.round(val))));
  }

  addIngredient(): void {
    const food = this.catalog.find((f) => f.id === this.selectedFoodId());
    if (!food) return;

    const grams = this.addGrams();
    const factor = grams / 100;

    const newIng: RecipeIngredient = {
      id: 'ing-' + Date.now(),
      name: food.name,
      grams,
      calories: Math.round(food.caloriesPer100g * factor),
      protein: Math.round(food.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
      fat: Math.round(food.fatPer100g * factor * 10) / 10,
      fiber: Math.round(food.fiberPer100g * factor * 10) / 10,
      sodiumMg: food.sodiumMgPer100g
        ? Math.round(food.sodiumMgPer100g * factor)
        : 0,
    };

    this.ingredients.update((prev) => [...prev, newIng]);
  }

  removeIngredient(id: string): void {
    this.ingredients.update((prev) => prev.filter((i) => i.id !== id));
  }

  clearIngredients(): void {
    this.ingredients.set([]);
  }

  // Quick recipe presets
  loadPreset(name: string): void {
    if (name === 'bowl-salmon') {
      this.recipeName.set('Bowl Mediterráneo de Salmón y Quinoa');
      this.servings.set(2);
      this.ingredients.set([
        {
          id: 'p1',
          name: 'Salmón fresco',
          grams: 200,
          calories: 416,
          protein: 40.8,
          carbs: 0,
          fat: 26.8,
          fiber: 0,
          sodiumMg: 118,
        },
        {
          id: 'p2',
          name: 'Quinoa cocida',
          grams: 200,
          calories: 240,
          protein: 8.8,
          carbs: 42.6,
          fat: 3.8,
          fiber: 5.6,
          sodiumMg: 14,
        },
        {
          id: 'p3',
          name: 'Aguacate / Palta',
          grams: 80,
          calories: 128,
          protein: 1.6,
          carbs: 6.8,
          fat: 11.8,
          fiber: 5.4,
          sodiumMg: 6,
        },
        {
          id: 'p4',
          name: 'Espinacas frescas',
          grams: 80,
          calories: 18,
          protein: 2.3,
          carbs: 2.9,
          fat: 0.3,
          fiber: 1.8,
          sodiumMg: 63,
        },
        {
          id: 'p5',
          name: 'Aceite de oliva virgen extra (AOVE)',
          grams: 14,
          calories: 124,
          protein: 0,
          carbs: 0,
          fat: 14.0,
          fiber: 0,
          sodiumMg: 0,
        },
      ]);
    } else if (name === 'tortilla') {
      this.recipeName.set('Tortilla Rápida de Espinacas y Queso Feta/Fresco');
      this.servings.set(1);
      this.ingredients.set([
        {
          id: 't1',
          name: 'Huevo entero (talla M/L)',
          grams: 110,
          calories: 157,
          protein: 13.9,
          carbs: 0.8,
          fat: 10.5,
          fiber: 0,
          sodiumMg: 156,
        },
        {
          id: 't2',
          name: 'Claras de huevo líquidas',
          grams: 100,
          calories: 52,
          protein: 11.0,
          carbs: 0.7,
          fat: 0.2,
          fiber: 0,
          sodiumMg: 166,
        },
        {
          id: 't3',
          name: 'Espinacas frescas',
          grams: 50,
          calories: 12,
          protein: 1.5,
          carbs: 1.8,
          fat: 0.2,
          fiber: 1.1,
          sodiumMg: 40,
        },
        {
          id: 't4',
          name: 'Queso fresco tipo Burgos 0%',
          grams: 60,
          calories: 43,
          protein: 7.2,
          carbs: 2.1,
          fat: 0.3,
          fiber: 0,
          sodiumMg: 108,
        },
        {
          id: 't5',
          name: 'Aceite de oliva virgen extra (AOVE)',
          grams: 5,
          calories: 44,
          protein: 0,
          carbs: 0,
          fat: 5.0,
          fiber: 0,
          sodiumMg: 0,
        },
      ]);
    }
  }
}
