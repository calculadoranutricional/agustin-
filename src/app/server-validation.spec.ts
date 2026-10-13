import {describe, expect, it} from 'vitest';
import {validateAnalyzeFoodInput, validateChatMessageInput} from './utils/server-validation';

describe('Server API Input Validation Logic', () => {
  it('should validate message length in chat request', () => {
    expect(validateChatMessageInput('')).toEqual({
      valid: false,
      message: 'Se requiere un mensaje para el chat',
    });

    const longMessage = 'a'.repeat(2001);
    expect(validateChatMessageInput(longMessage)).toEqual({
      valid: false,
      message: 'El mensaje supera el límite máximo de 2000 caracteres.',
    });

    const validMessage = 'a'.repeat(2000);
    expect(validateChatMessageInput(validMessage)).toEqual({valid: true});
  });

  it('should validate context goal length in chat request', () => {
    const longGoal = 'g'.repeat(101);
    expect(validateChatMessageInput('hola', {goal: longGoal})).toEqual({
      valid: false,
      message: 'El campo "goal" en el contexto excede los 100 caracteres.',
    });

    const validGoal = 'g'.repeat(100);
    expect(validateChatMessageInput('hola', {goal: validGoal})).toEqual({valid: true});
  });

  it('should validate query length in analyze-food request', () => {
    expect(validateAnalyzeFoodInput('')).toEqual({
      valid: false,
      message: 'Se requiere una descripción de alimento o preparación',
    });

    const longQuery = 'q'.repeat(501);
    expect(validateAnalyzeFoodInput(longQuery)).toEqual({
      valid: false,
      message: 'La consulta de alimento supera el límite máximo de 500 caracteres.',
    });

    const validQuery = 'q'.repeat(500);
    expect(validateAnalyzeFoodInput(validQuery)).toEqual({valid: true});
  });
});
