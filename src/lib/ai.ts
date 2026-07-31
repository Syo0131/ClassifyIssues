import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AnalysisResult,
  ChatMessage,
  DevDataTable,
  DevModule,
  DevRequirement,
  DevTableColumn,
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
- Los módulos, en conjunto, deben cubrir todos los requisitos funcionales "must". No dejes un "must" sin trabajo asignado.
- Entre 3 y 10 módulos. Entre 3 y 12 requisitos funcionales.

Guía de ESTIMACIÓN (órdenes de magnitud orientativos para trabajo de desarrollo real; ajústalos al contexto y al stack, NO son límites rígidos, sólo evitan estimaciones irreales):
- Pantalla/CRUD sencillo: 8-20 h.  Formulario/flujo con validaciones: 12-30 h.
- Autenticación, roles o permisos: 15-40 h.  Integración con API/pasarela externa: 25-60 h.
- Migración o importación de datos: 20-50 h.  Informes/dashboard/analítica: 15-40 h.
- QA/pruebas: típicamente 15-25% del total.  Gestión/coordinación: típicamente 8-15% del total.
- La dispersión debe reflejar incertidumbre real: hoursMax suele ser >= 1.3x hoursMin, más ancho cuanto menos claro esté el módulo. NO devuelvas hoursMin = hoursLikely = hoursMax salvo tareas triviales y muy conocidas.
- "complexity" según el TOTAL de hoursLikely: "low" si < 40 h, "medium" si 40-120 h, "high" si > 120 h.

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
- "dataModel": Array de entidades de datos con sus campos principales, en texto libre (resumen).
- "integrations": Array de sistemas externos o APIs necesarios.
- "nonFunctional": Array de requisitos no funcionales (rendimiento, seguridad, accesibilidad, disponibilidad).
- "dataTables": Array de objetos { "name": "nombre_tabla", "description": "...", "columns": [{ "name": "...", "type": "...", "notes": "..." (opcional) }] }. SÓLO si el desarrollo requiere persistir datos NUEVOS (tablas que no existen ya en el stack del cliente). Si no aplica (p. ej. es un cambio visual, de copy, o usa datos ya existentes), usa un array vacío []. Máximo 6 tablas, máximo 8 columnas por tabla.
- "flowDiagram": String en sintaxis Mermaid con el flujo principal del proceso o funcionalidad, SOLO cuando aporte valor visual real (varios pasos, decisiones, o roles distintos interactuando). Si no aplica (cambio simple, sin flujo que valga la pena diagramar), usa una cadena vacía "".
  Reglas ESTRICTAS del diagrama, para que sea válido y renderice sin errores:
  - Empieza siempre con "flowchart TD".
  - IDs de nodo cortos y alfanuméricos sin espacios: A, B, C, Paso1...
  - Etiquetas entre corchetes para pasos: A[Texto del paso]. Entre llaves para decisiones: B{¿Condición?}.
  - Conecta con flechas simples: A --> B  o  B -->|Si| C  o  B -->|No| D.
  - Dentro de las etiquetas NUNCA uses comillas, corchetes, llaves, pipes "|" ni punto y coma — sólo texto plano corto.
  - Sin subgraphs, sin estilos, sin comentarios. Máximo 10 nodos.
- "complexity": "low" | "medium" | "high".
- "openQuestions": Array de preguntas abiertas para el cliente.

Responde SOLO con JSON válido en ESPAÑOL.`;

const DEV_CHAT_MAX_QUESTIONS = 5;

const DEV_CHAT_SYSTEM_PROMPT = `Eres un analista de requisitos que refina, mediante una breve conversación, la petición de desarrollo de un cliente (normalmente NO técnico) antes de redactar la documentación.

Tu objetivo: con MUY pocas preguntas, sacar lo esencial que la petición no deja claro para poder escribir un buen PRD/TRD.

