import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AnalysisResult,
  DevModule,
  DevRequirement,
  DevelopmentBrief,
  DevelopmentSpec,
  RequirementPriority,
} from './types';

const SYSTEM_PROMPT = `Eres un experto analista de soporte técnico. Tu tarea es analizar las solicitudes de los clientes (que a menudo no son técnicos) y devolver un objeto JSON.

Instrucciones MUY ESTRICTAS de PRIORIDAD:
- "critical": El sistema no funciona, la página está totalmente caída, el negocio está detenido o hay una emergencia comprobable.
- "high": Funciones principales con errores graves reales que impiden trabajar a los usuarios.
- "medium": Problemas concretos con funciones secundarias, bloqueos menores o consultas técnicas claras.
- "low": POR DEFECTO para cualquier mensaje vago, quejas sin detalle (ej. "esto no sirve", "está muy largo"), frases de prueba ("test"), comentarios conversacionales, sugerencias o dudas generales. Si no hay un problema técnico claro y descriptivo, DEBE ser "low".

Regla de negocio OBLIGATORIA:
- La prioridad se define por impacto al sistema/plataforma vendida (web, CRM, portal, app), NO por problemas individuales de hardware del cliente.
- Casos como "mi PC no funciona", "mi laptop no prende", "mi equipo está lento" deben ser "medium" salvo evidencia clara de caída del sistema vendido para múltiples usuarios.
- Para usar "critical" debe existir evidencia de impacto global (varios usuarios/empresa/producción detenida).

Campos del JSON:
- "category": Una de: "Operaciones", "Facturación", "Soporte Técnico", "Producto e Ingeniería", "Seguridad", "Recursos Humanos"
- "confidence": Número entre 0 y 1.
- "issues": Array de 1-3 problemas específicos. Si es un mensaje vago, indica "Mensaje sin contexto claro".
- "actions": Array de 1-3 acciones sugeridas. Si es vago, indica "Solicitar más detalles al cliente".
- "summary": Resumen de una frase (en español).
- "priority": Uno de: "low", "medium", "high", "critical". (Aplica "low" agresivamente ante la falta de contexto).

Responde SOLO con JSON válido en ESPAÑOL.`;

const DEV_SYSTEM_PROMPT = `Actúas simultáneamente como Product Manager, Product Owner y Software Engineer senior. Recibes la petición de un cliente (normalmente no técnico) para una nueva funcionalidad, producto o proyecto. Tu trabajo es convertirla en documentación accionable: un PRD (documento de requisitos de producto), un TRD (documento de requisitos técnicos) y una estimación de esfuerzo.

CONTEXTO IMPORTANTE: el cliente ya es un cliente activo con un producto en marcha. Cuando se te facilite el bloque "STACK ACTUAL DEL CLIENTE", trátalo como un hecho verificado, no como una suposición:
- La arquitectura propuesta debe partir de ese stack y extenderlo, no proponer una reescritura ni tecnologías ajenas salvo que la petición lo exija; si lo exige, justifícalo en "risks".
- NUNCA preguntes al cliente por su stack, su infraestructura o sus tecnologías en "openQuestions": ya lo sabemos. Reserva ese campo para dudas de negocio y de alcance.
- El trabajo de integración con lo que ya existe debe estar reflejado en las horas de los módulos.

Reglas OBLIGATORIAS:
- NO inventes datos de negocio que el cliente no haya dado. Lo que falte va en "assumptions" (supuestos) o en "openQuestions" (preguntas a resolver con el cliente).
- Si la petición es vaga, produce igualmente el documento con el alcance mínimo razonable y llena "openQuestions" con lo que hace falta aclarar.
- NUNCA devuelvas importes, precios ni divisas. Estima SOLO en horas de trabajo; el coste lo calcula otro sistema.
- Estima con tres puntos por módulo: hoursMin (optimista), hoursLikely (probable), hoursMax (pesimista). Debe cumplirse hoursMin <= hoursLikely <= hoursMax.
- Las horas deben incluir el trabajo real de ingeniería: análisis, implementación, pruebas y despliegue. Incluye siempre un módulo de QA/pruebas y otro de gestión/coordinación.
- Entre 3 y 8 módulos. Entre 3 y 12 requisitos funcionales.

Campos del JSON:
- "title": Título corto del proyecto.
- "problem": Problema o necesidad de negocio, en 2-3 frases.
- "goal": Objetivo medible del proyecto, en 1-2 frases.
- "targetUsers": Array de perfiles de usuario destinatarios.
- "scope": Array de lo que SÍ entra en el alcance.
- "outOfScope": Array de lo que NO entra (explícitamente excluido).
- "functionalRequirements": Array de objetos { "id": "RF-01", "title": "...", "description": "...", "priority": "must"|"should"|"could" }.
- "successMetrics": Array de métricas para saber si funcionó.
- "assumptions": Array de supuestos asumidos.
- "risks": Array de riesgos con su posible mitigación.
- "architecture": Párrafo describiendo la solución técnica propuesta y el stack.
- "components": Array de componentes/servicios a construir o modificar.
- "dataModel": Array de entidades de datos con sus campos principales.
- "integrations": Array de sistemas externos o APIs necesarios.
- "nonFunctional": Array de requisitos no funcionales (rendimiento, seguridad, accesibilidad, disponibilidad).
- "modules": Array de objetos { "name": "...", "description": "...", "hoursMin": n, "hoursLikely": n, "hoursMax": n }.
- "complexity": "low" | "medium" | "high".
- "openQuestions": Array de preguntas abiertas para el cliente.

Responde SOLO con JSON válido en ESPAÑOL.`;

