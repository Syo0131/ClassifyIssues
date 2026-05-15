import { NextResponse } from 'next/server';
import { getTicketById, getUserByUsername, updateTicketStatus } from '@/lib/db';
import type { TicketStatus } from '@/lib/types';
import { auth } from '@/auth';

const ALLOWED_STATUS: TicketStatus[] = ['open', 'waiting_on_client', 'closed'];

export const PATCH = auth(async function PATCH(req, { params }) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params as { id: string };
  const user = req.auth.user as any;
  const dbUser = await getUserByUsername(user.name);
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
  }

  if (user.role !== 'technician') {
    return NextResponse.json({ error: "Only technicians can update status" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { status } = body;

    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    if (!ALLOWED_STATUS.includes(status as TicketStatus)) {
      return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
    }

    const updated = await updateTicketStatus(Number(id), status as TicketStatus, dbUser.id);
    if (!updated) {
      return NextResponse.json({ error: "Ticket not found or no changes" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;

export const GET = auth(async function GET(req, { params }) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params as { id: string };
  const user = req.auth.user as any;
  const dbUser = await getUserByUsername(user.name);
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
  }

  try {
    const ticket = await getTicketById(Number(id));
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Security: user can only see their own tickets
    if (user.role !== 'technician' && ticket.user_id !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;
