import { NextResponse } from 'next/server';
import { getAllTickets, getUserByUsername, getTicketsManagedByTechnician, getTicketsClosedByTechnician } from '@/lib/db';
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
    const userTickets = getAllTickets(user.id); // Tickets created by this specific user
    const totalCreated = userTickets.length;
    
    let totalClosedByMe = 0;

    // We only care about tickets closed by this specific user (technician or not)
    // The previous `closedCreated` was for tickets created by user AND closed, which is not what's asked.
    // So for technician, we count tickets where `closed_by_user_id` is the technician's ID
    if (sessionUser.role === 'technician') {
      const closedByMeTickets = getTicketsClosedByTechnician(user.id);
      totalClosedByMe = closedByMeTickets.length;
    } else {
      // For a regular user, 'tickets cerrados' means 'tickets created by me and closed'
      totalClosedByMe = userTickets.filter(ticket => ticket.status === 'closed').length;
    }
    
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