declare global {
  // eslint-disable-next-line no-var
  var __geminiModels: Map<string, import('@google/generative-ai').GenerativeModel> | undefined;
  // eslint-disable-next-line no-var
  var __geminiModelSpec: string | undefined;
}

/**
 * Devuelve un modelo cacheado por "perfil" (triage de incidencias vs. análisis
 * de desarrollo). Cada perfil tiene su propia systemInstruction y límite de
 * tokens, así que no pueden compartir instancia. La caché entera se descarta si
 * cambia la API key o el nombre del modelo.
 */
function getGeminiModelCached(profile: 'incident' | 'development') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    throw new Error('Gemini not configured');
  }
  // Alias estable: gemini-2.5-flash devuelve 404 para keys nuevas.
  const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const spec = `${apiKey}:${modelName}`;

  if (!global.__geminiModels || global.__geminiModelSpec !== spec) {
    global.__geminiModels = new Map();
    global.__geminiModelSpec = spec;
  }

  const cached = global.__geminiModels.get(profile);
  if (cached) return cached;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: profile === 'development' ? DEV_SYSTEM_PROMPT : SYSTEM_PROMPT,
    generationConfig: {
      temperature: profile === 'development' ? 0.4 : 0.3,
      // Un PRD/TRD completo no cabe en el presupuesto del triage.
      maxOutputTokens: profile === 'development' ? 8000 : 1000,
      responseMimeType: 'application/json',
    },
  });
  global.__geminiModels.set(profile, model);
  return model;
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
    return mockAnalyze(text);
  }

  try {
    const model = getGeminiModelCached('incident');
    const result = await withRetry(() => model.generateContent(text));
    const content = result.response.text();
    
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content) as AnalysisResult;
    const validated = validateResult(parsed);
    return {
      ...validated,
      priority: applyBusinessPriorityPolicy(text.toLowerCase(), validated.priority),
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
// Uses keyword matching for classification when no API key is available.

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Facturación': ['billing', 'invoice', 'payment', 'charge', 'refund', 'cost', 'price', 'fee', 'budget', 'expense', 'financial', 'revenue', 'accounting', 'factura', 'pago'],
  'Soporte Técnico': ['customer', 'complaint', 'support', 'satisfaction', 'feedback', 'service', 'respond', 'wait time', 'help desk', 'ticket', 'soporte', 'ayuda'],
  'Operaciones': ['delivery', 'shipping', 'logistics', 'supply chain', 'warehouse', 'inventory', 'tracking', 'delay', 'process', 'workflow', 'efficiency', 'entrega', 'logistica'],
  'Producto e Ingeniería': ['feature', 'bug', 'software', 'app', 'platform', 'development', 'release', 'update', 'design', 'ux', 'ui', 'performance', 'crash', 'error'],
  'Seguridad': ['security', 'breach', 'password', 'access', 'vpn', 'network', 'server', 'downtime', 'backup', 'firewall', 'data loss', 'cyber', 'seguridad', 'contraseña'],
  'Recursos Humanos': ['hiring', 'employee', 'onboarding', 'training', 'retention', 'salary', 'benefits', 'culture', 'team', 'recruitment', 'turnover', 'empleado'],
};

