import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { Budget, DevDataTable, DevelopmentSpec, Ticket } from './types';
import { calculateBudget, formatMoney } from './budget';
import { collapseBlankLines } from './chat';

/**
 * Genera el PDF del PRD/TRD + presupuesto de un ticket de desarrollo.
 *
 * Usa las fuentes estándar de PDF (Helvetica) en lugar de fuentes embebidas:
 * no toca el sistema de archivos, así que funciona tal cual en el build
 * `standalone` y dentro del contenedor. La contrapartida es que la codificación
 * es WinAnsi, de ahí `sanitize()`.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const COLOR_TEXT = rgb(0.12, 0.13, 0.15);
const COLOR_MUTED = rgb(0.42, 0.45, 0.5);
const COLOR_ACCENT = rgb(0.15, 0.39, 0.92);
const COLOR_RULE = rgb(0.85, 0.87, 0.9);
const COLOR_BAND = rgb(0.96, 0.97, 0.99);

/**
 * Helvetica sólo puede escribir caracteres WinAnsi. Traducimos la puntuación
 * tipográfica habitual y descartamos lo que quede fuera (emojis, CJK...), que
 * de otro modo haría lanzar a `drawText`.
 */
function sanitize(input: string): string {
  return (input ?? '')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●]/g, '-')
    .replace(/[→⇒]/g, '->')
    .replace(/ /g, ' ')
    // Latin-1 más los símbolos de WinAnsi que quedan fuera de ese rango (€, ™).
    // Sin el euro aquí, los importes salían sin divisa.
    .replace(/[^\x20-\x7E\xA1-\xFF€™\n]/g, '');
}

/** Qué documentos incluir en el PDF: cada uno se puede descargar solo o combinado. */
export interface PdfSections {
  prd: boolean;
  trd: boolean;
  budget: boolean;
}

export const FULL_PDF_SECTIONS: PdfSections = { prd: true, trd: true, budget: true };

interface Doc {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  /** Monoespaciada, sólo para el bloque de código del diagrama de flujo. */
  mono: PDFFont;
}

function newPage(doc: Doc): void {
  doc.page = doc.pdf.addPage([A4.width, A4.height]);
  doc.y = A4.height - MARGIN;
}

