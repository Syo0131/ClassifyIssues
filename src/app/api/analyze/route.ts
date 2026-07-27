import { NextResponse } from 'next/server';
import { analyzeRequest } from '@/lib/ai';
import { createTicket, getUserByUsername } from '@/lib/db';
import { pendingDevAnalysis, runDevAnalysisInBackground } from '@/lib/dev-analysis';
import { getProjectStack } from '@/lib/project-context';
import type { ChatMessage, DevelopmentBrief, TicketType } from '@/lib/types';
import { auth } from '@/auth';

const MAX_TICKET_TEXT = 20_000;
const MAX_MSG_LEN = 4_000;
const MAX_CONVERSATION_MSGS = 30;

/** Sanea la conversación de refinamiento que llega del cliente. */
function parseConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m): m is { role: unknown; content: unknown } => !!m && typeof m === 'object')
    .slice(0, MAX_CONVERSATION_MSGS)
    .map(m => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: typeof m.content === 'string' ? m.content.trim().slice(0, MAX_MSG_LEN) : '',
    }))
    .filter(m => m.content.length > 0);
}

/** Brief server-side: el stack (que ya conocemos) + la conversación saneada. */
function buildBrief(conversation: ChatMessage[], project: string): DevelopmentBrief {
  return {
    stack: getProjectStack(project),
    conversation: conversation.length > 0 ? conversation : undefined,
  };
}

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, project } = body;
    const type: TicketType = body.type === 'desarrollo' ? 'desarrollo' : 'incidencia';

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Describe la solicitud con al menos 10 caracteres.' },
        { status: 400 }
      );
    }

    if (text.trim().length > MAX_TICKET_TEXT) {
      return NextResponse.json(
        { error: `El texto no puede superar ${MAX_TICKET_TEXT} caracteres.` },
        { status: 400 }
      );
    }

    const sessionUser = req.auth.user as any;
    const dbUser = await getUserByUsername(sessionUser.name);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    // Dos vías de análisis distintas según lo que eligió el usuario tras el login.
    if (type === 'desarrollo') {
      const projectName = project || 'General';
      // `text` es la petición inicial (queda como raw_text del ticket). La
      // conversación de refinamiento, si la hubo, enriquece el análisis.
      const conversation = parseConversation(body.conversation);

      // El PRD/TRD tarda; no bloqueamos al cliente. Creamos el ticket ya, con
      // análisis provisional, y lo completamos en segundo plano. El cliente es
      // redirigido a su lista de tickets de inmediato.
      const ticket = await createTicket(
        dbUser.id,
        projectName,
        text.trim(),
        pendingDevAnalysis(),
        { type: 'desarrollo', spec: null }
      );

      void runDevAnalysisInBackground(ticket.id, text.trim(), buildBrief(conversation, projectName));

      return NextResponse.json(ticket, { status: 202 });
    }

    const analysis = await analyzeRequest(text.trim());
    const ticket = await createTicket(dbUser.id, project || 'General', text.trim(), analysis, {
      type: 'incidencia',
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze the request. Please try again.' },
      { status: 500 }
    );
  }
}) as any;