const CRITICAL_TECH_KEYWORDS = [
  'error 500', 'error 503', 'caida general', 'caída general', 'sistema caido', 'sistema caído',
  'plataforma caida', 'plataforma caída', 'servicio caido', 'servicio caído', 'sitio caido', 'sitio caído',
  'base de datos caida', 'base de datos caída', 'server down', 'downtime',
];

const GLOBAL_IMPACT_KEYWORDS = [
  'todos', 'nadie', 'empresa', 'general', 'global', 'produccion', 'producción',
  'negocio detenido', 'operacion detenida', 'operación detenida', 'sistema completo',
];

const PERSONAL_SCOPE_KEYWORDS = [
  'mi pc', 'mi computadora', 'mi equipo', 'mi laptop', 'mi usuario', 'mi cuenta',
];

const HARDWARE_LOCAL_KEYWORDS = [
  'pc', 'computadora', 'equipo', 'laptop', 'teclado', 'mouse', 'pantalla', 'impresora',
];

const CORE_SYSTEM_KEYWORDS = [
  'sistema', 'plataforma', 'web', 'crm', 'portal', 'app', 'aplicacion', 'aplicación',
  'modulo', 'módulo', 'dashboard', 'servicio',
];

const HIGH_PRIORITY_KEYWORDS = [
  'no funciona', 'no enciende', 'no prende', 'no puedo entrar', 'error', 'fallo', 'bug',
  'lento', 'importante', 'bloqueado', 'bloqueada',
];

const MEDIUM_PRIORITY_KEYWORDS = ['ayuda', 'duda', 'consulta', 'configurar', 'ajuste'];
const LOW_PRIORITY_KEYWORDS = ['gracias', 'me gustaría', 'opcional', 'color', 'test', 'prueba'];

function applyBusinessPriorityPolicy(lower: string, proposed: AnalysisResult['priority']): AnalysisResult['priority'] {
  const hasCriticalTechSignal = CRITICAL_TECH_KEYWORDS.some(kw => lower.includes(kw));
  const hasGlobalImpact = GLOBAL_IMPACT_KEYWORDS.some(kw => lower.includes(kw));
  const isPersonalScope = PERSONAL_SCOPE_KEYWORDS.some(kw => lower.includes(kw));
  const hasHardwareSignals = HARDWARE_LOCAL_KEYWORDS.some(kw => lower.includes(kw));
  const hasCoreSystemSignals = CORE_SYSTEM_KEYWORDS.some(kw => lower.includes(kw));

  // Local hardware/user incidents should not be high/critical by default.
  if ((isPersonalScope || hasHardwareSignals) && !hasCoreSystemSignals) {
    if (proposed === 'critical' || proposed === 'high') return 'medium';
  }

  // Critical requires explicit outage + global impact.
  if (proposed === 'critical' && !(hasCriticalTechSignal && hasGlobalImpact && !isPersonalScope)) {
    return hasCoreSystemSignals ? 'high' : 'medium';
  }

  return proposed;
}

function determineMockPriority(lower: string): AnalysisResult['priority'] {
  const hasCriticalTechSignal = CRITICAL_TECH_KEYWORDS.some(kw => lower.includes(kw));
  const hasGlobalImpact = GLOBAL_IMPACT_KEYWORDS.some(kw => lower.includes(kw));
  const isPersonalScope = PERSONAL_SCOPE_KEYWORDS.some(kw => lower.includes(kw));

  // Critical only if there are explicit outage signals with broad business impact.
  if (hasCriticalTechSignal && hasGlobalImpact && !isPersonalScope) {
    return 'critical';
  }

  // Personal device/account incidents should not be marked as critical.
  if (isPersonalScope && (lower.includes('no funciona') || lower.includes('no enciende') || lower.includes('no prende'))) {
    return 'medium';
  }

  let basePriority: AnalysisResult['priority'] = 'low';
  if (HIGH_PRIORITY_KEYWORDS.some(kw => lower.includes(kw))) basePriority = 'high';
  else if (MEDIUM_PRIORITY_KEYWORDS.some(kw => lower.includes(kw))) basePriority = 'medium';
  else if (LOW_PRIORITY_KEYWORDS.some(kw => lower.includes(kw))) basePriority = 'low';

  return applyBusinessPriorityPolicy(lower, basePriority);
}

