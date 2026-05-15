import { NextResponse } from 'next/server';
import { analyzeRequest } from '@/lib/ai';
import { createTicket, getUserByUsername } from '@/lib/db';
import { auth } from '@/auth';

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, project } = body;

    const MAX_TICKET_TEXT = 20_000;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Describe la solicitud con al menos 10 caracteres.' },
        { status: 400 }
      );
    }

    if (text.trim().length > MAX_TICKET_TEXT) {
      return NextResponse.json(
        { error: `El texto no puede superar ${MAX_TICKET_TEXT} caracteres.` },
        { status: 400 }
      );
    }

    const sessionUser = req.auth.user as any;
    const dbUser = await getUserByUsername(sessionUser.name);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    const analysis = await analyzeRequest(text.trim());
    const ticket = await createTicket(dbUser.id, project || 'General', text.trim(), analysis);

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze the request. Please try again.' },
      { status: 500 }
    );
  }
}) as any;
