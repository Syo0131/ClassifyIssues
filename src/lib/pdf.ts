import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { Budget, DevelopmentSpec, Ticket } from './types';
import { calculateBudget, formatMoney } from './budget';

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

interface Doc {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
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

function drawCoverHeader(doc: Doc, ticket: Ticket, spec: DevelopmentSpec): void {
  doc.page.drawRectangle({ x: 0, y: A4.height - 118, width: A4.width, height: 118, color: COLOR_BAND });

  doc.page.drawText('PRD / TRD + PRESUPUESTO', {
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

export async function buildDevelopmentPdf(ticket: Ticket, spec: DevelopmentSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const doc: Doc = { pdf, page: pdf.addPage([A4.width, A4.height]), y: A4.height - MARGIN, regular, bold };

  pdf.setTitle(sanitize(`PRD-TRD Ticket ${ticket.id} - ${spec.title}`));
  pdf.setSubject('Documento de requisitos de producto y técnicos con estimación económica');
  pdf.setProducer('Support Ticket System');

  drawCoverHeader(doc, ticket, spec);

  // ── 1. PRD ──
  drawHeading(doc, '1. Product Requirements Document (PRD)', 1);

  drawHeading(doc, '1.1 Problema / necesidad', 2);
  drawParagraph(doc, spec.problem);

  drawHeading(doc, '1.2 Objetivo', 2);
  drawParagraph(doc, spec.goal);

  drawHeading(doc, '1.3 Usuarios destinatarios', 2);
  drawBullets(doc, spec.targetUsers);

  drawHeading(doc, '1.4 Alcance', 2);
  drawBullets(doc, spec.scope);

  drawHeading(doc, '1.5 Fuera de alcance', 2);
  drawBullets(doc, spec.outOfScope, 'No se excluyó nada explícitamente.');

  drawHeading(doc, '1.6 Requisitos funcionales', 2);
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

  drawHeading(doc, '1.7 Métricas de éxito', 2);
  drawBullets(doc, spec.successMetrics, 'Pendiente de acordar con el cliente.');

  drawHeading(doc, '1.8 Supuestos', 2);
  drawBullets(doc, spec.assumptions, 'Sin supuestos registrados.');

  drawHeading(doc, '1.9 Riesgos', 2);
  drawBullets(doc, spec.risks, 'Sin riesgos identificados.');

  // ── 2. TRD ──
  drawHeading(doc, '2. Technical Requirements Document (TRD)', 1);

  drawHeading(doc, '2.1 Arquitectura propuesta', 2);
  drawParagraph(doc, spec.architecture);

  drawHeading(doc, '2.2 Componentes', 2);
  drawBullets(doc, spec.components);

  drawHeading(doc, '2.3 Modelo de datos', 2);
  drawBullets(doc, spec.dataModel);

  drawHeading(doc, '2.4 Integraciones', 2);
  drawBullets(doc, spec.integrations, 'No se identificaron integraciones externas.');

  drawHeading(doc, '2.5 Requisitos no funcionales', 2);
  drawBullets(doc, spec.nonFunctional);

  // ── 3. Estimación ──
  drawHeading(doc, '3. Estimación y presupuesto aproximado', 1);
  drawBudgetTable(doc, calculateBudget(spec));

  drawHeading(doc, '3.1 Detalle de módulos', 2);
  for (const item of spec.modules) {
    drawParagraph(doc, `${item.name} (${item.hoursLikely} h)`, { font: doc.bold, size: 10, gap: 1 });
    if (item.description) {
      drawParagraph(doc, item.description, { size: 9.5, indent: 12, color: COLOR_MUTED, gap: 6 });
    }
  }

  // ── 4. Cuestiones abiertas ──
  if (spec.openQuestions.length > 0) {
    drawHeading(doc, '4. Cuestiones abiertas', 1);
    drawBullets(doc, spec.openQuestions);
  }

  // ── Anexo ──
  drawHeading(doc, 'Anexo: solicitud original del cliente', 1);
  drawParagraph(doc, ticket.raw_text, { size: 9, color: COLOR_MUTED });

  drawFooters(pdf, regular, `Ticket #${ticket.id} - ${ticket.project || 'General'}`);

  return pdf.save();
}