function mockAnalyze(text: string): AnalysisResult {
  const lower = text.toLowerCase();

  // Classify category
  let bestCategory = 'Operaciones';
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Determine priority
  const priority = determineMockPriority(lower);

  // Extract issues
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const issues = sentences.length > 0
    ? sentences.slice(0, 4).map(s => s.replace(/^(we need |help |i need |please |necesitamos |ayuda |necesito |por favor )/i, '').trim())
    : [`Atender preocupaciones de ${bestCategory.toLowerCase()} reportadas`];

  const actions = [
    'Agendar reunión de descubrimiento con los interesados',
    'Documentar requerimientos detallados',
    'Crear un plan de acción priorizado',
  ];

  // Build summary
  const firstSentence = sentences[0] || text.slice(0, 100);
  const summary = `El cliente solicita soporte relacionado con ${bestCategory.toLowerCase()}: ${firstSentence.toLowerCase().slice(0, 80)}...`;

  return {
    category: bestCategory,
    confidence: Math.min(0.95, 0.5 + bestScore * 0.12),
    issues,
    actions,
    summary: summary.length > 200 ? summary.slice(0, 197) + '...' : summary,
    priority,
    source: 'mock',
  };
}

// ─── Análisis de Desarrollo (PM / PO / Software Engineer) ─────────────────────
// Ruta paralela a analyzeRequest() para tickets de tipo `desarrollo`. Devuelve
// un PRD + TRD + estimación en horas. Igual que el triage de incidencias,
// NUNCA lanza: cae a un borrador mock si Gemini no está configurado o falla.

/**
 * Combina el texto libre del cliente con el contexto del formulario y el stack
 * que aporta el servidor. El stack va al final y etiquetado como dato nuestro,
 * no como algo que haya dicho el cliente.
 */
function buildDevPrompt(text: string, brief?: DevelopmentBrief): string {
  const parts = [`PETICIÓN DEL CLIENTE:\n${text}`];
  if (brief?.objective?.trim()) parts.push(`OBJETIVO DE NEGOCIO:\n${brief.objective.trim()}`);
  if (brief?.users?.trim()) parts.push(`USUARIOS DESTINATARIOS:\n${brief.users.trim()}`);
  if (brief?.deadline?.trim()) parts.push(`PLAZO DESEADO:\n${brief.deadline.trim()}`);
  if (brief?.stack?.trim()) {
    parts.push(
      `STACK ACTUAL DEL CLIENTE (dato interno verificado, el cliente no lo ha aportado):\n${brief.stack.trim()}`
    );
  }
  return parts.join('\n\n');
}

export async function analyzeDevelopmentRequest(
  text: string,
  brief?: DevelopmentBrief
): Promise<DevelopmentSpec> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    return mockDevelopmentSpec(text, brief);
  }

  try {
    const model = getGeminiModelCached('development');
    const result = await withRetry(() => model.generateContent(buildDevPrompt(text, brief)));
    const content = result.response.text();

    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content) as Partial<DevelopmentSpec>;
    return { ...validateDevelopmentSpec(parsed, text), source: 'gemini' };
  } catch (error) {
    console.error('Gemini development analysis error, falling back to mock:', error);
    return mockDevelopmentSpec(text, brief);
  }
}

function toStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter(item => typeof item === 'string' || typeof item === 'number')
    .map(item => String(item).trim())
    .filter(Boolean)
    .slice(0, 20);
  return cleaned.length > 0 ? cleaned : fallback;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeRequirements(value: unknown): DevRequirement[] {
  const validPriorities: RequirementPriority[] = ['must', 'should', 'could'];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .slice(0, 20)
    .map((item, index) => ({
      id: toText(item.id, `RF-${String(index + 1).padStart(2, '0')}`),
      title: toText(item.title, 'Requisito sin título'),
      description: toText(item.description, ''),
      priority: validPriorities.includes(item.priority as RequirementPriority)
        ? (item.priority as RequirementPriority)
        : 'should',
    }));
}

