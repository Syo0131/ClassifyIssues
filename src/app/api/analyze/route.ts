import { NextRequest, NextResponse } from 'next/server';
import { analyzeRequest } from '@/lib/ai';
import { createTicket } from '@/lib/db';
import { auth } from '@/auth';

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, project } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a request with at least 10 characters.' },
        { status: 400 }
      );
    }

    const userId = (req.auth.user as any).id;
    const analysis = await analyzeRequest(text.trim());
    const ticket = await createTicket(Number(userId), project || 'General', text.trim(), analysis);

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze the request. Please try again.' },
      { status: 500 }
    );
  }
}) as any;
