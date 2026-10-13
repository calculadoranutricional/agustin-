export function validateChatMessageInput(
  message: unknown,
  context?: unknown,
): {valid: boolean; message?: string} {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return {valid: false, message: 'Se requiere un mensaje para el chat'};
  }

  if (message.length > 2000) {
    return {
      valid: false,
      message: 'El mensaje supera el límite máximo de 2000 caracteres.',
    };
  }

  if (context && typeof context === 'object') {
    const ctx = context as {goal?: unknown};
    if (ctx.goal && typeof ctx.goal === 'string' && ctx.goal.length > 100) {
      return {
        valid: false,
        message: 'El campo "goal" en el contexto excede los 100 caracteres.',
      };
    }
  }

  return {valid: true};
}

export function validateAnalyzeFoodInput(
  query: unknown,
): {valid: boolean; message?: string} {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      valid: false,
      message: 'Se requiere una descripción de alimento o preparación',
    };
  }

  if (query.length > 500) {
    return {
      valid: false,
      message:
        'La consulta de alimento supera el límite máximo de 500 caracteres.',
    };
  }

  return {valid: true};
}
