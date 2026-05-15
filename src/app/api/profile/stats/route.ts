import { NextResponse } from 'next/server';
import { getProfileTicketCounters, getUserByUsername } from '@/lib/db';
import { auth } from '@/auth';

export const GET = auth(async function GET(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessionUser = req.auth.user as any;
  const user = await getUserByUsername(sessionUser.name); // Fetch full user details to get projects
  
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { totalCreated, totalClosedByMe } = await getProfileTicketCounters(user.id, sessionUser.role);

    return NextResponse.json({
      total: totalCreated,
      projects: user.projects,
      totalClosedByMe,
    });
  } catch (error) {
    console.error('Profile Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile stats.' },
      { status: 500 }
    );
  }
}) as any;

export const dynamic = 'force-dynamic';