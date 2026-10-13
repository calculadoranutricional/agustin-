import { validateApiKeyClient, chatClient, analyzeFoodClient } from './gemini-client';

describe('GeminiClient', () => {
  describe('validateApiKeyClient', () => {
    it('should return error if API key is empty', async () => {
      const res = await validateApiKeyClient('');
      expect(res.success).toBe(false);
      expect(res.message).toContain('No se ha proporcionado una clave de API');
    });

    it('should handle whitespace API key', async () => {
      const res = await validateApiKeyClient('   ');
      expect(res.success).toBe(false);
      expect(res.message).toContain('No se ha proporcionado una clave de API');
    });
  });

  describe('chatClient', () => {
    it('should return needsApiKey if API key is missing', async () => {
      const res = await chatClient('', 'Hola');
      expect(res.success).toBe(false);
      expect(res.needsApiKey).toBe(true);
    });

    it('should return error if message is empty', async () => {
      const res = await chatClient('fake-key', '   ');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Se requiere un mensaje');
    });
  });

  describe('analyzeFoodClient', () => {
    it('should return error if API key is missing', async () => {
      const res = await analyzeFoodClient('', 'Manzana');
      expect(res.success).toBe(false);
      expect(res.message).toContain('configura tu clave de API');
    });

    it('should return error if query is empty', async () => {
      const res = await analyzeFoodClient('fake-key', '  ');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Se requiere una descripción');
    });
  });
});
