import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {
  AnalyzedFoodResult,
  FoodItem,
  LoggedFoodItem,
  MealType,
} from '../../models/nutrition.models';
import {NutritionService} from '../../services/nutrition.service';

@Component({
  selector: 'app-meal-tracker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './meal-tracker.html',
})
export class MealTrackerComponent {
  readonly nutritionService = inject(NutritionService);
  readonly targets = this.nutritionService.targets;
  readonly dailyTotals = this.nutritionService.dailyTotals;
  readonly mealSummaries = this.nutritionService.mealSummaries;
  readonly catalog = this.nutritionService.foodCatalog;

  // Active meal being added to
  readonly activeMeal = signal<MealType>('breakfast');

  // Search & Catalog Filter
  readonly searchQuery = signal('');
  readonly selectedCategory = signal('Todas');
  readonly selectedFoodToAdd = signal<FoodItem | null>(null);
  readonly customGrams = signal<number>(100);

  // AI Analyzer State
  readonly aiPrompt = signal('');
  readonly isAnalyzingAI = signal(false);
  readonly aiResult = signal<AnalyzedFoodResult | null>(null);
  readonly aiError = signal<string | null>(null);

  // Manual Custom Food Form State
  readonly showManualModal = signal(false);
  readonly manualName = signal('');
  readonly manualGrams = signal(100);
  readonly manualCalories = signal(100);
  readonly manualProtein = signal(5);
  readonly manualCarbs = signal(15);
  readonly manualFat = signal(2);
  readonly manualFiber = signal(1);

  // Copy report feedback
  readonly copiedReport = signal(false);

  // Unique Categories
  readonly categories = computed(() => {
    const list = this.catalog();
    const set = new Set(list.map((f) => f.category));
    return ['Todas', ...Array.from(set)];
  });

  // Filtered Food Catalog
  readonly filteredFoods = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    return this.catalog().filter((food) => {
      const matchCat = cat === 'Todas' || food.category === cat;
      const matchQuery =
        !q ||
        food.name.toLowerCase().includes(q) ||
        food.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  });

  // Progress Percentages
  readonly calProgressPct = computed(() => {
    const target = this.targets().targetCalories;
    if (!target) return 0;
    return Math.min(100, Math.round((this.dailyTotals().calories / target) * 100));
  });

  readonly proteinProgressPct = computed(() => {
    const target = this.targets().targetProteinGrams;
    if (!target) return 0;
    return Math.min(100, Math.round((this.dailyTotals().protein / target) * 100));
  });

  readonly carbsProgressPct = computed(() => {
    const target = this.targets().targetCarbsGrams;
    if (!target) return 0;
    return Math.min(100, Math.round((this.dailyTotals().carbs / target) * 100));
  });

  readonly fatProgressPct = computed(() => {
    const target = this.targets().targetFatGrams;
    if (!target) return 0;
    return Math.min(100, Math.round((this.dailyTotals().fat / target) * 100));
  });

  // Food selection
  selectFood(food: FoodItem): void {
    this.selectedFoodToAdd.set(food);
    this.customGrams.set(food.servingWeightGrams || 100);
  }

  clearSelectedFood(): void {
    this.selectedFoodToAdd.set(null);
  }

  setGrams(val: number): void {
    const g = Math.max(5, Math.min(2000, Math.round(val)));
    this.customGrams.set(g);
  }

  addSelectedFood(): void {
    const food = this.selectedFoodToAdd();
    if (!food) return;
    this.nutritionService.addFoodToLog(
      food,
      this.customGrams(),
      this.activeMeal(),
    );
    this.selectedFoodToAdd.set(null);
  }

  // Quick grams adjustment on already logged item
  updateItemGrams(item: LoggedFoodItem, delta: number): void {
    const nextGrams = Math.max(10, item.grams + delta);
    this.nutritionService.updateLoggedFoodGrams(item.id, nextGrams);
  }

  removeItem(id: string): void {
    this.nutritionService.removeLoggedFood(id);
  }

