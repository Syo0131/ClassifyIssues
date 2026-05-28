import { NextResponse } from 'next/server';
import { updateTicketStatus } from '@/lib/db';
import { auth } from '@/auth';
import { requireTicketAccess } from '@/lib/auth-helpers';
import { UpdateTicketStatusSchema } from '@/lib/validation';

export const PATCH = auth(async function PATCH(req, { params }) {
  const { id } = await params as { id: string };
  const ticketId = Number(id);

  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { user, dbUser, error } = await requireTicketAccess(req, ticketId);
  if (error) return error;

  if (user.role !== 'technician') {
    return NextResponse.json({ error: "Solo los técnicos pueden actualizar el estado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateTicketStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { status } = parsed.data;

    const updated = await updateTicketStatus(ticketId, status as any, dbUser.id);
    if (!updated) {
      return NextResponse.json({ error: "Ticket no encontrado o sin cambios" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: "Ocurrió un error inesperado" }, { status: 500 });
  }
}) as any;

export const GET = auth(async function GET(req, { params }) {
  const { id } = await params as { id: string };
  const ticketId = Number(id);

  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { ticket, error } = await requireTicketAccess(req, ticketId);
  if (error) return error;

  return NextResponse.json(ticket);
}) as any;
