import { Budget, BudgetLine, DevelopmentSpec } from './types';

/**
 * Presupuesto aproximado a partir de la estimación en horas del PRD/TRD.
 *
 * Deliberadamente la IA NO devuelve importes: sólo horas. El precio se deriva
 * aquí con la tarifa de `.env`, de modo que cambiar la tarifa reajusta todos los
 * presupuestos (incluidos los de tickets antiguos) sin volver a llamar a Gemini.
 * Por eso el presupuesto tampoco se persiste: se recalcula al mostrarlo.
 */

const DEFAULT_HOURLY_RATE = 45;
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_CONTINGENCY_PCT = 15;

function readNumberEnv(name: string, fallback: number, max: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > max) return fallback;
  return n;
}

export function getBudgetSettings() {
  return {
    hourlyRate: readNumberEnv('DEV_HOURLY_RATE', DEFAULT_HOURLY_RATE, 100_000),
    currency: (process.env.DEV_CURRENCY || DEFAULT_CURRENCY).trim().slice(0, 8) || DEFAULT_CURRENCY,
    contingencyPct: readNumberEnv('DEV_CONTINGENCY_PCT', DEFAULT_CONTINGENCY_PCT, 100),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateBudget(spec: DevelopmentSpec): Budget {
  const { hourlyRate, currency, contingencyPct } = getBudgetSettings();

  const lines: BudgetLine[] = spec.modules.map(module => ({
    module: module.name,
    hoursMin: module.hoursMin,
    hoursLikely: module.hoursLikely,
    hoursMax: module.hoursMax,
    costMin: round2(module.hoursMin * hourlyRate),
    costLikely: round2(module.hoursLikely * hourlyRate),
    costMax: round2(module.hoursMax * hourlyRate),
  }));

  const hours = {
    min: lines.reduce((acc, line) => acc + line.hoursMin, 0),
    likely: lines.reduce((acc, line) => acc + line.hoursLikely, 0),
    max: lines.reduce((acc, line) => acc + line.hoursMax, 0),
  };

  const subtotal = {
    min: round2(hours.min * hourlyRate),
    likely: round2(hours.likely * hourlyRate),
    max: round2(hours.max * hourlyRate),
  };

  const factor = contingencyPct / 100;
  const contingency = {
    min: round2(subtotal.min * factor),
    likely: round2(subtotal.likely * factor),
    max: round2(subtotal.max * factor),
  };

  return {
    currency,
    hourlyRate,
    contingencyPct,
    lines,
    hours,
    subtotal,
    contingency,
    total: {
      min: round2(subtotal.min + contingency.min),
      likely: round2(subtotal.likely + contingency.likely),
      max: round2(subtotal.max + contingency.max),
    },
  };
}

/** Formato de importe para UI y PDF (es-ES, sin decimales). */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Divisa no reconocida por Intl (p. ej. un código inventado en .env).
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
  }
}