function clampHours(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  // Techo defensivo: evita que una alucinación genere presupuestos absurdos.
  return Math.min(2000, Math.round(n));
}

/**
 * Normaliza los módulos y, sobre todo, fuerza la coherencia de la estimación de
 * tres puntos (min <= likely <= max) — el modelo la rompe con frecuencia y el
 * presupuesto quedaría con rangos invertidos.
 */
function normalizeModules(value: unknown): DevModule[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .slice(0, 15)
    .map((item, index) => {
      const likely = clampHours(item.hoursLikely, 8);
      const min = Math.min(clampHours(item.hoursMin, Math.max(1, Math.round(likely * 0.7))), likely);
      const max = Math.max(clampHours(item.hoursMax, Math.round(likely * 1.5)), likely);
      return {
        name: toText(item.name, `Módulo ${index + 1}`),
        description: toText(item.description, ''),
        hoursMin: min,
        hoursLikely: likely,
        hoursMax: max,
      };
    });
}

function fallbackModules(): DevModule[] {
  return [
    { name: 'Análisis y diseño funcional', description: 'Refinar requisitos con el cliente y diseñar la solución.', hoursMin: 8, hoursLikely: 12, hoursMax: 20 },
    { name: 'Implementación', description: 'Desarrollo de la funcionalidad solicitada.', hoursMin: 24, hoursLikely: 40, hoursMax: 70 },
    { name: 'Pruebas y QA', description: 'Pruebas funcionales, correcciones y validación con el cliente.', hoursMin: 8, hoursLikely: 12, hoursMax: 20 },
    { name: 'Despliegue y gestión', description: 'Puesta en producción, documentación y coordinación.', hoursMin: 4, hoursLikely: 8, hoursMax: 14 },
  ];
}

function validateDevelopmentSpec(
  spec: Partial<DevelopmentSpec>,
  originalText: string
): Omit<DevelopmentSpec, 'source'> {
  const validComplexity = ['low', 'medium', 'high'] as const;
  const modules = normalizeModules(spec.modules);
  const requirements = normalizeRequirements(spec.functionalRequirements);

  return {
    title: toText(spec.title, originalText.trim().slice(0, 60) || 'Nuevo desarrollo'),
    problem: toText(spec.problem, 'No se detalló el problema de negocio en la solicitud.'),
    goal: toText(spec.goal, 'Objetivo pendiente de definir con el cliente.'),
    targetUsers: toStringArray(spec.targetUsers, ['Pendiente de definir']),
    scope: toStringArray(spec.scope, ['Pendiente de acotar con el cliente']),
    outOfScope: toStringArray(spec.outOfScope),
    functionalRequirements:
      requirements.length > 0
        ? requirements
        : [
            {
              id: 'RF-01',
              title: 'Requisito pendiente de elaborar',
              description: 'La solicitud no aportó detalle suficiente para derivar requisitos.',
              priority: 'must',
            },
          ],
    successMetrics: toStringArray(spec.successMetrics),
    assumptions: toStringArray(spec.assumptions),
    risks: toStringArray(spec.risks),
    architecture: toText(spec.architecture, 'Arquitectura pendiente de definir.'),
    components: toStringArray(spec.components),
    dataModel: toStringArray(spec.dataModel),
    integrations: toStringArray(spec.integrations),
    nonFunctional: toStringArray(spec.nonFunctional),
    modules: modules.length > 0 ? modules : fallbackModules(),
    complexity: validComplexity.includes(spec.complexity as 'low' | 'medium' | 'high')
      ? (spec.complexity as 'low' | 'medium' | 'high')
      : 'medium',
    openQuestions: toStringArray(spec.openQuestions),
  };
}

// ─── Borrador mock ────────────────────────────────────────────────────────────
// Sin API key producimos un PRD/TRD esqueleto: el flujo de desarrollo y el PDF
// siguen siendo utilizables en local, marcados con source = 'mock'.

