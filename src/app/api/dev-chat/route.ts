import { NextResponse } from 'next/server';
import { nextDevChatQuestion } from '@/lib/ai';
import { parseConversation } from '@/lib/chat';
import { auth } from '@/auth';

/**
 * Turno del chat de refinamiento previo a generar el PRD/TRD. Recibe la
 * conversación hasta ahora y devuelve la siguiente pregunta de la IA, o `done`
 * cuando ya tiene suficiente. Nunca bloquea el flujo: ante cualquier problema
 * (o sin Gemini configurado) `nextDevChatQuestion` devuelve `done: true`.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const conversation = parseConversation(body.conversation);

    // Necesitamos al menos la petición inicial del cliente para preguntar.
    if (conversation.length === 0 || conversation[0].role !== 'user') {
      return NextResponse.json({ done: true, question: null });
    }

    const result = await nextDevChatQuestion(conversation);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Dev chat API error:', error);
    // No bloqueamos al cliente: que el flujo siga a la generación.
    return NextResponse.json({ done: true, question: null });
  }
}) as any;

export const dynamic = 'force-dynamic';
