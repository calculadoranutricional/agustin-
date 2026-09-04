import {Injectable, computed, signal} from '@angular/core';
import {ChatMessage} from '../models/nutrition.models';

export interface UserChatContext {
  targetCalories?: number;
  targetProteinGrams?: number;
  targetCarbsGrams?: number;
  targetFatGrams?: number;
  targetFiberGrams?: number;
  currentCalories?: number;
  currentProtein?: number;
  currentCarbs?: number;
  currentFat?: number;
  goal?: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'model',
  content:
    '¡Hola! Soy **NutriAI**, tu asistente nutricional inteligente potenciado por **Gemini 3.8 Flash**.\n\nPuedo ayudarte con:\n- Ideas de comidas y recetas adaptadas a tus calorías y macronutrientes.\n- Consejos para pérdida de grasa, ganancia de masa muscular o mantenimiento.\n- Sustituciones de alimentos para alergias o preferencias.\n- Análisis de mitos sobre suplementos, dietas y alimentos.\n\n*Nota: Para comenzar a chatear o realizar consultas ilimitadas, puedes configurar tu clave de API de Gemini en la barra superior.*',
  timestamp: Date.now(),
};

const STORAGE_API_KEY = 'nutrition_gemini_api_key';
const STORAGE_CHAT_KEY = 'nutrition_chat_history';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  // Stored API key for Gemini
  readonly apiKey = signal<string>(this.loadStoredApiKey());

  // API Key config visibility
  readonly isApiKeyConfigOpen = signal<boolean>(!this.loadStoredApiKey());

  // Computed checks
  readonly hasApiKey = computed<boolean>(() => this.apiKey().trim().length > 0);

  readonly maskedApiKey = computed<string>(() => {
    const key = this.apiKey().trim();
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
  });

  // Chat conversation state
  readonly messages = signal<ChatMessage[]>(this.loadStoredMessages());
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastFailedPrompt = signal<string | null>(null);

  constructor() {
    // If no key is set yet, keep config open by default
    if (!this.hasApiKey()) {
      this.isApiKeyConfigOpen.set(true);
    }
  }

  // Key operations
  saveApiKey(newKey: string): void {
    const cleaned = newKey.trim();
    this.apiKey.set(cleaned);
    if (typeof window !== 'undefined' && window.localStorage) {
      if (cleaned) {
        window.localStorage.setItem(STORAGE_API_KEY, cleaned);
      } else {
        window.localStorage.removeItem(STORAGE_API_KEY);
      }
    }
    this.errorMessage.set(null);
  }

  clearApiKey(): void {
    this.apiKey.set('');
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_API_KEY);
    }
    this.isApiKeyConfigOpen.set(true);
  }

  toggleConfigOpen(): void {
    this.isApiKeyConfigOpen.update((val) => !val);
  }

  // Validation API call
  async validateApiKey(keyToTest?: string): Promise<{success: boolean; message: string}> {
    const key = keyToTest?.trim() || this.apiKey().trim();
    if (!key) {
      return {success: false, message: 'Ingresa una clave de API antes de validar.'};
    }

    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': key,
        },
        body: JSON.stringify({apiKey: key}),
      });

      const data = (await response.json()) as {success: boolean; message?: string};
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || '¡Clave de API verificada con éxito!',
        };
      } else {
        return {
          success: false,
          message: data.message || 'Clave de API no válida o sin permisos suficientes.',
        };
      }
    } catch {
      return {
        success: false,
        message: 'No se pudo conectar con el servidor para verificar la clave.',
      };
    }
  }

  // Send message to Gemini 3.8 Flash
  async sendMessage(content: string, userContext?: UserChatContext): Promise<void> {
    const text = content.trim();
    if (!text || this.isLoading()) return;

    this.errorMessage.set(null);

    // 1. Append user message to state
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const currentHistory = this.messages();
    const updatedMessages = [...currentHistory, userMsg];
    this.messages.set(updatedMessages);
    this.saveMessagesToStorage(updatedMessages);

    this.isLoading.set(true);

    try {
      // Prepare history excluding welcome message
      const apiHistory = updatedMessages
        .filter((m) => m.id !== 'welcome-msg' && m !== userMsg)
        .slice(-10) // keep last 10 turns for context
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey().trim()) {
        headers['x-gemini-api-key'] = this.apiKey().trim();
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: apiHistory,
          context: userContext,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        reply?: string;
        message?: string;
        needsApiKey?: boolean;
        invalidKey?: boolean;
      };

      if (!response.ok || !data.success) {
        this.lastFailedPrompt.set(text);
        if (data.needsApiKey || data.invalidKey) {
          this.isApiKeyConfigOpen.set(true);
        }
        const errorText =
          data.message ||
          'Error al comunicarse con Gemini. Por favor intenta nuevamente en unos momentos.';
        this.errorMessage.set(errorText);

        const errorModelMsg: ChatMessage = {
          id: 'msg-err-' + Date.now(),
          role: 'model',
          content: `⚠️ **Aviso del Asistente:** ${errorText}`,
          timestamp: Date.now(),
        };
        const withError = [...this.messages(), errorModelMsg];
        this.messages.set(withError);
        this.saveMessagesToStorage(withError);
        return;
      }

      this.lastFailedPrompt.set(null);
      this.errorMessage.set(null);
      const modelReply = data.reply || 'Sin respuesta del modelo.';
      const modelMsg: ChatMessage = {
        id: 'msg-resp-' + Date.now(),
        role: 'model',
        content: modelReply,
        timestamp: Date.now(),
      };

      const finalMessages = [...this.messages(), modelMsg];
      this.messages.set(finalMessages);
      this.saveMessagesToStorage(finalMessages);
    } catch {
      this.lastFailedPrompt.set(text);
      const netErrorMsg: ChatMessage = {
        id: 'msg-net-err-' + Date.now(),
        role: 'model',
        content:
          '⚠️ **Error de conexión:** No se pudo enviar el mensaje al servidor. Comprueba tu conexión de red.',
        timestamp: Date.now(),
      };
      const withNetErr = [...this.messages(), netErrorMsg];
      this.messages.set(withNetErr);
      this.saveMessagesToStorage(withNetErr);
      this.errorMessage.set('Error de conexión con el servidor');
    } finally {
      this.isLoading.set(false);
    }
  }

  async retryLastMessage(userContext?: UserChatContext): Promise<void> {
    const prompt = this.lastFailedPrompt();
    if (!prompt || this.isLoading()) return;

    // Remove trailing error messages from history
    const current = this.messages();
    const cleaned = current.filter((m) => !m.content.startsWith('⚠️'));
    this.messages.set(cleaned);
    this.saveMessagesToStorage(cleaned);

    await this.sendMessage(prompt, userContext);
  }

  clearHistory(): void {
    const fresh = [
      {
        ...WELCOME_MESSAGE,
        timestamp: Date.now(),
      },
    ];
    this.messages.set(fresh);
    this.errorMessage.set(null);
    this.saveMessagesToStorage(fresh);
  }

  // Storage
  private loadStoredApiKey(): string {
    if (typeof window === 'undefined' || !window.localStorage) {
      return '';
    }
    try {
      return window.localStorage.getItem(STORAGE_API_KEY) || '';
    } catch {
      return '';
    }
  }

  private loadStoredMessages(): ChatMessage[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [WELCOME_MESSAGE];
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_CHAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [WELCOME_MESSAGE];
  }

  private saveMessagesToStorage(msgs: ChatMessage[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(msgs));
    } catch {
      // ignore
    }
  }
}
