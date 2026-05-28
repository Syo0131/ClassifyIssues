import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisResult } from './types';

const SYSTEM_PROMPT = `Eres un experto analista de soporte técnico. Tu tarea es analizar las solicitudes de los clientes y devolver un objeto JSON.

Instrucciones MUY ESTRICTAS de PRIORIDAD (Margen de Error Cero):
- "critical": Afectación GLOBAL comprobable o riesgo catastrófico. Casos exactos: Caída total del sistema (0% disponibilidad), brecha de seguridad grave (robo de datos), interrupción completa de transacciones núcleo (nadie puede operar). NUNCA usar si afecta a 1 solo usuario o sucursal.
- "high": Afectación PARCIAL severa o bloqueo total individual injustificado. Casos exactos: Un módulo completo caído, procesos sensibles al tiempo fallando, VIP totalmente bloqueado sin alternativa.
- "medium": Funcionalidad degradada individual o dudas que impiden operar. Casos exactos: "Olvidé mi contraseña", "Error al guardar", "Necesito configurar un rol". Problema técnico real, limitado al entorno local/personal.
- "low": POR DEFECTO para cualquier cosa que no detenga operaciones. Casos exactos: Peticiones de funciones (Feature requests), reportes cosméticos, mensajes vagos ("esto no funciona", "prueba", "test"), o agradecimientos.

Regla de Intercepción:
Si el texto es muy corto y no menciona caídas, o si incluye "test", "prueba", asume "low" agresivamente.

Campos del JSON:
- "category": Una de: "Operaciones", "Facturación", "Soporte Técnico", "Producto e Ingeniería", "Seguridad", "Recursos Humanos"
- "confidence": Número entre 0 y 1.
- "issues": Array de 1-3 problemas específicos. Si es un mensaje vago, indica "Mensaje sin contexto claro".
- "actions": Array de 1-3 acciones sugeridas. Si es vago, indica "Solicitar más detalles al cliente".
- "summary": Resumen de una frase (en español).
- "priority": Uno de: "low", "medium", "high", "critical".

Responde SOLO con JSON válido en ESPAÑOL.`;

declare global {
  // eslint-disable-next-line no-var
  var __geminiModel: import('@google/generative-ai').GenerativeModel | undefined;
  // eslint-disable-next-line no-var
  var __geminiModelSpec: string | undefined;
}

function getGeminiModelCached() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    throw new Error('Gemini not configured');
  }
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const spec = `${apiKey}:${modelName}`;
  if (!global.__geminiModel || global.__geminiModelSpec !== spec) {
    const genAI = new GoogleGenerativeAI(apiKey);
    global.__geminiModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.1, // Even stricter temperature for deterministic results
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    });
    global.__geminiModelSpec = spec;
  }
  return global.__geminiModel;
}

