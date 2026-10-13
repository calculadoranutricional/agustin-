import { describe, expect, it } from 'vitest';
import {
  analyzeFoodDirect,
  sendChatDirect,
  validateApiKeyDirect,
} from './gemini-client';

describe('GeminiClient Utils', () => {
  it('validateApiKeyDirect should return error if API key is empty', async () => {
    const res = await validateApiKeyDirect('   ');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Ingresa una clave de API');
  });

  it('sendChatDirect should return error if API key is empty', async () => {
    const res = await sendChatDirect('', 'Hola');
    expect(res.success).toBe(false);
    expect(res.needsApiKey).toBe(true);
  });

  it('analyzeFoodDirect should return error if API key is empty', async () => {
    const res = await analyzeFoodDirect('', '1 manzana');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Por favor ingresa tu clave de API');
  });
});
