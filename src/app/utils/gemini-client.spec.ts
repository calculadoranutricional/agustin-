import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateGeminiApiKeyClient,
  sendChatMessageClient,
  analyzeFoodClient,
} from './gemini-client';

interface MockGenerateContentParams {
  contents?: string;
  config?: {
    responseMimeType?: string;
  };
}

const mockGenerateContent = vi.fn().mockImplementation(async (params: MockGenerateContentParams) => {
  if (params.contents === 'FAIL') {
    throw new Error('API_KEY_INVALID');
  }
  if (params.contents === 'BUSY') {
    const err = new Error('503 Service Unavailable') as Error & { status?: number };
    err.status = 503;
    throw err;
  }
  if (params.config?.responseMimeType === 'application/json') {
    return {
      text: JSON.stringify({
        name: 'Manzana Rallada',
        portion: '1 unidad (150g)',
        grams: 150,
        calories: 78,
        protein: 0.4,
        carbs: 20.6,
        fat: 0.3,
        fiber: 3.6,
      }),
    };
  }
  return {
    text: 'Respuesta simulada de Gemini OK',
  };
});

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
    },
  };
});

describe('Gemini Client Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateGeminiApiKeyClient', () => {
    it('returns error when API key is empty', async () => {
      const res = await validateGeminiApiKeyClient('');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Ingresa una clave');
    });

    it('returns success when API key is valid', async () => {
      const res = await validateGeminiApiKeyClient('AIzaSy123456');
      expect(res.success).toBe(true);
      expect(res.message).toContain('verificada con éxito');
    });

    it('handles invalid API key error', async () => {
      mockGenerateContent.mockImplementationOnce(async () => {
        throw new Error('API_KEY_INVALID');
      });
      const res = await validateGeminiApiKeyClient('INVALID_KEY');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Clave de API inválida');
    });
  });

  describe('sendChatMessageClient', () => {
    it('returns error when API key is missing', async () => {
      const res = await sendChatMessageClient('', 'Hola');
      expect(res.success).toBe(false);
      expect(res.needsApiKey).toBe(true);
    });

    it('returns reply when message is sent successfully', async () => {
      const res = await sendChatMessageClient('AIzaSy123456', 'Hola NutriAI');
      expect(res.success).toBe(true);
      expect(res.reply).toContain('Respuesta simulada');
    });

    it('formats context properly into system instruction', async () => {
      const res = await sendChatMessageClient(
        'AIzaSy123456',
        '¿Qué cenar?',
        [],
        {
          targetCalories: 2000,
          currentCalories: 1500,
          goal: 'fat_loss_moderate',
        },
      );
      expect(res.success).toBe(true);
    });
  });

  describe('analyzeFoodClient', () => {
    it('returns error when API key is missing', async () => {
      const res = await analyzeFoodClient('', 'Manzana');
      expect(res.success).toBe(false);
      expect(res.message).toContain('clave de API');
    });

    it('parses food analysis json response', async () => {
      const res = await analyzeFoodClient('AIzaSy123456', '1 manzana');
      expect(res.success).toBe(true);
      expect(res.item).toBeDefined();
      const item = res.item as { name: string; calories: number };
      expect(item.name).toBe('Manzana Rallada');
      expect(item.calories).toBe(78);
    });
  });
});
