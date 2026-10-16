import {
  analyzeFoodDirect,
  sendMessageDirect,
  validateApiKeyDirect,
} from './gemini-client';

describe('gemini-client', () => {
  describe('validateApiKeyDirect', () => {
    it('should return error when key is empty', async () => {
      const result = await validateApiKeyDirect('');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ingresa una clave de API');
    });

    it('should return error when key is whitespace', async () => {
      const result = await validateApiKeyDirect('   ');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ingresa una clave de API');
    });
  });

  describe('sendMessageDirect', () => {
    it('should return needsApiKey when key is empty', async () => {
      const result = await sendMessageDirect('', 'Hola');
      expect(result.success).toBe(false);
      expect(result.needsApiKey).toBe(true);
      expect(result.message).toContain('Por favor ingresa tu clave de API');
    });
  });

  describe('analyzeFoodDirect', () => {
    it('should return error when key is empty', async () => {
      const result = await analyzeFoodDirect('', '1 manzana');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Clave de API de Gemini no configurada');
    });
  });
});