  clearDay(): void {
    if (confirm('¿Estás seguro de que deseas vaciar el registro del día?')) {
      this.nutritionService.clearAllLogs();
    }
  }

  loadSample(): void {
    this.nutritionService.loadInitialSampleData();
  }

  // AI Food Analysis
  async analyzeWithAI(): Promise<void> {
    const prompt = this.aiPrompt().trim();
    if (!prompt) return;

    this.isAnalyzingAI.set(true);
    this.aiError.set(null);
    this.aiResult.set(null);

    const res = await this.nutritionService.analyzeFoodWithAI(prompt);
    this.isAnalyzingAI.set(false);

    if (res.success && res.item) {
      this.aiResult.set(res.item);
    } else {
      this.aiError.set(res.message || 'No se pudo estimar la información.');
    }
  }

  addAiResultToMeal(): void {
    const item = this.aiResult();
    if (!item) return;

    this.nutritionService.addManualItemToLog({
      mealType: this.activeMeal(),
      name: item.name || 'Alimento analizado con IA',
      grams: item.grams || 100,
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      fiber: item.fiber || 0,
      sodiumMg: item.sodium || 0,
      sugar: item.sugar,
    });

    this.aiResult.set(null);
    this.aiPrompt.set('');
  }

  // Manual Food Modal
  openManualModal(): void {
    this.manualName.set('');
    this.manualGrams.set(100);
    this.manualCalories.set(150);
    this.manualProtein.set(10);
    this.manualCarbs.set(15);
    this.manualFat.set(5);
    this.manualFiber.set(2);
    this.showManualModal.set(true);
  }

  closeManualModal(): void {
    this.showManualModal.set(false);
  }

  saveManualFood(): void {
    const name = this.manualName().trim();
    if (!name) return;

    this.nutritionService.addManualItemToLog({
      mealType: this.activeMeal(),
      name,
      grams: this.manualGrams(),
      calories: this.manualCalories(),
      protein: this.manualProtein(),
      carbs: this.manualCarbs(),
      fat: this.manualFat(),
      fiber: this.manualFiber(),
    });

    this.showManualModal.set(false);
  }

  // Copy formatted daily nutrition report
  copyDayReport(): void {
    const totals = this.dailyTotals();
    const targets = this.targets();
    const meals = this.mealSummaries();

    let text = `📋 REPORTE NUTRICIONAL DEL DÍA\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔥 Calorías: ${totals.calories} / ${targets.targetCalories} kcal (${this.calProgressPct()}%)\n`;
    text += `🍗 Proteínas: ${totals.protein}g / ${targets.targetProteinGrams}g\n`;
    text += `🍚 Carbohidratos: ${totals.carbs}g / ${targets.targetCarbsGrams}g\n`;
    text += `🥑 Grasas: ${totals.fat}g / ${targets.targetFatGrams}g\n`;
    text += `🌿 Fibra: ${totals.fiber}g\n\n`;

    const mealNames: Record<MealType, string> = {
      breakfast: '🌅 Desayuno',
      lunch: '☀️ Almuerzo',
      dinner: '🌙 Cena',
      snack: '🍎 Snacks',
    };

    for (const key of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
      const m = meals[key];
      if (m.items.length > 0) {
        text += `${mealNames[key]} (${m.calories} kcal):\n`;
        for (const it of m.items) {
          text += `  • ${it.name} (${it.grams}g) -> ${it.calories} kcal [P:${it.protein}g C:${it.carbs}g G:${it.fat}g]\n`;
        }
        text += `\n`;
      }
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.copiedReport.set(true);
      setTimeout(() => this.copiedReport.set(false), 2500);
    }
  }

  getMealName(meal: MealType): string {
    switch (meal) {
      case 'breakfast':
        return 'Desayuno';
      case 'lunch':
        return 'Almuerzo';
      case 'dinner':
        return 'Cena';
      case 'snack':
        return 'Snacks';
    }
  }
}
