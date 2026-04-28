import { NextRequest, NextResponse } from 'next/server';
import { analyzeRequest } from '@/lib/ai';
import { createSubmission } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a request with at least 10 characters.' },
        { status: 400 }
      );
    }

    const analysis = await analyzeRequest(text.trim());
    const submission = createSubmission(text.trim(), analysis);

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze the request. Please try again.' },
      { status: 500 }
    );
  }
}
