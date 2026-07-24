import { NextResponse } from 'next/server';
import { analyzeRequest, analyzeDevelopmentRequest, analysisFromDevelopmentSpec } from '@/lib/ai';
import { createTicket, getUserByUsername } from '@/lib/db';
import { getProjectStack } from '@/lib/project-context';
import type { DevelopmentBrief, TicketType } from '@/lib/types';
import { auth } from '@/auth';

const MAX_TICKET_TEXT = 20_000;
const MAX_BRIEF_FIELD = 2_000;

/**
 * Recorta y normaliza los campos del formulario de desarrollo.
 * Sólo se aceptan los tres que aporta el cliente: el stack lo pone el servidor
 * en `buildBrief`, de modo que nada de lo que llegue en el body pueda
 * suplantarlo.
 */
function parseClientBrief(value: unknown): DevelopmentBrief {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const field = (key: string) =>
    typeof raw[key] === 'string' ? (raw[key] as string).trim().slice(0, MAX_BRIEF_FIELD) : undefined;

  return {
    objective: field('objective'),
    users: field('users'),
    deadline: field('deadline'),
  };
}

/** Añade al brief del cliente el stack que ya conocemos de su proyecto. */
function buildBrief(value: unknown, project: string): DevelopmentBrief | undefined {
  const brief: DevelopmentBrief = {
    ...parseClientBrief(value),
    stack: getProjectStack(project),
  };

  return Object.values(brief).some(Boolean) ? brief : undefined;
}

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, project, brief } = body;
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
      const spec = await analyzeDevelopmentRequest(text.trim(), buildBrief(brief, projectName));
      const ticket = await createTicket(
        dbUser.id,
        projectName,
        text.trim(),
        analysisFromDevelopmentSpec(spec),
        { type: 'desarrollo', spec }
      );
      return NextResponse.json(ticket, { status: 201 });
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
