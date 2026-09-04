import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import {GoogleGenAI, Type} from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());
const angularApp = new AngularNodeAppEngine();

function getGenAI(apiKeyOverride?: string): GoogleGenAI | null {
  const apiKey = apiKeyOverride?.trim() || process.env['GEMINI_API_KEY'];
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Executes a Gemini generateContent request with automatic retry and fallback models
 * to gracefully handle 503 (high demand) and 429 spikes.
 */
async function generateWithResilience(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0],
) {
  const primaryModel = params.model || 'gemini-3.8-flash';
  // Fallback models valid under @google/genai guidelines
  const modelsToTry = [
    primaryModel,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  // Remove duplicates if primaryModel is already one of the fallbacks
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: unknown = null;

  for (const currentModel of uniqueModels) {
    // Attempt up to 2 times for each model if high demand (503)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: currentModel,
        });
        return response;
      } catch (err: unknown) {
        lastError = err;
        const errObj = err as {message?: string; status?: number; code?: number} | undefined;
        const errMsg = String(errObj?.message || '');
        const errStatus = errObj?.status || errObj?.code;

        const isTemporaryBusy =
          errStatus === 503 ||
          errStatus === 429 ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('temporarily unavailable');

        if (isTemporaryBusy) {
          // Wait briefly before retrying or falling back
          const waitTime = attempt === 0 ? 800 : 1200;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // If it's another type of error (e.g. invalid API key, prompt issue), throw immediately
        throw err;
      }
    }
  }

  throw lastError;
}

/**
 * Endpoint para validar la clave de API de Gemini proporcionada por el usuario
 */
app.post('/api/validate-key', async (req, res) => {
  try {
    const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
    const ai = getGenAI(userApiKey);
    if (!ai) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado una clave de API de Gemini.',
      });
    }

    const response = await generateWithResilience(ai, {
      model: 'gemini-3.8-flash',
      contents: 'Responde únicamente con la palabra OK.',
      config: {
        maxOutputTokens: 10,
        temperature: 0.1,
      },
    });

    if (response.text) {
      return res.json({
        success: true,
        message: '¡Clave de API válida y verificada con éxito!',
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'No se obtuvo respuesta del modelo con la clave proporcionada.',
      });
    }
  } catch (error: unknown) {
    console.error('Error al validar clave de API:', error);
    const errObj = error as {message?: string; status?: number; code?: number} | undefined;
    const msg = String(errObj?.message || '');
    if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
      return res.status(503).json({
        success: false,
        message:
          'El servicio de Gemini tiene alta demanda en este instante. La clave puede ser válida; reintenta la prueba en unos segundos.',
      });
    }
    return res.status(401).json({
      success: false,
      message:
        'Clave de API inválida o sin cuota disponible. Verifica tu clave en Google AI Studio.',
    });
  }
});

/**
 * Endpoint para chat interactivo con Gemini 3.8 Flash especializado en nutrición
 */