const DEV_COMPLEXITY_KEYWORDS = [
  'integracion', 'integración', 'migracion', 'migración', 'pasarela', 'pago', 'facturacion',
  'facturación', 'multi-idioma', 'multiidioma', 'tiempo real', 'reportes', 'analitica',
  'analítica', 'movil', 'móvil', 'app', 'api', 'sso', 'permisos', 'roles', 'ia',
];

function mockDevelopmentSpec(text: string, brief?: DevelopmentBrief): DevelopmentSpec {
  const lower = `${text} ${brief?.objective ?? ''} ${brief?.stack ?? ''}`.toLowerCase();
  const signals = DEV_COMPLEXITY_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const complexity: DevelopmentSpec['complexity'] = signals >= 4 ? 'high' : signals >= 2 ? 'medium' : 'low';
  const factor = complexity === 'high' ? 2 : complexity === 'medium' ? 1.4 : 1;

  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10)
    .slice(0, 6);

  const requirements: DevRequirement[] = (sentences.length > 0 ? sentences : [text.trim()]).map(
    (sentence, index) => ({
      id: `RF-${String(index + 1).padStart(2, '0')}`,
      title: sentence.slice(0, 70),
      description: sentence,
      priority: index === 0 ? 'must' : index < 3 ? 'should' : 'could',
    })
  );

  const modules = fallbackModules().map(module => ({
    ...module,
    hoursMin: Math.round(module.hoursMin * factor),
    hoursLikely: Math.round(module.hoursLikely * factor),
    hoursMax: Math.round(module.hoursMax * factor),
  }));

  return {
    title: text.trim().slice(0, 60) || 'Nuevo desarrollo',
    problem: brief?.objective?.trim() || text.trim().slice(0, 300),
    goal: brief?.objective?.trim() || 'Objetivo pendiente de validar con el cliente.',
    targetUsers: brief?.users?.trim() ? [brief.users.trim()] : ['Pendiente de definir'],
    scope: requirements.map(r => r.title),
    outOfScope: ['Todo lo no recogido explícitamente en el alcance'],
    functionalRequirements: requirements,
    successMetrics: ['Pendiente de acordar con el cliente'],
    assumptions: [
      'Documento generado sin asistencia de IA (modo local): requiere revisión de un analista.',
      brief?.deadline?.trim() ? `Plazo indicado por el cliente: ${brief.deadline.trim()}` : 'No se indicó plazo.',
    ],
    risks: ['Alcance poco definido: la estimación puede variar tras el refinamiento.'],
    architecture: brief?.stack?.trim()
      ? `Se construye sobre el stack actual del cliente: ${brief.stack.trim()}`
      : 'Se propone reutilizar el stack actual del proyecto.',
    components: ['Pendiente de detallar en el diseño técnico'],
    dataModel: ['Pendiente de detallar en el diseño técnico'],
    integrations: [],
    nonFunctional: ['Rendimiento, seguridad y accesibilidad según los estándares del proyecto'],
    modules,
    complexity,
    openQuestions: [
      '¿Cuál es el criterio de aceptación para dar por cerrado el desarrollo?',
      '¿Existe alguna restricción de plazo o presupuesto?',
    ],
    source: 'mock',
  };
}

/**
 * Deriva los campos del ticket clásico (categoría, prioridad, resumen...) a
 * partir del PRD, para que un ticket de desarrollo se pueda listar y filtrar en
 * la bandeja igual que una incidencia.
 */
export function analysisFromDevelopmentSpec(spec: DevelopmentSpec): AnalysisResult {
  const priority: AnalysisResult['priority'] =
    spec.complexity === 'high' ? 'high' : spec.complexity === 'medium' ? 'medium' : 'low';

  return {
    category: 'Producto e Ingeniería',
    confidence: spec.source === 'gemini' ? 0.85 : 0.5,
    issues: spec.functionalRequirements.slice(0, 5).map(r => `${r.id}: ${r.title}`),
    actions: spec.modules.slice(0, 5).map(m => m.name),
    summary: spec.goal.slice(0, 300),
    priority,
    source: spec.source,
  };
}