/** Reserva `needed` puntos verticales, saltando de página si no caben. */
function ensureSpace(doc: Doc, needed: number): void {
  if (doc.y - needed < MARGIN + 30) newPage(doc);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of sanitize(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      // Una palabra sola más ancha que la columna (URL, identificador): la
      // partimos por caracteres para no desbordar el margen.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

function drawParagraph(
  doc: Doc,
  text: string,
  options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}
): void {
  const size = options.size ?? 10;
  const font = options.font ?? doc.regular;
  const indent = options.indent ?? 0;
  const lineHeight = size * 1.45;
  const lines = wrapText(text, font, size, CONTENT_WIDTH - indent);

  for (const line of lines) {
    ensureSpace(doc, lineHeight);
    doc.page.drawText(line, {
      x: MARGIN + indent,
      y: doc.y - size,
      size,
      font,
      color: options.color ?? COLOR_TEXT,
    });
    doc.y -= lineHeight;
  }
  doc.y -= options.gap ?? 4;
}

function drawHeading(doc: Doc, text: string, level: 1 | 2): void {
  const size = level === 1 ? 15 : 11.5;
  ensureSpace(doc, size * 3);
  doc.y -= level === 1 ? 14 : 10;
  ensureSpace(doc, size * 2.5);

  doc.page.drawText(sanitize(text), {
    x: MARGIN,
    y: doc.y - size,
    size,
    font: doc.bold,
    color: level === 1 ? COLOR_ACCENT : COLOR_TEXT,
  });
  doc.y -= size * 1.4;

  if (level === 1) {
    doc.page.drawLine({
      start: { x: MARGIN, y: doc.y },
      end: { x: MARGIN + CONTENT_WIDTH, y: doc.y },
      thickness: 0.7,
      color: COLOR_RULE,
    });
    doc.y -= 10;
  } else {
    doc.y -= 2;
  }
}

function drawBullets(doc: Doc, items: string[], emptyLabel = 'Sin datos.'): void {
  if (items.length === 0) {
    drawParagraph(doc, emptyLabel, { color: COLOR_MUTED, size: 9.5 });
    return;
  }
  for (const item of items) {
    const lines = wrapText(item, doc.regular, 10, CONTENT_WIDTH - 16);
    lines.forEach((line, index) => {
      ensureSpace(doc, 14.5);
      if (index === 0) {
        doc.page.drawText('-', { x: MARGIN, y: doc.y - 10, size: 10, font: doc.bold, color: COLOR_ACCENT });
      }
      doc.page.drawText(line, { x: MARGIN + 16, y: doc.y - 10, size: 10, font: doc.regular, color: COLOR_TEXT });
      doc.y -= 14.5;
    });
    doc.y -= 2;
  }
  doc.y -= 4;
}

function drawKeyValue(doc: Doc, label: string, value: string): void {
  ensureSpace(doc, 16);
  const labelText = sanitize(label);
  doc.page.drawText(labelText, { x: MARGIN, y: doc.y - 9, size: 9, font: doc.bold, color: COLOR_MUTED });
  const labelWidth = doc.bold.widthOfTextAtSize(labelText, 9) + 8;
  const lines = wrapText(value, doc.regular, 9, CONTENT_WIDTH - labelWidth);
  lines.forEach((line, index) => {
    if (index > 0) ensureSpace(doc, 13);
    doc.page.drawText(line, {
      x: MARGIN + labelWidth,
      y: doc.y - 9 - (index === 0 ? 0 : 0),
      size: 9,
      font: doc.regular,
      color: COLOR_TEXT,
    });
    if (index < lines.length - 1) doc.y -= 13;
  });
  doc.y -= 15;
}

// ─── Tabla de presupuesto ─────────────────────────────────────────────────────

const TABLE_COLUMNS = [
  { key: 'module', label: 'Módulo', width: 0.4, align: 'left' as const },
  { key: 'hours', label: 'Horas (min-max)', width: 0.22, align: 'right' as const },
  { key: 'likely', label: 'Horas est.', width: 0.13, align: 'right' as const },
  { key: 'cost', label: 'Coste estimado', width: 0.25, align: 'right' as const },
];

function columnX(index: number): number {
  let x = MARGIN;
  for (let i = 0; i < index; i++) x += TABLE_COLUMNS[i].width * CONTENT_WIDTH;
  return x;
}

function drawTableRow(doc: Doc, cells: string[], opts: { header?: boolean; bold?: boolean } = {}): void {
  const size = opts.header ? 8.5 : 9;
  const font = opts.header || opts.bold ? doc.bold : doc.regular;

  // El nombre del módulo puede necesitar varias líneas; el resto de columnas no.
  const nameLines = wrapText(cells[0], font, size, TABLE_COLUMNS[0].width * CONTENT_WIDTH - 8);
  const rowHeight = Math.max(nameLines.length, 1) * 12 + 6;
  ensureSpace(doc, rowHeight + 4);

  if (opts.header) {
    doc.page.drawRectangle({
      x: MARGIN,
      y: doc.y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: COLOR_BAND,
    });
  }

  const top = doc.y - 12;
  nameLines.forEach((line, index) => {
    doc.page.drawText(line, {
      x: MARGIN + 4,
      y: top - index * 12,
      size,
      font,
      color: opts.header ? COLOR_MUTED : COLOR_TEXT,
    });
  });

  for (let i = 1; i < TABLE_COLUMNS.length; i++) {
    const text = sanitize(cells[i] ?? '');
    const right = columnX(i) + TABLE_COLUMNS[i].width * CONTENT_WIDTH - 4;
    doc.page.drawText(text, {
      x: right - font.widthOfTextAtSize(text, size),
      y: top,
      size,
      font,
      color: opts.header ? COLOR_MUTED : COLOR_TEXT,
    });
  }

  doc.y -= rowHeight;
  doc.page.drawLine({
    start: { x: MARGIN, y: doc.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: doc.y },
    thickness: 0.5,
    color: COLOR_RULE,
  });
}

// ─── Tablas del modelo de datos ───────────────────────────────────────────────
// Formato propio (no reutiliza drawTableRow/TABLE_COLUMNS): esas están
// pensadas para valores numéricos alineados a la derecha, mientras que aquí
// todo es texto y "Notas" necesita envolver a varias líneas.

function drawDataTables(doc: Doc, tables: DevDataTable[]): void {
  const col1 = MARGIN + CONTENT_WIDTH * 0.28;
  const col2 = MARGIN + CONTENT_WIDTH * 0.46;

  for (const table of tables) {
    drawParagraph(doc, table.name, { font: doc.bold, size: 10.5, gap: table.description ? 2 : 6 });
    if (table.description) {
      drawParagraph(doc, table.description, { size: 9, color: COLOR_MUTED, gap: 8 });
    }

    ensureSpace(doc, 20);
    ['Columna', 'Tipo', 'Notas'].forEach((label, i) => {
      doc.page.drawText(label, {
        x: [MARGIN, col1, col2][i],
        y: doc.y - 9,
        size: 8,
        font: doc.bold,
        color: COLOR_MUTED,
      });
    });
    doc.y -= 13;
    doc.page.drawLine({
      start: { x: MARGIN, y: doc.y },
      end: { x: MARGIN + CONTENT_WIDTH, y: doc.y },
      thickness: 0.5,
      color: COLOR_RULE,
    });
    doc.y -= 6;

    for (const column of table.columns) {
      const nameLines = wrapText(column.name, doc.regular, 9, col1 - MARGIN - 6);
      const typeLines = wrapText(column.type, doc.regular, 9, col2 - col1 - 6);
      const notesLines = wrapText(column.notes || '-', doc.regular, 9, MARGIN + CONTENT_WIDTH - col2);
      const rowLines = Math.max(nameLines.length, typeLines.length, notesLines.length, 1);
      ensureSpace(doc, rowLines * 12 + 4);

      const top = doc.y - 9;
      [nameLines, typeLines, notesLines].forEach((lines, colIndex) => {
        const x = [MARGIN, col1, col2][colIndex];
        const color = colIndex === 0 ? COLOR_TEXT : COLOR_MUTED;
        lines.forEach((line, i) => {
          doc.page.drawText(sanitize(line), { x, y: top - i * 12, size: 9, font: doc.regular, color });
        });
      });

      doc.y -= rowLines * 12 + 4;
    }
    doc.y -= 12;
  }
}

function drawBudgetTable(doc: Doc, budget: Budget): void {
  drawTableRow(doc, TABLE_COLUMNS.map(c => c.label), { header: true });

  for (const line of budget.lines) {
    drawTableRow(doc, [
      line.module,
      `${line.hoursMin} - ${line.hoursMax} h`,
      `${line.hoursLikely} h`,
      formatMoney(line.costLikely, budget.currency),
    ]);
  }

  drawTableRow(
    doc,
    [
      'Subtotal',
      `${budget.hours.min} - ${budget.hours.max} h`,
      `${budget.hours.likely} h`,
      formatMoney(budget.subtotal.likely, budget.currency),
    ],
    { bold: true }
  );

  drawTableRow(doc, [
    `Contingencia (${budget.contingencyPct}%)`,
    '',
    '',
    formatMoney(budget.contingency.likely, budget.currency),
  ]);

  drawTableRow(
    doc,
    [
      'TOTAL ESTIMADO',
      '',
      '',
      formatMoney(budget.total.likely, budget.currency),
    ],
    { bold: true }
  );

  doc.y -= 8;
  drawParagraph(
    doc,
    `Rango del presupuesto: ${formatMoney(budget.total.min, budget.currency)} - ${formatMoney(budget.total.max, budget.currency)} (contingencia del ${budget.contingencyPct}% incluida).`,
    { size: 9.5, font: doc.bold }
  );
  drawParagraph(
    doc,
    `Tarifa aplicada: ${formatMoney(budget.hourlyRate, budget.currency)}/hora. Estimación orientativa, no vinculante: se confirmará tras el refinamiento de requisitos con el cliente.`,
    { size: 8.5, color: COLOR_MUTED }
  );
}

// ─── Documento ────────────────────────────────────────────────────────────────

function drawCoverHeader(doc: Doc, ticket: Ticket, spec: DevelopmentSpec, bandLabel: string): void {
  doc.page.drawRectangle({ x: 0, y: A4.height - 118, width: A4.width, height: 118, color: COLOR_BAND });

  doc.page.drawText(sanitize(bandLabel), {
    x: MARGIN,
    y: A4.height - 46,
    size: 8.5,
    font: doc.bold,
    color: COLOR_ACCENT,
  });

  const titleLines = wrapText(spec.title, doc.bold, 19, CONTENT_WIDTH).slice(0, 2);
  titleLines.forEach((line, index) => {
    doc.page.drawText(line, {
      x: MARGIN,
      y: A4.height - 72 - index * 22,
      size: 19,
      font: doc.bold,
      color: COLOR_TEXT,
    });
  });

  doc.y = A4.height - 118 - 22;

  const created = ticket.created_at ? new Date(ticket.created_at) : new Date();
  drawKeyValue(doc, 'Ticket:', `#${ticket.id}`);
  drawKeyValue(doc, 'Proyecto:', ticket.project || 'General');
  drawKeyValue(doc, 'Solicitante:', ticket.username || `Usuario ${ticket.user_id}`);
  drawKeyValue(doc, 'Fecha:', created.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }));
  drawKeyValue(doc, 'Complejidad:', { low: 'Baja', medium: 'Media', high: 'Alta' }[spec.complexity]);
  drawKeyValue(
    doc,
    'Generado por:',
    spec.source === 'gemini' ? 'Análisis asistido por IA (Gemini)' : 'Borrador local sin IA - requiere revisión'
  );
}

