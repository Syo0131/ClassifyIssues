import { NextResponse } from 'next/server';
import { getUserByUsername, getTicketById } from './db';

export function requireAuth(req: any) {
  if (!req.auth || !req.auth.user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  return { user: req.auth.user };
}

export function requireTechnician(req: any) {
  const { user, error } = requireAuth(req);
  if (error) return { error };

  if (user.role !== 'technician') {
    return { error: NextResponse.json({ error: 'Solo los técnicos pueden realizar esta acción' }, { status: 403 }) };
  }
  return { user };
}

export async function requireTicketAccess(req: any, ticketId: number) {
  const { user, error } = requireAuth(req);
  if (error) return { error };

  const dbUser = await getUserByUsername(user.name);
  if (!dbUser) {
    return { error: NextResponse.json({ error: 'Usuario no encontrado en la base de datos' }, { status: 404 }) };
  }

  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    return { error: NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 }) };
  }

  if (user.role !== 'technician' && ticket.user_id !== dbUser.id) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }

  return { user, dbUser, ticket };
}

export async function getSessionDbUser(req: any) {
  const { user, error } = requireAuth(req);
  if (error) return { error };

  const dbUser = await getUserByUsername(user.name);
  if (!dbUser) {
    return { error: NextResponse.json({ error: 'Usuario no encontrado en la base de datos' }, { status: 404 }) };
  }

  return { user, dbUser };
}
