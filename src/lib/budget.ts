import { Budget, BudgetFigures, BudgetLine, BudgetTimeline, DevModule, DevelopmentSpec } from './types';

/**
 * Presupuesto aproximado a partir de la estimación en horas del PRD/TRD.
 *
 * Deliberadamente la IA NO devuelve importes: sólo horas. El precio se deriva
 * aquí con la tarifa de `.env`, de modo que cambiar la tarifa reajusta todos los
 * presupuestos (incluidos los de tickets antiguos) sin volver a llamar a Gemini.
 * Por eso el presupuesto tampoco se persiste: se recalcula al mostrarlo.
 *
 * La estimación usa PERT sobre la estimación de tres puntos de cada módulo:
 *   - valor esperado por módulo   = (min + 4·likely + max) / 6
 *   - desviación estándar         = (max - min) / 6
 * El total esperado es la suma de los valores esperados; la incertidumbre del
 * total se combina sumando varianzas (módulos independientes) y de ahí sale el
 * percentil P80, que es la cifra defendible para cotizar.
 */

const DEFAULT_HOURLY_RATE = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TEAM_SIZE = 1;
const DEFAULT_HOURS_PER_WEEK = 32;
const DEFAULT_QUOTE_PERCENTILE = 80;

// Locale de formato de importes. es-DO: símbolo "US$" y coma como separador de
// miles (US$10,712), la convención dominicana para dólares. Configurable por si
// se factura a otro mercado.
const MONEY_LOCALE = process.env.DEV_MONEY_LOCALE?.trim() || 'es-DO';

function readNumberEnv(name: string, fallback: number, max: number, min = 0): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

