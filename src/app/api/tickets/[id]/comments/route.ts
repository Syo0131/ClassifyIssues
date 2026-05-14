import { NextResponse } from 'next/server';
import { createComment, getCommentsForTicket, getTicketById, getUserByUsername } from '@/lib/db';
import { auth } from '@/auth';

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
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (user.role !== 'technician' && ticket.user_id !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const comments = await getCommentsForTicket(Number(id));
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;

export const POST = auth(async function POST(req, { params }) {
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
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (user.role !== 'technician' && ticket.user_id !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { text } = body;

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    await createComment(Number(id), dbUser.id, text.trim());
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;
