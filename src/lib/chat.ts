import { ChatMessage } from './types';

export const MAX_CHAT_MSG_LEN = 4_000;
export const MAX_CHAT_MESSAGES = 30;

/**
 * Colapsa líneas en blanco excesivas en texto libre pegado o escrito por el
 * usuario (p. ej. un correo pegado con decenas de saltos de línea), sin tocar
 * el contenido real. Un salto de línea doble (párrafo) se conserva; tres o
 * más se recortan a dos.
 *
 * Sin esto, un mensaje casi vacío en contenido pero con muchos `\n` se
 * renderiza gigantesco en cualquier sitio que use `white-space: pre-wrap`
 * (la pestaña "Conversación" del ticket), dejando un hueco enorme en blanco.
 */
export function collapseBlankLines(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Sanea la conversación de refinamiento recibida del cliente: valida forma,
 * limita cantidad y longitud, y colapsa saltos de línea excesivos. Usado por
 * `/api/analyze` y `/api/dev-chat` para no duplicar (ni desincronizar) la
 * misma lógica de saneado en dos rutas.
 */
export function parseConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m): m is { role: unknown; content: unknown } => !!m && typeof m === 'object')
    .slice(0, MAX_CHAT_MESSAGES)
    .map(m => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: typeof m.content === 'string' ? collapseBlankLines(m.content).slice(0, MAX_CHAT_MSG_LEN) : '',
    }))
    .filter(m => m.content.length > 0);
}
