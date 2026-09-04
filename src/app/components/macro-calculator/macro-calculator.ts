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
  ActivityLevel,
  Gender,
  MacroPreset,
  NutritionGoal,
} from '../../models/nutrition.models';
import {NutritionService} from '../../services/nutrition.service';

@Component({
  selector: 'app-macro-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './macro-calculator.html',
})
export class MacroCalculatorComponent {
  readonly nutritionService = inject(NutritionService);
  readonly profile = this.nutritionService.userProfile;
  readonly targets = this.nutritionService.targets;

  // Notification / saved banner
  readonly showSavedFeedback = signal(false);

  // BMI calculation
  readonly bmi = computed(() => {
    const p = this.profile();
    if (!p.heightCm || !p.weightKg) return 0;
    const heightM = p.heightCm / 100;
    const val = p.weightKg / (heightM * heightM);
    return Math.round(val * 10) / 10;
  });

  readonly bmiCategory = computed(() => {
    const val = this.bmi();
    if (val < 18.5) return {label: 'Bajo peso', color: 'text-amber-700 bg-amber-50 border-amber-200'};
    if (val < 25) return {label: 'Peso saludable', color: 'text-emerald-700 bg-emerald-50 border-emerald-200'};
    if (val < 30) return {label: 'Sobrepeso', color: 'text-orange-700 bg-orange-50 border-orange-200'};
    return {label: 'Obesidad', color: 'text-rose-700 bg-rose-50 border-rose-200'};
  });

  // Custom macro sum validation
  readonly customSum = computed(() => {
    const p = this.profile();
    return p.customProteinPct + p.customCarbsPct + p.customFatPct;
  });

  setGender(gender: Gender): void {
    this.nutritionService.updateProfile({gender});
  }

  setAge(val: number): void {
    const clamped = Math.max(14, Math.min(100, Math.round(val)));
    this.nutritionService.updateProfile({age: clamped});
  }

  setWeight(val: number): void {
    const clamped = Math.max(30, Math.min(250, Math.round(val * 10) / 10));
    this.nutritionService.updateProfile({weightKg: clamped});
  }

  setHeight(val: number): void {
    const clamped = Math.max(100, Math.min(230, Math.round(val)));
    this.nutritionService.updateProfile({heightCm: clamped});
  }

  setActivityLevel(activityLevel: ActivityLevel): void {
    this.nutritionService.updateProfile({activityLevel});
  }

  setGoal(goal: NutritionGoal): void {
    this.nutritionService.updateProfile({goal});
  }

  setMacroPreset(macroPreset: MacroPreset): void {
    this.nutritionService.updateProfile({macroPreset});
  }

  setCustomProtein(val: number): void {
    this.nutritionService.updateProfile({customProteinPct: Math.round(val)});
  }

  setCustomCarbs(val: number): void {
    this.nutritionService.updateProfile({customCarbsPct: Math.round(val)});
  }

  setCustomFat(val: number): void {
    this.nutritionService.updateProfile({customFatPct: Math.round(val)});
  }

  triggerSaveNotice(): void {
    this.showSavedFeedback.set(true);
    setTimeout(() => {
      this.showSavedFeedback.set(false);
    }, 2800);
  }
}