function drawFooters(pdf: PDFDocument, font: PDFFont, reference: string): void {
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    const label = sanitize(`${reference}   ·   Página ${index + 1} de ${pages.length}`);
    page.drawLine({
      start: { x: MARGIN, y: MARGIN - 8 },
      end: { x: A4.width - MARGIN, y: MARGIN - 8 },
      thickness: 0.5,
      color: COLOR_RULE,
    });
    page.drawText(label, {
      x: MARGIN,
      y: MARGIN - 22,
      size: 7.5,
      font,
      color: COLOR_MUTED,
    });
  });
}

const REQUIREMENT_PRIORITY_LABEL = {
  must: 'Imprescindible',
  should: 'Deseable',
  could: 'Opcional',
} as const;

/** Etiqueta corta para portada/título/nombre de archivo según lo incluido. */
function sectionsSummary(sections: PdfSections): { band: string; file: string } {
  const parts: { label: string; file: string }[] = [];
  if (sections.prd) parts.push({ label: 'PRD', file: 'PRD' });
  if (sections.trd) parts.push({ label: 'TRD', file: 'TRD' });
  if (sections.budget) parts.push({ label: 'PRESUPUESTO', file: 'Estimacion' });
  return {
    band: parts.map(p => p.label).join(' / ') || 'DOCUMENTO',
    file: parts.map(p => p.file).join('-') || 'Documento',
  };
}

