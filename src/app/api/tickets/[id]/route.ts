import { NextResponse } from 'next/server';
import { getTicketById, updateTicketStatus } from '@/lib/db';
import { auth } from '@/auth';

export const PATCH = auth(async function PATCH(req, { params }) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params as { id: string };
  const user = req.auth.user as any;

  if (user.role !== 'technician') {
    return NextResponse.json({ error: "Only technicians can update status" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const updated = updateTicketStatus(Number(id), status);
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

  try {
    const ticket = getTicketById(Number(id));
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Security: user can only see their own tickets
    if (user.role !== 'technician' && ticket.user_id !== Number(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;
