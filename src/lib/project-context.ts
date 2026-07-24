/**
 * Contexto técnico conocido de cada proyecto de cliente.
 *
 * Los clientes que usan el sistema ya están activos, así que su stack lo
 * conocemos nosotros: no se lo preguntamos en el formulario. Este módulo es la
 * única fuente de esa información y se inyecta en el prompt de desarrollo para
 * que la arquitectura propuesta sea coherente con lo que el cliente ya tiene.
 *
 * Configuración en `.env`:
 *   DEV_PROJECT_STACKS={"resend":"Next.js 16 + Postgres...","web":"WordPress..."}
 *   DEV_DEFAULT_STACK=Stack estándar para proyectos sin ficha propia.
 *
 * La búsqueda por nombre de proyecto es insensible a mayúsculas y espacios,
 * porque `tickets.project` es texto libre.
 */

declare global {
  var __projectStacks: Map<string, string> | undefined;
  var __projectStacksRaw: string | undefined;
}

const normalize = (value: string) => value.trim().toLowerCase();

function getStackMap(): Map<string, string> {
  const raw = process.env.DEV_PROJECT_STACKS?.trim() || '';

  if (global.__projectStacks && global.__projectStacksRaw === raw) {
    return global.__projectStacks;
  }

  const map = new Map<string, string>();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [project, stack] of Object.entries(parsed)) {
          if (typeof stack === 'string' && stack.trim()) {
            map.set(normalize(project), stack.trim());
          }
        }
      }
    } catch {
      // Un JSON mal formado no debe tumbar la creación de tickets: seguimos
      // sin contexto de stack y lo dejamos anotado en el log.
      console.warn('DEV_PROJECT_STACKS no es un JSON válido; se ignora.');
    }
  }

  global.__projectStacks = map;
  global.__projectStacksRaw = raw;
  return map;
}

/** Stack conocido del proyecto, o el genérico si no tiene ficha propia. */
export function getProjectStack(project?: string | null): string | undefined {
  const fallback = process.env.DEV_DEFAULT_STACK?.trim() || undefined;
  if (!project) return fallback;
  return getStackMap().get(normalize(project)) ?? fallback;
}
