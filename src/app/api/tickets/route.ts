import { NextResponse } from 'next/server';
import { getAllTickets, getUserByUsername } from '@/lib/db';
import { auth } from '@/auth';

export const GET = auth(async function GET(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = req.auth.user as any;
    const dbUser = await getUserByUsername(user.name);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }
    // If technician, get all. If user, get only their own.
    const userId = user.role === 'technician' ? undefined : dbUser.id;
    const tickets = await getAllTickets(userId);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Tickets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets.' },
      { status: 500 }
    );
  }
}) as any;

export const dynamic = 'force-dynamic';
