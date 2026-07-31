'use client';

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

interface RenderResult {
  chart: string;
  svg: string | null;
  failed: boolean;
}

const EMPTY_RESULT: RenderResult = { chart: '', svg: null, failed: false };

/**
 * Renderiza un diagrama Mermaid (flowchart) en el cliente. El texto del
 * diagrama lo genera la IA; aquí sólo lo pintamos, así que cualquier sintaxis
 * inválida se captura y se muestra un mensaje en vez de romper el panel.
 *
 * `securityLevel: 'strict'` sanea el SVG resultante (vía DOMPurify) — el
 * contenido de las etiquetas viene, indirectamente, de un modelo de lenguaje,
 * no de código nuestro, así que no se trata como confiable por defecto.
 *
 * Los colores se leen de las variables CSS de la app en el momento de
 * renderizar, para que el diagrama encaje en modo claro u oscuro sin
 * duplicar la paleta aquí.
 */
export default function MermaidDiagram({ chart }: { chart: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const elementId = `mermaid-${rawId}`;

  // `result` sólo se escribe dentro del then/catch del efecto, nunca de forma
  // síncrona en su cuerpo: comparar `result.chart` con `chart` en el render
  // (en vez de resetear el estado a "cargando" al entrar al efecto) evita el
  // doble render que provoca `setState` síncrono dentro de un efecto.
  const [result, setResult] = useState<RenderResult>(EMPTY_RESULT);

  useEffect(() => {
    let cancelled = false;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        primaryColor: isDark ? '#1e293b' : '#eff6ff',
        primaryTextColor: readCssVar('--text-primary', isDark ? '#f8fafc' : '#0f172a'),
        primaryBorderColor: readCssVar('--primary', '#2563eb'),
        lineColor: readCssVar('--text-muted', isDark ? '#64748b' : '#94a3b8'),
        fontSize: '14px',
      },
    });

    mermaid
      .render(elementId, chart)
      .then(({ svg }) => {
        if (!cancelled) setResult({ chart, svg, failed: false });
      })
      .catch(error => {
        console.error('Mermaid render error:', error);
        if (!cancelled) setResult({ chart, svg: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [chart, elementId]);

  const isCurrent = result.chart === chart;

  if (isCurrent && result.failed) {
    return (
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        No se pudo generar la vista previa de este diagrama. El código Mermaid está disponible en el PDF.
      </p>
    );
  }

  if (!isCurrent || !result.svg) {
    return <div className="spinner" style={{ width: '24px', height: '24px', color: 'var(--primary)', borderWidth: '2px' }} />;
  }

  return <div style={{ width: '100%', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: result.svg }} />;
}
