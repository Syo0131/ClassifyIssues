import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisResult } from './types';

const SYSTEM_PROMPT = `Eres un experto analista de soporte técnico. Tu tarea es analizar las solicitudes de los clientes (que a menudo no son técnicos) y devolver un objeto JSON.

Instrucciones MUY ESTRICTAS de PRIORIDAD:
- "critical": El sistema no funciona, la página está totalmente caída, el negocio está detenido o hay una emergencia comprobable.
- "high": Funciones principales con errores graves reales que impiden trabajar a los usuarios.
- "medium": Problemas concretos con funciones secundarias, bloqueos menores o consultas técnicas claras.
- "low": POR DEFECTO para cualquier mensaje vago, quejas sin detalle (ej. "esto no sirve", "está muy largo"), frases de prueba ("test"), comentarios conversacionales, sugerencias o dudas generales. Si no hay un problema técnico claro y descriptivo, DEBE ser "low".

Campos del JSON:
- "category": Una de: "Operaciones", "Facturación", "Soporte Técnico", "Producto e Ingeniería", "Seguridad", "Recursos Humanos"
- "confidence": Número entre 0 y 1.
- "issues": Array de 1-3 problemas específicos. Si es un mensaje vago, indica "Mensaje sin contexto claro".
- "actions": Array de 1-3 acciones sugeridas. Si es vago, indica "Solicitar más detalles al cliente".
- "summary": Resumen de una frase (en español).
- "priority": Uno de: "low", "medium", "high", "critical". (Aplica "low" agresivamente ante la falta de contexto).

Responde SOLO con JSON válido en ESPAÑOL.`;

export async function analyzeRequest(text: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    return mockAnalyze(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(text);
    const content = result.response.text();
    
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content) as AnalysisResult;
    return { ...validateResult(parsed), source: 'gemini' };
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

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  critical: ['caida', 'caída', 'no funciona', 'abajo', 'muerta', 'error 500', 'urgente', 'emergencia', 'parado', 'no carga'],
  high: ['importante', 'error', 'fallo', 'bug', 'lento', 'no puedo entrar'],
  medium: ['ayuda', 'duda', 'consulta', 'configurar', 'ajuste'],
  low: ['gracias', 'me gustaría', 'opcional', 'color'],
};

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
  let priority: AnalysisResult['priority'] = 'medium';
  for (const [p, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      priority = p as AnalysisResult['priority'];
      break;
    }
  }

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
