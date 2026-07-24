import { UserRole } from './types';

/**
 * Reglas de acceso a tickets, en un único sitio.
 *
 * Los roles no son una jerarquía lineal: `admin` gestiona cuentas y ve toda la
 * bandeja, pero la gestión operativa de un ticket (cambiar su estado) sigue
 * siendo del `technician`. De ahí que haya dos predicados y no un nivel.
 */

/** Personal interno: ve todos los tickets, no sólo los que ha creado. */
export function canViewAllTickets(role?: string | null): boolean {
  return role === 'technician' || role === 'admin';
}

/** Puede cambiar el estado de un ticket (abrir, esperar, finalizar). */
export function canManageTicketStatus(role?: string | null): boolean {
  return role === 'technician';
}

/** Puede ver un ticket concreto: o es interno, o es el autor. */
export function canViewTicket(
  role: string | null | undefined,
  viewerId: number,
  ticketOwnerId: number,
): boolean {
  return canViewAllTickets(role) || ticketOwnerId === viewerId;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Cliente',
  technician: 'Técnico de Soporte',
  admin: 'Administrador',
};