/** ¿Está DEV_CONTINGENCY_PCT fijado a mano en el entorno? */
function contingencyOverride(): number | null {
  const raw = process.env.DEV_CONTINGENCY_PCT;
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

export function getBudgetSettings() {
  return {
    // La tarifa debe ser > 0: una tarifa 0 generaba un presupuesto todo-ceros.
    hourlyRate: readNumberEnv('DEV_HOURLY_RATE', DEFAULT_HOURLY_RATE, 100_000, 0.01),
    currency: (process.env.DEV_CURRENCY || DEFAULT_CURRENCY).trim().slice(0, 8) || DEFAULT_CURRENCY,
    teamSize: Math.max(1, Math.round(readNumberEnv('DEV_TEAM_SIZE', DEFAULT_TEAM_SIZE, 50, 1))),
    hoursPerWeek: readNumberEnv('DEV_HOURS_PER_WEEK', DEFAULT_HOURS_PER_WEEK, 80, 1),
    quotePercentile: Math.round(readNumberEnv('DEV_QUOTE_PERCENTILE', DEFAULT_QUOTE_PERCENTILE, 99, 50)),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Coste en unidades enteras de divisa: así el total impreso = suma de líneas. */
const money = (n: number) => Math.round(n);
const pertExpected = (min: number, likely: number, max: number) => (min + 4 * likely + max) / 6;
const pertStdDev = (min: number, max: number) => Math.max(0, (max - min) / 6);

/** Aproximación del z-score para un percentil (50–99) de la normal estándar. */
function zForPercentile(p: number): number {
  const table: Record<number, number> = {
    50: 0, 60: 0.253, 70: 0.524, 75: 0.674, 80: 0.842, 85: 1.036, 90: 1.282, 95: 1.645, 99: 2.326,
  };
  if (table[p] != null) return table[p];
  // Interpolación lineal entre los puntos conocidos.
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  const lo = keys.filter(k => k <= p).pop() ?? 50;
  const hi = keys.find(k => k >= p) ?? 99;
  if (lo === hi) return table[lo];
  const t = (p - lo) / (hi - lo);
  return table[lo] + t * (table[hi] - table[lo]);
}

const isEstimationWarning = (w: string) =>
  /ensanch|trunc|sin rango|desglose por defecto/i.test(w);

/**
 * Contingencia según el riesgo real del spec, en vez de un % fijo. Si
 * DEV_CONTINGENCY_PCT está definido en el entorno, ese valor manda.
 */
export function computeContingency(spec: DevelopmentSpec): { pct: number; rationale: string } {
  const override = contingencyOverride();
  if (override != null) {
    return { pct: override, rationale: `Valor fijo configurado (DEV_CONTINGENCY_PCT=${override}%).` };
  }

  const base = spec.complexity === 'high' ? 28 : spec.complexity === 'medium' ? 18 : 10;
  const factors: string[] = [`complejidad ${spec.complexity} (+${base}%)`];
  let pct = base;

  const ratios = spec.modules
    .filter(m => m.hoursMin > 0)
    .map(m => m.hoursMax / m.hoursMin);
  const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
  if (avgRatio > 4) {
    pct += 10;
    factors.push('dispersión muy alta de las estimaciones (+10%)');
  } else if (avgRatio > 2.5) {
    pct += 5;
    factors.push('dispersión alta de las estimaciones (+5%)');
  }

  const openQ = spec.openQuestions.length;
  if (openQ > 0) {
    const add = Math.min(12, openQ * 2);
    pct += add;
    factors.push(`${openQ} pregunta(s) abierta(s) (+${add}%)`);
  }

  if (spec.warnings.some(isEstimationWarning)) {
    pct += 3;
    factors.push('avisos sobre la fiabilidad de la estimación (+3%)');
  }

  pct = Math.max(10, Math.min(45, Math.round(pct)));
  return { pct, rationale: `Contingencia calculada: ${factors.join(', ')}. Total ${pct}%.` };
}

export function estimateConfidence(spec: DevelopmentSpec): Budget['estimateConfidence'] {
  const truncated = spec.warnings.some(w => /trunc/i.test(w));
  if (spec.source !== 'gemini' || truncated || spec.openQuestions.length >= 5) return 'low';
  if (spec.warnings.some(isEstimationWarning) || spec.openQuestions.length > 1) return 'medium';
  return 'high';
}

/** Módulo con `id`/`phase` garantizados, tolerando specs antiguos. */
function withDefaults(module: DevModule, index: number): DevModule {
  return {
    ...module,
    id: module.id || `M-${String(index + 1).padStart(2, '0')}`,
    phase: Number.isFinite(module.phase) && module.phase > 0 ? Math.round(module.phase) : 1,
    requirementIds: Array.isArray(module.requirementIds) ? module.requirementIds : [],
  };
}

function computeTimeline(
  spec: DevelopmentSpec,
  modules: DevModule[],
  expectedHoursWithContingency: number,
  p80HoursWithContingency: number,
  contingencyFactor: number,
): BudgetTimeline {
  const { teamSize, hoursPerWeek } = getBudgetSettings();
  const capacity = teamSize * hoursPerWeek;
  const weeks = (h: number) => Math.max(1, Math.ceil(h / capacity));

  const phaseNumbers = [...new Set(modules.map(m => m.phase))].sort((a, b) => a - b);
  const phaseMeta = new Map((spec.phases ?? []).map(p => [p.number, p]));

  const phases = phaseNumbers.map(number => {
    const phaseModules = modules.filter(m => m.phase === number);
    const rawHours = phaseModules.reduce((acc, m) => acc + pertExpected(m.hoursMin, m.hoursLikely, m.hoursMax), 0);
    const hours = Math.round(rawHours * (1 + contingencyFactor));
    return {
      number,
      name: phaseMeta.get(number)?.name || (number === 1 ? 'MVP' : `Fase ${number}`),
      hours,
      weeks: weeks(hours),
    };
  });

  return {
    teamSize,
    hoursPerWeek,
    weeksExpected: weeks(expectedHoursWithContingency),
    weeksP80: weeks(p80HoursWithContingency),
    phases,
  };
}

export function calculateBudget(spec: DevelopmentSpec): Budget {
  const { hourlyRate, currency, quotePercentile } = getBudgetSettings();
  const modules = spec.modules.map(withDefaults);

  const lines: BudgetLine[] = modules.map(module => {
    const hoursExpected = round2(pertExpected(module.hoursMin, module.hoursLikely, module.hoursMax));
    return {
      module: module.name,
      hoursMin: module.hoursMin,
      hoursLikely: module.hoursLikely,
      hoursMax: module.hoursMax,
      hoursExpected,
      costMin: money(module.hoursMin * hourlyRate),
      costLikely: money(module.hoursLikely * hourlyRate),
      costMax: money(module.hoursMax * hourlyRate),
      costExpected: money(hoursExpected * hourlyRate),
    };
  });

  const sum = (pick: (m: DevModule) => number) => modules.reduce((acc, m) => acc + pick(m), 0);
  const totalExpected = sum(m => pertExpected(m.hoursMin, m.hoursLikely, m.hoursMax));
  const totalStdDev = Math.sqrt(sum(m => pertStdDev(m.hoursMin, m.hoursMax) ** 2));
  const z = zForPercentile(quotePercentile);

  const hours: BudgetFigures = {
    min: sum(m => m.hoursMin),
    likely: sum(m => m.hoursLikely),
    max: sum(m => m.hoursMax),
    expected: round2(totalExpected),
    p80: round2(totalExpected + z * totalStdDev),
  };

  const { pct: contingencyPct, rationale: contingencyRationale } = computeContingency(spec);
  const factor = contingencyPct / 100;

  const scaleFigures = (h: BudgetFigures, mul: number): BudgetFigures => ({
    min: money(h.min * mul),
    likely: money(h.likely * mul),
    max: money(h.max * mul),
    expected: money(h.expected * mul),
    p80: money(h.p80 * mul),
  });

  const subtotal = scaleFigures(hours, hourlyRate);
  const contingency = scaleFigures(hours, hourlyRate * factor);
  const total: BudgetFigures = {
    min: subtotal.min + contingency.min,
    likely: subtotal.likely + contingency.likely,
    max: subtotal.max + contingency.max,
    expected: subtotal.expected + contingency.expected,
    p80: subtotal.p80 + contingency.p80,
  };

  const timeline = computeTimeline(
    spec,
    modules,
    hours.expected * (1 + factor),
    hours.p80 * (1 + factor),
    factor,
  );

  return {
    currency,
    hourlyRate,
    contingencyPct,
    contingencyRationale,
    estimateConfidence: estimateConfidence(spec),
    quotePercentile,
    lines,
    hours,
    subtotal,
    contingency,
    total,
    timeline,
  };
}

/** Formato de importe para UI y PDF (locale dominicano, sin decimales). */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(MONEY_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Divisa no reconocida por Intl (p. ej. un código inventado en .env).
    return `${new Intl.NumberFormat(MONEY_LOCALE, { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
  }
}
