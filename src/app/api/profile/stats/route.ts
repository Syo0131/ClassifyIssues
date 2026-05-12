import { NextResponse } from 'next/server';
import { getAllTickets, getUserByUsername } from '@/lib/db';
import { auth } from '@/auth';

export const GET = auth(async function GET(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessionUser = req.auth.user as any;
  const user = getUserByUsername(sessionUser.name); // Fetch full user details to get projects
  
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const userTickets = getAllTickets(user.id);
    const total = userTickets.length;
    
    return NextResponse.json({ total, projects: user.projects });
  } catch (error) {
    console.error('Profile Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile stats.' },
      { status: 500 }
    );
  }
}) as any;

export const dynamic = 'force-dynamic';