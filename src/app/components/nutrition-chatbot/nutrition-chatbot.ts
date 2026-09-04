import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {ChatService} from '../../services/chat.service';
import {NutritionService} from '../../services/nutrition.service';

@Component({
  selector: 'app-nutrition-chatbot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './nutrition-chatbot.html',
})
export class NutritionChatbot {
  readonly chatService = inject(ChatService);
  readonly nutritionService = inject(NutritionService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  // Form input signal (no ngModel per strict Angular guidelines)
  readonly inputMessage = signal<string>('');
  readonly tempApiKey = signal<string>('');
  readonly showApiKey = signal<boolean>(false);
  readonly validationStatus = signal<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({testing: false});
  readonly copyFeedbackId = signal<string | null>(null);

  // Nutrition context derived from user's current calculations
  readonly userContext = computed(() => {
    const targets = this.nutritionService.targets();
    const totals = this.nutritionService.dailyTotals();
    const profile = this.nutritionService.userProfile();

    const goalLabels: Record<string, string> = {
      fat_loss_aggressive: 'Pérdida de grasa rápida',
      fat_loss_moderate: 'Pérdida de grasa moderada',
      fat_loss_light: 'Déficit calórico suave',
      maintain: 'Mantenimiento de peso',
      muscle_gain_lean: 'Ganancia muscular limpia',
      muscle_gain_bulk: 'Superávit calórico (Volumen)',
    };

    return {
      targetCalories: targets.targetCalories,
      targetProteinGrams: targets.targetProteinGrams,
      targetCarbsGrams: targets.targetCarbsGrams,
      targetFatGrams: targets.targetFatGrams,
      targetFiberGrams: targets.targetFiberGrams,
      currentCalories: totals.calories,
      currentProtein: totals.protein,
      currentCarbs: totals.carbs,
      currentFat: totals.fat,
      goal: goalLabels[profile.goal] || profile.goal,
    };
  });

  // Suggested prompt chips
  readonly promptChips: string[] = [
    '¿Qué puedo cenar con 400 kcal y alto en proteína?',
    '¿Cómo llegar a mi meta de proteína diaria?',
    'Dame 3 opciones de snacks saludables de menos de 150 kcal',
    '¿Cómo sustituir el pollo por opciones vegetales?',
    '¿Qué comer antes y después de entrenar para rendir mejor?',
    'Consejos para controlar la saciedad en déficit calórico',
  ];

  constructor() {
    // When apiKey changes or is initialized, update tempApiKey input
    effect(() => {
      const current = this.chatService.apiKey();
      this.tempApiKey.set(current);
    });

    // Auto-scroll to bottom when messages update
    effect(() => {
      const msgs = this.chatService.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  toggleShowApiKey(): void {
    this.showApiKey.update((prev) => !prev);
  }

  saveKey(): void {
    const key = this.tempApiKey().trim();
    this.chatService.saveApiKey(key);
    this.validationStatus.set({
      testing: false,
      success: true,
      message: key ? 'Clave de API guardada localmente' : 'Clave de API eliminada',
    });
    setTimeout(() => {
      this.validationStatus.set({testing: false});
    }, 4000);
  }

  async testKey(): Promise<void> {
    const key = this.tempApiKey().trim();
    if (!key) {
      this.validationStatus.set({
        testing: false,
        success: false,
        message: 'Ingresa una clave antes de verificar',
      });
      return;
    }

    this.validationStatus.set({testing: true});
    const result = await this.chatService.validateApiKey(key);
    this.validationStatus.set({
      testing: false,
      success: result.success,
      message: result.message,
    });

    if (result.success) {
      this.chatService.saveApiKey(key);
    }
  }

  clearKey(): void {
    this.tempApiKey.set('');
    this.chatService.clearApiKey();
    this.validationStatus.set({
      testing: false,
      success: false,
      message: 'Clave eliminada del navegador',
    });
    setTimeout(() => {
      this.validationStatus.set({testing: false});
    }, 3000);
  }

  usePromptChip(chip: string): void {
    this.inputMessage.set(chip);
    this.sendMessage();
  }

  retryLastPrompt(): void {
    this.chatService.retryLastMessage(this.userContext());
  }

  async sendMessage(): Promise<void> {
    const text = this.inputMessage().trim();
    if (!text || this.chatService.isLoading()) return;

    this.inputMessage.set('');
    await this.chatService.sendMessage(text, this.userContext());
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  copyMessage(content: string, id: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      this.copyFeedbackId.set(id);
      setTimeout(() => {
        if (this.copyFeedbackId() === id) {
          this.copyFeedbackId.set(null);
        }
      }, 2000);
    }
  }
}