/**
 * Genera el PDF. `sections` controla qué documentos incluir — PRD, TRD y/o
 * estimación se pueden descargar solos o combinados; por defecto, todos.
 * Las cabeceras se numeran de forma dinámica según lo que quede incluido, así
 * que "sólo TRD" no arrastra un "2." colgante de una sección que no está.
 */
export async function buildDevelopmentPdf(
  ticket: Ticket,
  spec: DevelopmentSpec,
  sections: PdfSections = FULL_PDF_SECTIONS
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const doc: Doc = { pdf, page: pdf.addPage([A4.width, A4.height]), y: A4.height - MARGIN, regular, bold, mono };
  const { band, file } = sectionsSummary(sections);

  pdf.setTitle(sanitize(`${file} Ticket ${ticket.id} - ${spec.title}`));
  pdf.setSubject('Documento de requisitos y estimación económica generado para revisión interna');
  pdf.setProducer('Support Ticket System');

  drawCoverHeader(doc, ticket, spec, `${band} · TICKET #${ticket.id}`);

  // ── Avisos para revisión (si los hay) ──
  // El PDF es staff-only, así que es el sitio correcto para listar lo que el
  // análisis automático dejó pendiente o poco fiable. Se muestran siempre que
  // existan, independientemente de qué secciones se hayan pedido: son sobre la
  // fiabilidad del análisis en general, no de un documento en concreto.
  if (spec.warnings?.length > 0) {
    drawHeading(doc, 'Avisos para revision', 1);
    drawParagraph(
      doc,
      'Este documento es un borrador generado automaticamente. Antes de compartirlo con el cliente, revisa los siguientes puntos:',
      { size: 9.5, color: COLOR_MUTED }
    );
    drawBullets(doc, spec.warnings);
  }

  let n = 0;

  // ── PRD ──
  if (sections.prd) {
    n += 1;
    drawHeading(doc, `${n}. Product Requirements Document (PRD)`, 1);

    drawHeading(doc, `${n}.1 Problema / necesidad`, 2);
    drawParagraph(doc, spec.problem);

    drawHeading(doc, `${n}.2 Objetivo`, 2);
    drawParagraph(doc, spec.goal);

    drawHeading(doc, `${n}.3 Usuarios destinatarios`, 2);
    drawBullets(doc, spec.targetUsers);

    drawHeading(doc, `${n}.4 Alcance`, 2);
    drawBullets(doc, spec.scope);

    drawHeading(doc, `${n}.5 Fuera de alcance`, 2);
    drawBullets(doc, spec.outOfScope, 'No se excluyó nada explícitamente.');

    drawHeading(doc, `${n}.6 Requisitos funcionales`, 2);
    for (const requirement of spec.functionalRequirements) {
      drawParagraph(
        doc,
        `${requirement.id} · ${requirement.title}  [${REQUIREMENT_PRIORITY_LABEL[requirement.priority]}]`,
        { font: doc.bold, size: 10, gap: 1 }
      );
      if (requirement.description) {
        drawParagraph(doc, requirement.description, { size: 9.5, indent: 12, color: COLOR_MUTED, gap: 6 });
      }
    }

    drawHeading(doc, `${n}.7 Métricas de éxito`, 2);
    drawBullets(doc, spec.successMetrics, 'Pendiente de acordar con el cliente.');

    drawHeading(doc, `${n}.8 Supuestos`, 2);
    drawBullets(doc, spec.assumptions, 'Sin supuestos registrados.');

    drawHeading(doc, `${n}.9 Riesgos`, 2);
    drawBullets(doc, spec.risks, 'Sin riesgos identificados.');

    if (spec.openQuestions.length > 0) {
      drawHeading(doc, `${n}.10 Cuestiones abiertas`, 2);
      drawBullets(doc, spec.openQuestions);
    }

    // El diagrama es interactivo (Mermaid) y sólo se renderiza en el panel
    // web; aquí dejamos el código fuente en texto, útil igualmente para leer
    // la secuencia de pasos o pegarlo en un editor Mermaid.
    if (spec.flowDiagram) {
      drawHeading(doc, `${n}.11 Diagrama de flujo`, 2);
      drawParagraph(
        doc,
        'Diagrama interactivo disponible en la pestaña "Flujo" del ticket. Código fuente (Mermaid) para referencia:',
        { size: 9, color: COLOR_MUTED, gap: 6 }
      );
      drawParagraph(doc, spec.flowDiagram, { font: doc.mono, size: 7.5, color: COLOR_TEXT });
    }
  }

  // ── TRD ──
  if (sections.trd) {
    n += 1;
    drawHeading(doc, `${n}. Technical Requirements Document (TRD)`, 1);

    drawHeading(doc, `${n}.1 Arquitectura propuesta`, 2);
    drawParagraph(doc, spec.architecture);

    drawHeading(doc, `${n}.2 Componentes`, 2);
    drawBullets(doc, spec.components);

    drawHeading(doc, `${n}.3 Modelo de datos`, 2);
    if (spec.dataTables && spec.dataTables.length > 0) {
      drawDataTables(doc, spec.dataTables);
    } else {
      drawBullets(doc, spec.dataModel, 'Este desarrollo no requiere tablas nuevas.');
    }

    drawHeading(doc, `${n}.4 Integraciones`, 2);
    drawBullets(doc, spec.integrations, 'No se identificaron integraciones externas.');

    drawHeading(doc, `${n}.5 Requisitos no funcionales`, 2);
    drawBullets(doc, spec.nonFunctional);
  }

  // ── Estimación ──
  if (sections.budget) {
    n += 1;
    drawHeading(doc, `${n}. Estimación y presupuesto aproximado`, 1);
    drawBudgetTable(doc, calculateBudget(spec));

    drawHeading(doc, `${n}.1 Detalle de módulos`, 2);
    for (const item of spec.modules) {
      drawParagraph(doc, `${item.name} (${item.hoursLikely} h)`, { font: doc.bold, size: 10, gap: 1 });
      if (item.description) {
        drawParagraph(doc, item.description, { size: 9.5, indent: 12, color: COLOR_MUTED, gap: 6 });
      }
    }
  }

  // ── Anexos: contexto de origen. Sólo tienen sentido junto al PRD, que es lo
  // que documentan (de dónde salieron el problema y los requisitos). ──
  if (sections.prd) {
    drawHeading(doc, 'Anexo: solicitud original del cliente', 1);
    // collapseBlankLines: tickets antiguos pueden tener un pegado con decenas
    // de saltos de línea en cascada, que aquí desperdiciarían páginas enteras.
    drawParagraph(doc, collapseBlankLines(ticket.raw_text), { size: 9, color: COLOR_MUTED });

    // Conversación de refinamiento (si la hubo): sólo si aportó algo más que
    // la petición inicial.
    if (spec.conversation && spec.conversation.length > 1) {
      drawHeading(doc, 'Anexo: conversacion de refinamiento', 1);
      for (const m of spec.conversation) {
        const label = m.role === 'assistant' ? 'Asistente IA:' : 'Cliente:';
        drawParagraph(doc, `${label} ${collapseBlankLines(m.content)}`, {
          size: 9,
          color: m.role === 'assistant' ? COLOR_ACCENT : COLOR_TEXT,
          gap: 6,
        });
      }
    }
  }

  drawFooters(pdf, regular, `Ticket #${ticket.id} - ${ticket.project || 'General'} - ${band}`);

  return pdf.save();
}
