import { NextResponse } from 'next/server';
import { getAllSubmissions } from '@/lib/db';

export async function GET() {
  try {
    const submissions = getAllSubmissions();
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Submissions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
