import { NextResponse } from 'next/server';
import { analyzeRequest } from '@/lib/ai';
import { createTicket } from '@/lib/db';
import { auth } from '@/auth';
import { getSessionDbUser } from '@/lib/auth-helpers';
import { CreateTicketSchema } from '@/lib/validation';

export const POST = auth(async function POST(req) {
  const { dbUser, error: authError } = await getSessionDbUser(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = CreateTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { text, project } = parsed.data;

    const analysis = await analyzeRequest(text.trim());
    const ticket = await createTicket(dbUser.id, project, text.trim(), analysis);

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze the request. Please try again.' },
      { status: 500 }
    );
  }
}) as any;
