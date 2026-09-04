import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MacroCalculatorComponent} from './components/macro-calculator/macro-calculator';
import {MealTrackerComponent} from './components/meal-tracker/meal-tracker';
import {NutritionChatbot} from './components/nutrition-chatbot/nutrition-chatbot';
import {RecipeCalculatorComponent} from './components/recipe-calculator/recipe-calculator';
import {ChatService} from './services/chat.service';
import {NutritionService} from './services/nutrition.service';

export type AppTab = 'macros' | 'meals' | 'recipes' | 'chatbot';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MacroCalculatorComponent,
    MealTrackerComponent,
    RecipeCalculatorComponent,
    NutritionChatbot,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly nutritionService = inject(NutritionService);
  readonly chatService = inject(ChatService);
  readonly targets = this.nutritionService.targets;
  readonly dailyTotals = this.nutritionService.dailyTotals;

  // Active view tab
  readonly currentTab = signal<AppTab>('macros');

  setTab(tab: AppTab): void {
    this.currentTab.set(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
