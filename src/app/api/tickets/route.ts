import { NextResponse } from 'next/server';
import { getTicketsPaged, getUserByUsername } from '@/lib/db';
import type { TicketListFilters } from '@/lib/types';
import { auth } from '@/auth';

const STATUS_OPTIONS = ['all', 'active', 'open', 'waiting_on_client', 'closed'] as const;
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'critical'] as const;
const SORT_OPTIONS = ['newest', 'oldest'] as const;

function parseEnumParam<T extends readonly string[]>(
  value: string | null,
  allowed: T,
  fallback: T[number]
): T[number] {
  if (value && (allowed as readonly string[]).includes(value)) return value as T[number];
  return fallback;
}

export const GET = auth(async function GET(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const user = req.auth.user as { name?: string; role?: string };
    const dbUser = await getUserByUsername(user.name ?? '');
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '10', 10) || 10);
    const sort = parseEnumParam(url.searchParams.get('sort'), SORT_OPTIONS, 'newest');
    const status = parseEnumParam(url.searchParams.get('status'), STATUS_OPTIONS, 'active');
    const priority = parseEnumParam(url.searchParams.get('priority'), PRIORITY_OPTIONS, 'all');
    const projectRaw = url.searchParams.get('project') ?? 'all';
    const project =
      projectRaw === 'all' ? 'all' : projectRaw.trim().slice(0, 200) || 'all';
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200);

    const filters: TicketListFilters = {
      userIdScope: user.role === 'technician' ? undefined : dbUser.id,
      status,
      priority,
      project,
      search: q,
    };

    const result = await getTicketsPaged(filters, sort, page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Tickets API error:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets.' }, { status: 500 });
  }
}) as any;

export const dynamic = 'force-dynamic';