Reglas:
- Haz UNA sola pregunta por turno, concreta, corta y en lenguaje sencillo (sin jerga técnica).
- Pregunta SOLO sobre negocio, objetivo, usuarios, alcance, prioridades, plazos, presupuesto o criterios de éxito. NUNCA preguntes por tecnología, stack, infraestructura ni lenguajes: eso ya lo sabemos nosotros.
- No repitas algo que el cliente ya haya respondido. Si el cliente dice que no sabe o no aplica, sigue adelante.
- Máximo ${DEV_CHAT_MAX_QUESTIONS} preguntas en total. En cuanto tengas lo suficiente para redactar un documento razonable, DEJA de preguntar.
- Cuando ya no necesites preguntar más, responde con { "done": true, "question": null }.
- Si necesitas una pregunta más, responde con { "done": false, "question": "..." }.

Responde SOLO con JSON válido en ESPAÑOL con la forma { "done": boolean, "question": string|null }.`;

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
type ModelProfile = 'incident' | 'development' | 'chat';

const MODEL_PROFILES: Record<ModelProfile, { temperature: number; maxOutputTokens: number }> = {
  incident: { temperature: 0.3, maxOutputTokens: 1000 },
  // Un PRD/TRD completo es largo; con 8000 se truncaba a veces (JSON cortado ->
  // parse falla -> caía al mock). gemini-flash soporta salida grande.
  development: { temperature: 0.4, maxOutputTokens: 16000 },
  // El chat devuelve una pregunta corta, pero gemini-flash gasta tokens en
  // "thinking" interno que cuentan contra este límite; 500 truncaba el JSON.
  chat: { temperature: 0.5, maxOutputTokens: 2000 },
};

function getGeminiModelCached(profile: ModelProfile) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    throw new Error('Gemini not configured');
  }
  // Modelo fijo, no un alias "-latest": los alias apuntan silenciosamente al
  // modelo más nuevo de Google, que suele traer la cuota gratuita más
  // pequeña (ej. "gemini-flash-latest" pasó a resolver a un modelo con
  // límite de 20 peticiones/día sin avisar). Pinnar una versión concreta da
  // cuota estable y evita que un cambio de Google rompa la app sin tocar
  // nuestro código.
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const spec = `${apiKey}:${modelName}`;

  if (!global.__geminiModels || global.__geminiModelSpec !== spec) {
    global.__geminiModels = new Map();
    global.__geminiModelSpec = spec;
  }

  const cached = global.__geminiModels.get(profile);
  if (cached) return cached;

  const systemInstruction =
    profile === 'development' ? DEV_SYSTEM_PROMPT : profile === 'chat' ? DEV_CHAT_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const cfg = MODEL_PROFILES[profile];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: cfg.temperature,
      maxOutputTokens: cfg.maxOutputTokens,
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

/** Formatea la conversación de refinamiento como texto para el prompt. */
function formatConversation(conversation?: ChatMessage[]): string {
  if (!conversation || conversation.length === 0) return '';
  return conversation
    .map(m => (m.role === 'assistant' ? `PREGUNTA DEL ANALISTA: ${m.content}` : `CLIENTE: ${m.content}`))
    .join('\n');
}

/**
 * Combina la petición del cliente (que ahora llega como conversación de
 * refinamiento) con el stack que aporta el servidor. El stack va etiquetado
 * como dato nuestro, no como algo que el cliente haya dicho.
 */
function buildDevPrompt(text: string, brief?: DevelopmentBrief): string {
  const parts: string[] = [];
  const convo = formatConversation(brief?.conversation);
  if (convo) {
    parts.push(`CONVERSACIÓN DE REFINAMIENTO CON EL CLIENTE (la primera intervención es su petición original):\n${convo}`);
  } else {
    parts.push(`PETICIÓN DEL CLIENTE:\n${text}`);
  }
  if (brief?.stack?.trim()) {
    parts.push(
      `STACK ACTUAL DEL CLIENTE (dato interno verificado, el cliente no lo ha aportado):\n${brief.stack.trim()}`
    );
  }
  return parts.join('\n\n');
}

/**
 * Un turno del chat de refinamiento: dada la conversación hasta ahora, decide si
 * hacer otra pregunta o si ya hay suficiente. NUNCA lanza: si Gemini no está
 * configurado o falla, devuelve `done: true` para que el flujo siga sin chat.
 * El tope de preguntas se aplica también aquí, no sólo en el prompt.
 */
export async function nextDevChatQuestion(
  conversation: ChatMessage[]
): Promise<{ done: boolean; question: string | null }> {
  const askedSoFar = conversation.filter(m => m.role === 'assistant').length;
  if (askedSoFar >= DEV_CHAT_MAX_QUESTIONS) {
    return { done: true, question: null };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    return { done: true, question: null };
  }

  try {
    const model = getGeminiModelCached('chat');
    const contents = conversation.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const result = await withRetry(() => model.generateContent({ contents }));
    const content = result.response.text();
    if (!content) return { done: true, question: null };

    const parsed = JSON.parse(content) as { done?: boolean; question?: string | null };
    const question = typeof parsed.question === 'string' ? parsed.question.trim() : '';
    if (parsed.done || !question) return { done: true, question: null };
    return { done: false, question };
  } catch (error) {
    console.error('Dev chat question error, terminando el chat:', error);
    return { done: true, question: null };
  }
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
    const response = result.response;
    const finishReason = response.candidates?.[0]?.finishReason;

    // Avisos que no dependen del contenido: el stack ausente ya se sabe aquí.
    const extraWarnings: string[] = [];
    if (!brief?.stack) {
      extraWarnings.push('Sin contexto de stack para este proyecto: revisa la arquitectura propuesta y las horas de integración.');
    }

    let content = '';
    try {
      content = response.text();
    } catch {
      content = '';
    }

    if (!content) {
      console.error(`Gemini dev analysis: respuesta vacía (finishReason=${finishReason}).`);
      return mockDevelopmentSpec(text, brief, [
        'La IA no devolvió contenido; este borrador se generó por reglas y requiere rehacer el análisis.',
      ]);
    }

    // finishReason !== 'STOP' (normalmente 'MAX_TOKENS') = respuesta cortada.
    // Con application/json el corte deja el JSON incompleto y el parse falla; si
    // aun así parsea, conservamos lo que haya y avisamos.
    if (finishReason && finishReason !== 'STOP') {
      extraWarnings.push('La respuesta de la IA se truncó (límite de longitud); el análisis puede estar incompleto. Revísalo con especial cuidado.');
    }

    let parsed: Partial<DevelopmentSpec>;
    try {
      parsed = JSON.parse(content) as Partial<DevelopmentSpec>;
    } catch {
      // Distinguimos "truncado/ilegible" de "sin API key": logueamos el crudo
      // para diagnóstico y devolvemos un borrador de reglas marcado como tal.
      console.error(
        `Gemini dev analysis: JSON inválido (finishReason=${finishReason}). Recorte crudo (500 chars):`,
        content.slice(0, 500)
      );
      return mockDevelopmentSpec(text, brief, [
        'La IA devolvió una respuesta ilegible o truncada; este borrador se generó por reglas y requiere rehacer el análisis.',
      ]);
    }

    return {
      ...validateDevelopmentSpec(parsed, text, extraWarnings),
      conversation: brief?.conversation,
      source: 'gemini',
    };
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
 * Normaliza los módulos y fuerza la coherencia de la estimación de tres puntos
 * (min <= likely <= max) — el modelo la rompe con frecuencia. Además ensancha
 * las estimaciones degeneradas (min = likely = max), que dan falsa precisión al
 * presupuesto, y lo anota en `warnings` para el revisor.
 */
function normalizeModules(value: unknown, warnings: string[]): DevModule[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .slice(0, 12)
    .map((item, index) => {
      const likely = clampHours(item.hoursLikely, 8);
      let min = Math.min(clampHours(item.hoursMin, Math.max(1, Math.round(likely * 0.7))), likely);
      let max = Math.max(clampHours(item.hoursMax, Math.round(likely * 1.5)), likely);
      const name = toText(item.name, `Módulo ${index + 1}`);

      // min === max sólo ocurre si el modelo dio los tres valores iguales: no es
      // un rango real. Lo ensanchamos a una banda orientativa y avisamos.
      if (min === max) {
        min = Math.max(1, Math.round(likely * 0.75));
        max = Math.max(min + 1, Math.round(likely * 1.5));
        warnings.push(`Estimación del módulo "${name}" sin rango real (min=max); se ensanchó a una banda orientativa, revísala.`);
      }

      return { name, description: toText(item.description, ''), hoursMin: min, hoursLikely: likely, hoursMax: max };
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

function normalizeTableColumns(value: unknown): DevTableColumn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .slice(0, 8)
    .map(item => {
      const notes = toText(item.notes, '');
      return {
        name: toText(item.name, ''),
        type: toText(item.type, 'text'),
        ...(notes ? { notes } : {}),
      };
    })
    .filter(col => col.name.length > 0);
}

/**
 * Tablas nuevas que el desarrollo necesitaría, si aplica. No es obligatorio
 * que la IA aporte esto — muchos tickets no requieren datos nuevos — así que
 * un resultado vacío no genera aviso, a diferencia de los demás campos.
 */
function normalizeDataTables(value: unknown): DevDataTable[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .slice(0, 6)
    .map((item, index) => ({
      name: toText(item.name, `tabla_${index + 1}`),
      description: toText(item.description, ''),
      columns: normalizeTableColumns(item.columns),
    }))
    // Una tabla sin columnas válidas no aporta nada; se descarta en silencio.
    .filter(table => table.columns.length > 0);
}

/**
 * Valida el Mermaid que puede llegar de la IA. No lo "arreglamos": retocar a
 * ciegas una sintaxis rota puede dejarla igual de rota. Si no pasa una
 * comprobación estructural mínima, se descarta y se avisa al revisor en vez de
 * arriesgarse a guardar un diagrama que no va a renderizar en el panel.
 */
function normalizeFlowDiagram(value: unknown, warnings: string[]): string | undefined {
  if (typeof value !== 'string') return undefined;
  const diagram = value.trim();
  if (!diagram) return undefined;

  const MAX_LEN = 4000;
  if (diagram.length > MAX_LEN) {
    warnings.push('La IA devolvió un diagrama de flujo demasiado largo; se omitió. Puedes pedir que se regenere el análisis.');
    return undefined;
  }

  // "graph" es un alias válido y equivalente de "flowchart" en Mermaid; lo
  // aceptamos aunque el prompt pida "flowchart" explícitamente, por si acaso.
  const startsValid = /^(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i.test(diagram);
  const hasEdges = /-->/.test(diagram);
  if (!startsValid || !hasEdges) {
    warnings.push('La IA devolvió un diagrama de flujo con formato inválido; se omitió. Puedes pedir que se regenere el análisis.');
    return undefined;
  }

  return diagram;
}

// Campos array cuya ausencia merece un aviso al revisor (los más importantes de
// un PRD/TRD). Se comprueban sobre la salida cruda del modelo.
const REVIEWABLE_ARRAY_FIELDS: { key: keyof DevelopmentSpec; label: string }[] = [
  { key: 'successMetrics', label: 'métricas de éxito' },
  { key: 'assumptions', label: 'supuestos' },
  { key: 'risks', label: 'riesgos' },
  { key: 'components', label: 'componentes técnicos' },
  { key: 'dataModel', label: 'modelo de datos' },
  { key: 'integrations', label: 'integraciones' },
  { key: 'nonFunctional', label: 'requisitos no funcionales' },
];

function validateDevelopmentSpec(
  spec: Partial<DevelopmentSpec>,
  originalText: string,
  extraWarnings: string[] = []
): Omit<DevelopmentSpec, 'source'> {
  const validComplexity = ['low', 'medium', 'high'] as const;
  const warnings = [...extraWarnings];
  const modules = normalizeModules(spec.modules, warnings);
  const requirements = normalizeRequirements(spec.functionalRequirements);
  const dataTables = normalizeDataTables(spec.dataTables);
  const flowDiagram = normalizeFlowDiagram(spec.flowDiagram, warnings);

  // C1: en vez de vaciar en silencio, señalamos lo que la IA no aportó para que
  // el revisor sepa qué completar.
  for (const { key, label } of REVIEWABLE_ARRAY_FIELDS) {
    if (toStringArray(spec[key]).length === 0) {
      warnings.push(`La IA no aportó ${label}; complétalo en la revisión.`);
    }
  }
  if (requirements.length === 0) {
    warnings.push('La IA no derivó requisitos funcionales; la solicitud puede ser demasiado vaga.');
  }
  if (modules.length === 0) {
    warnings.push('La IA no aportó desglose de módulos; la estimación usa un desglose por defecto, revísala.');
  }

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
    dataTables: dataTables.length > 0 ? dataTables : undefined,
    flowDiagram,
    modules: modules.length > 0 ? modules : fallbackModules(),
    complexity: validComplexity.includes(spec.complexity as 'low' | 'medium' | 'high')
      ? (spec.complexity as 'low' | 'medium' | 'high')
      : 'medium',
    openQuestions: toStringArray(spec.openQuestions),
    warnings,
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

function mockDevelopmentSpec(
  text: string,
  brief?: DevelopmentBrief,
  extraWarnings: string[] = []
): DevelopmentSpec {
  // El texto útil incluye lo que el cliente respondió en el chat de refinamiento.
  const clientText = [text, ...(brief?.conversation ?? []).filter(m => m.role === 'user').map(m => m.content)]
    .join('\n')
    .trim();
  const lower = `${clientText} ${brief?.stack ?? ''}`.toLowerCase();
  const signals = DEV_COMPLEXITY_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const complexity: DevelopmentSpec['complexity'] = signals >= 4 ? 'high' : signals >= 2 ? 'medium' : 'low';
  const factor = complexity === 'high' ? 2 : complexity === 'medium' ? 1.4 : 1;

  const sentences = clientText
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10)
    .slice(0, 6);

  const requirements: DevRequirement[] = (sentences.length > 0 ? sentences : [clientText]).map(
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
    problem: text.trim().slice(0, 300) || clientText.slice(0, 300),
    goal: 'Objetivo pendiente de validar con el cliente.',
    targetUsers: ['Pendiente de definir'],
    scope: requirements.map(r => r.title),
    outOfScope: ['Todo lo no recogido explícitamente en el alcance'],
    functionalRequirements: requirements,
    successMetrics: ['Pendiente de acordar con el cliente'],
    assumptions: ['Documento generado sin asistencia de IA (modo local): requiere revisión de un analista.'],
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
    warnings: [
      'Borrador local sin IA (por reglas): requiere una revisión completa antes de compartirlo.',
      ...extraWarnings,
    ],
    conversation: brief?.conversation,
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

  // Una respuesta truncada es menos fiable: lo reflejamos en la confianza del
  // ticket clásico, no sólo en los avisos del panel.
  const wasTruncated = spec.warnings.some(w => w.includes('truncó'));
  const confidence = spec.source !== 'gemini' || wasTruncated ? 0.5 : 0.85;

  return {
    category: 'Producto e Ingeniería',
    confidence,
    issues: spec.functionalRequirements.slice(0, 5).map(r => `${r.id}: ${r.title}`),
    actions: spec.modules.slice(0, 5).map(m => m.name),
    summary: spec.goal.slice(0, 300),
    priority,
    source: spec.source,
  };
}