app.post('/api/chat', async (req, res) => {
  try {
    const {message, history, context} = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un mensaje para el chat',
      });
    }

    const userApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const ai = getGenAI(userApiKey);

    if (!ai) {
      return res.status(401).json({
        success: false,
        needsApiKey: true,
        message:
          'Por favor ingresa tu clave de API de Gemini en la barra superior del chat para comenzar.',
      });
    }

    let systemInstruction =
      'Eres NutriAI, un asesor nutricional inteligente, empático, profesional y motivador potenciado por Gemini 3.8 Flash. ' +
      'Tu especialidad es la nutrición clínica y deportiva, el cálculo y balance de macronutrientes (proteínas, carbohidratos, grasas y fibra), ' +
      'la planificación de menús saludables, sugerencias de recetas prácticas y el desmentido de mitos dietéticos. ' +
      'Responde siempre en español de manera clara, estructurada con listas o viñetas y resaltando en negrita datos cuantitativos clave (kcal, gramos). ' +
      'Mantén un tono cálido, alentador y basado en evidencia científica.';

    if (context) {
      systemInstruction +=
        '\n\n[CONTEXTO NUTRICIONAL DEL USUARIO]:' +
        `\n- Meta Calórica Diaria Objetivo: ${context.targetCalories ?? 'No definida'} kcal` +
        `\n- Objetivos de Macronutrientes: Proteína ${context.targetProteinGrams ?? 0}g, Carbohidratos ${context.targetCarbsGrams ?? 0}g, Grasas ${context.targetFatGrams ?? 0}g, Fibra ${context.targetFiberGrams ?? 0}g` +
        `\n- Consumo registrado hoy: ${context.currentCalories ?? 0} kcal (P: ${context.currentProtein ?? 0}g, C: ${context.currentCarbs ?? 0}g, G: ${context.currentFat ?? 0}g)` +
        `\n- Calorías restantes para hoy: ${(context.targetCalories ?? 0) - (context.currentCalories ?? 0)} kcal` +
        `\n- Objetivo personal: ${context.goal ?? 'Salud general'}` +
        '\nUtiliza este contexto para personalizar tus recomendaciones de alimentos, porciones y balance diario cuando sea relevante.';
    }

    // Build chat contents array
    const contents: {role: string; parts: {text: string}[]}[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if ((item.role === 'user' || item.role === 'model') && typeof item.content === 'string') {
          contents.push({
            role: item.role,
            parts: [{text: item.content}],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{text: message.trim()}],
    });

    const response = await generateWithResilience(ai, {
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo generar respuesta del asistente.',
      });
    }

    return res.json({
      success: true,
      reply,
    });
  } catch (error: unknown) {
    console.error('Error en endpoint /api/chat:', error);
    const errObj = error as {message?: string; status?: number; code?: number} | undefined;
    const msg = String(errObj?.message || '');
    const status = errObj?.status || errObj?.code;

    if (
      msg.includes('API_KEY_INVALID') ||
      msg.includes('API key not valid') ||
      status === 400 ||
      status === 401 ||
      status === 403
    ) {
      return res.status(401).json({
        success: false,
        invalidKey: true,
        message:
          'La clave de API de Gemini no es válida o ha caducado. Por favor verifica tu clave en Google AI Studio (aistudio.google.com/app/apikey).',
      });
    }

    if (
      msg.includes('503') ||
      msg.includes('high demand') ||
      msg.includes('UNAVAILABLE') ||
      status === 503
    ) {
      return res.status(503).json({
        success: false,
        highDemand: true,
        message:
          'Los servidores de Gemini están experimentando alta demanda momentánea (503). Por favor reintenta tu mensaje en unos segundos.',
      });
    }

    if (
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      status === 429
    ) {
      return res.status(429).json({
        success: false,
        quotaExceeded: true,
        message:
          'Límite de solicitudes alcanzado momentáneamente en la API. Por favor espera unos segundos antes de consultar nuevamente.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error al procesar tu consulta con Gemini. Por favor intenta nuevamente.',
    });
  }
});

/**
 * Endpoint para análisis inteligente de alimentos y recetas mediante IA
 */
app.post('/api/analyze-food', async (req, res) => {
  try {
    const {query} = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una descripción de alimento o preparación',
      });
    }

    const userApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const ai = getGenAI(userApiKey);
    if (!ai) {
      return res.status(503).json({
        success: false,
        message: 'Clave de API de Gemini no disponible en el servidor ni configurada por el usuario',
      });
    }

    const response = await generateWithResilience(ai, {
      model: 'gemini-3.8-flash',
      contents: `Analiza nutricionalmente este alimento o comida: "${query.trim()}". Devuelve la información estimada con valores realistas basados en tablas nutricionales estándar (USDA/SEN).`,
      config: {
        systemInstruction:
          'Eres un nutricionista profesional. Analiza el alimento o comida proporcionada y calcula sus calorías y macronutrientes. Si no se especifica cantidad exacta, asume una porción individual estándar.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description:
                'Nombre claro y estandarizado del alimento o preparación en español',
            },
            portion: {
              type: Type.STRING,
              description:
                'Descripción legible de la porción analizada, p. ej. "1 taza (200g)" o "1 porción (150g)"',
            },
            grams: {
              type: Type.NUMBER,
              description: 'Peso neto estimado en gramos',
            },
            calories: {
              type: Type.NUMBER,
              description: 'Calorías totales estimadas en kcal',
            },
            protein: {
              type: Type.NUMBER,
              description: 'Proteínas en gramos',
            },
            carbs: {
              type: Type.NUMBER,
              description: 'Carbohidratos totales en gramos',
            },
            fat: {
              type: Type.NUMBER,
              description: 'Grasas totales en gramos',
            },
            fiber: {
              type: Type.NUMBER,
              description: 'Fibra dietética en gramos',
            },
            sugar: {
              type: Type.NUMBER,
              description: 'Azúcares en gramos',
            },
            sodium: {
              type: Type.NUMBER,
              description: 'Sodio en miligramos (mg)',
            },
            category: {
              type: Type.STRING,
              description:
                'Categoría: Proteínas, Carbohidratos, Grasas Saludables, Lácteos, Frutas, Verduras o Plato Mixto',
            },
          },
          required: [
            'name',
            'portion',
            'grams',
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
          ],
        },
      },
    });

    const parsedText = response.text?.trim();
    if (!parsedText) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo obtener respuesta del modelo',
      });
    }

    const item = JSON.parse(parsedText);
    return res.json({success: true, item});
  } catch (error: unknown) {
    console.error('Error al analizar alimento:', error);
    const errObj = error as {message?: string; status?: number} | undefined;
    const msg = String(errObj?.message || '');
    if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
      return res.status(503).json({
        success: false,
        message:
          'El servicio de Gemini está ocupado temporalmente. Por favor reintenta en unos segundos.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error al analizar la información nutricional',
    });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
