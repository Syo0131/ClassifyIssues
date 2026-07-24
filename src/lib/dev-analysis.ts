import { analyzeDevelopmentRequest, analysisFromDevelopmentSpec } from './ai';
import { applyDevTicketAnalysis } from './db';
import { AnalysisResult, DevelopmentBrief } from './types';

/**
 * Análisis de desarrollo en segundo plano.
 *
 * El PRD/TRD tarda varios segundos en generarse, demasiado para tener al
 * cliente esperando. Por eso el ticket se crea al instante con un análisis
 * "placeholder" (spec = NULL) y esta función lo completa después, fuera del
 * ciclo de la petición HTTP.
 *
 * Se dispara sin await desde la ruta. Funciona porque el servidor corre como
 * proceso Node de larga vida (output: 'standalone'); no sobreviviría a un
 * reinicio a mitad de análisis, en cuyo caso el ticket quedaría pendiente
 * (spec NULL) — ver runbook en CLAUDE.md para reprocesarlo.
 */

/** Análisis provisional mientras se genera el PRD/TRD real. */
export function pendingDevAnalysis(): AnalysisResult {
  return {
    category: 'Producto e Ingeniería',
    confidence: 0,
    issues: [],
    actions: [],
    summary: 'Solicitud de desarrollo recibida. Analizando requisitos…',
    priority: 'low',
    source: 'pending',
  };
}

export async function runDevAnalysisInBackground(
  ticketId: number,
  text: string,
  brief?: DevelopmentBrief
): Promise<void> {
  try {
    // analyzeDevelopmentRequest nunca lanza: si Gemini falla, cae al mock, así
    // que el ticket siempre acaba con un spec (aunque sea el borrador local).
    const spec = await analyzeDevelopmentRequest(text, brief);
    const applied = await applyDevTicketAnalysis(ticketId, analysisFromDevelopmentSpec(spec), spec);
    if (!applied) {
      console.error(`Dev analysis: el ticket ${ticketId} no se pudo actualizar (¿eliminado?).`);
    }
  } catch (error) {
    // Sólo un fallo de BD llega hasta aquí. El ticket queda pendiente.
    console.error(`Dev analysis en segundo plano falló para el ticket ${ticketId}:`, error);
  }
}