// ─── Retry Helper ─────────────────────────────────────────────────────────────
// Retries a function with exponential backoff for transient errors (429, 503).

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      const isRetryable = status === 503 || status === 429;

      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `Gemini API ${status} error (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}

export async function analyzeRequest(text: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    console.warn('⚠️ GEMINI_API_KEY is not set or set to mock. Using fallback mock analyzer.');
    return mockAnalyze(text);
  }

  try {
    const model = getGeminiModelCached();
    const result = await withRetry(() => model.generateContent(text));
    const content = result.response.text();
    
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content) as AnalysisResult;
    const validated = validateResult(parsed);
    return {
      ...validated,
      priority: applyBusinessPriorityPolicy(text.toLowerCase(), validated.priority, validated.category),
      source: 'gemini',
    };
  } catch (error) {
    console.error('Gemini API error, falling back to mock:', error);
    return mockAnalyze(text);
  }
}

function validateResult(result: AnalysisResult): Omit<AnalysisResult, 'source'> {
  const validCategories = [
    'Operaciones', 'Facturación', 'Soporte Técnico',
    'Producto e Ingeniería', 'Seguridad', 'Recursos Humanos'
  ];
  const validPriorities = ['low', 'medium', 'high', 'critical'] as const;

  return {
    category: validCategories.includes(result.category) ? result.category : 'Operaciones',
    confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
    issues: Array.isArray(result.issues) ? result.issues.slice(0, 5) : ['No se pudieron extraer problemas'],
    actions: Array.isArray(result.actions) ? result.actions.slice(0, 5) : ['Revisar solicitud manualmente'],
    summary: result.summary || 'La solicitud requiere revisión manual.',
    priority: validPriorities.includes(result.priority) ? result.priority : 'medium',
  };
}

// ─── Mock AI Fallback ─────────────────────────────────────────────────────────
// Uses Strict Regex matching for classification when no API key is available.

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  'Facturación': /\b(billing|invoice|payment|charge|refund|cost|price|fee|budget|expense|financial|revenue|accounting|factura|pago|cobro)\b/i,
  'Soporte Técnico': /\b(customer|complaint|support|satisfaction|feedback|service|respond|wait time|help desk|ticket|soporte|ayuda)\b/i,
  'Operaciones': /\b(delivery|shipping|logistics|supply chain|warehouse|inventory|tracking|delay|process|workflow|efficiency|entrega|logistica)\b/i,
  'Producto e Ingeniería': /\b(feature|bug|software|app|platform|development|release|update|design|ux|ui|performance|crash|error)\b/i,
  'Seguridad': /\b(security|breach|password|access|vpn|network|server|downtime|backup|firewall|data loss|cyber|seguridad|contraseña)\b/i,
  'Recursos Humanos': /\b(hiring|employee|onboarding|training|retention|salary|benefits|culture|team|recruitment|turnover|empleado)\b/i,
};

const CRITICAL_TECH_REGEX = /\b(error 500|error 503|ca[íi]da general|sistema ca[íi]do|plataforma ca[íi]da|servicio ca[íi]do|sitio ca[íi]do|base de datos ca[íi]da|server down|downtime|brecha de seguridad|robo de datos|no funciona nada)\b/i;
const GLOBAL_IMPACT_REGEX = /\b(todos|nadie|empresa|general|global|producci[óo]n|negocio detenido|operaci[óo]n detenida|sistema completo)\b/i;
const PERSONAL_SCOPE_REGEX = /\b(mi pc|mi computadora|mi equipo|mi laptop|mi usuario|mi cuenta|olvid[ée] mi contraseña|yo no puedo|mi|yo)\b/i;
const HARDWARE_LOCAL_REGEX = /\b(pc|computadora|equipo|laptop|teclado|mouse|pantalla|impresora)\b/i;
const CORE_SYSTEM_REGEX = /\b(sistema|plataforma|web|crm|portal|app|aplicaci[óo]n|m[óo]dulo|dashboard|servicio)\b/i;
const HIGH_PRIORITY_REGEX = /\b(no funciona|no enciende|no prende|no puedo entrar|error|fallo|bug|lento|importante|bloqueado|bloqueada)\b/i;
const MEDIUM_PRIORITY_REGEX = /\b(ayuda|duda|consulta|configurar|ajuste|contraseña)\b/i;
const LOW_PRIORITY_REGEX = /\b(gracias|me gustar[íi]a|opcional|color|test|prueba|sugerencia)\b/i;

function applyBusinessPriorityPolicy(lower: string, proposed: AnalysisResult['priority'], category: string): AnalysisResult['priority'] {
  const hasCriticalTechSignal = CRITICAL_TECH_REGEX.test(lower);
  const hasGlobalImpact = GLOBAL_IMPACT_REGEX.test(lower);
  const isPersonalScope = PERSONAL_SCOPE_REGEX.test(lower);
  const hasHardwareSignals = HARDWARE_LOCAL_REGEX.test(lower);
  const hasCoreSystemSignals = CORE_SYSTEM_REGEX.test(lower);

  const words = lower.split(/\s+/).length;

  // Vagueness Check: Extremely short messages without explicit high priority keywords are low.
  if (words < 4 && !hasCriticalTechSignal && !HIGH_PRIORITY_REGEX.test(lower)) {
    return 'low';
  }

  // Explicit Low check (e.g., "test") overrides anything unless it's genuinely critical tech.
  if (LOW_PRIORITY_REGEX.test(lower) && !hasCriticalTechSignal) {
    return 'low';
  }

  // Intercepting AI Hallucinations for CRITICAL priority
  if (proposed === 'critical') {
    // If the category is traditionally non-critical tech, downgrade unless global impact is clear.
    if (['Soporte Técnico', 'Recursos Humanos', 'Operaciones'].includes(category) && !hasGlobalImpact) {
      return 'medium';
    }
    // Critical requires explicit outage + global impact OR no personal scope.
    if (isPersonalScope || (!hasGlobalImpact && !hasCriticalTechSignal)) {
      return hasCoreSystemSignals ? 'high' : 'medium';
    }
  }

  // Local hardware/user incidents should not be high/critical by default.
  if ((isPersonalScope || hasHardwareSignals) && !hasCoreSystemSignals) {
    if (proposed === 'critical' || proposed === 'high') return 'medium';
  }

  return proposed;
}

function determineMockPriority(lower: string): AnalysisResult['priority'] {
  const hasCriticalTechSignal = CRITICAL_TECH_REGEX.test(lower);
  const hasGlobalImpact = GLOBAL_IMPACT_REGEX.test(lower);
  const isPersonalScope = PERSONAL_SCOPE_REGEX.test(lower);

  // VETO: Personal device/account incidents cannot be critical
  if (hasCriticalTechSignal && hasGlobalImpact && !isPersonalScope) {
    return 'critical';
  }

  if (isPersonalScope && HIGH_PRIORITY_REGEX.test(lower)) {
    return 'medium';
  }

  let basePriority: AnalysisResult['priority'] = 'low';
  
  if (HIGH_PRIORITY_REGEX.test(lower)) basePriority = 'high';
  else if (MEDIUM_PRIORITY_REGEX.test(lower)) basePriority = 'medium';
  else if (LOW_PRIORITY_REGEX.test(lower)) basePriority = 'low';

  return basePriority;
}

function mockAnalyze(text: string): AnalysisResult {
  const lower = text.toLowerCase();

  // Classify category using regex scoring
  let bestCategory = 'Operaciones';
  let bestScore = 0;
  for (const [category, regex] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = lower.match(new RegExp(regex.source, 'gi'));
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Determine base priority
  const basePriority = determineMockPriority(lower);

  // Apply stringent policy
  const priority = applyBusinessPriorityPolicy(lower, basePriority, bestCategory);

  // Extract issues
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const issues = sentences.length > 0
    ? sentences.slice(0, 4).map(s => s.replace(/^(we need |help |i need |please |necesitamos |ayuda |necesito |por favor )/i, '').trim())
    : [`Atender requerimientos asociados a ${bestCategory}`];

  const actions = [
    'Clasificar ticket según SLAs',
    'Revisar el impacto para priorizar si es necesario',
  ];

  // Build summary
  const firstSentence = sentences[0] || text.slice(0, 100);
  const summary = `El cliente indica un incidente: ${firstSentence.slice(0, 80)}...`;

  return {
    category: bestCategory,
    confidence: Math.min(0.95, 0.5 + bestScore * 0.15),
    issues,
    actions,
    summary: summary.length > 200 ? summary.slice(0, 197) + '...' : summary,
    priority,
    source: 'mock',
  };
}
