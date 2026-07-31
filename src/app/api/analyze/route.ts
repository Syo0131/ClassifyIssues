import { NextResponse } from 'next/server';
import { analyzeRequest } from '@/lib/ai';
import { collapseBlankLines, parseConversation } from '@/lib/chat';
import { createTicket, getUserByUsername } from '@/lib/db';
import { pendingDevAnalysis, runDevAnalysisInBackground } from '@/lib/dev-analysis';
import { getProjectStack } from '@/lib/project-context';
import type { ChatMessage, DevelopmentBrief, TicketType } from '@/lib/types';
import { auth } from '@/auth';

const MAX_TICKET_TEXT = 20_000;

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

    // La validación de longitud usa el texto tal cual lo mandó el cliente; lo
    // que se guarda y se muestra es la versión saneada (sin líneas en blanco
    // en cascada de un pegado descuidado).
    const cleanText = collapseBlankLines(text.trim());

    // Dos vías de análisis distintas según lo que eligió el usuario tras el login.
    if (type === 'desarrollo') {
      const projectName = project || 'General';
      // `cleanText` es la petición inicial (queda como raw_text del ticket).
      // La conversación de refinamiento, si la hubo, enriquece el análisis.
      const conversation = parseConversation(body.conversation);

      // El PRD/TRD tarda; no bloqueamos al cliente. Creamos el ticket ya, con
      // análisis provisional, y lo completamos en segundo plano. El cliente es
      // redirigido a su lista de tickets de inmediato.
      const ticket = await createTicket(
        dbUser.id,
        projectName,
        cleanText,
        pendingDevAnalysis(),
        { type: 'desarrollo', spec: null }
      );

      void runDevAnalysisInBackground(ticket.id, cleanText, buildBrief(conversation, projectName));

      return NextResponse.json(ticket, { status: 202 });
    }

    const analysis = await analyzeRequest(cleanText);
    const ticket = await createTicket(dbUser.id, project || 'General', cleanText, analysis, {
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
