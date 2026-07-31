import { NextResponse } from 'next/server';
import { getTicketById, getUserByUsername } from '@/lib/db';
import { buildDevelopmentPdf, FULL_PDF_SECTIONS, type PdfSections } from '@/lib/pdf';
import { canViewAllTickets } from '@/lib/permissions';
import { auth } from '@/auth';

const VALID_SECTION_KEYS = ['prd', 'trd', 'budget'] as const;

/**
 * `?sections=prd,trd,budget` (cualquier subconjunto, en cualquier orden).
 * Sin el parámetro, o con un valor que no aporte ninguna sección válida,
 * se genera el documento completo — mantiene compatibilidad con enlaces
 * antiguos que no llevaban query string.
 */
function parseSections(url: URL): PdfSections {
  const raw = url.searchParams.get('sections');
  if (!raw) return FULL_PDF_SECTIONS;

  const requested = new Set(raw.split(',').map(s => s.trim().toLowerCase()));
  const sections: PdfSections = {
    prd: requested.has('prd'),
    trd: requested.has('trd'),
    budget: requested.has('budget'),
  };

  const hasKnownKey = VALID_SECTION_KEYS.some(key => requested.has(key));
  return hasKnownKey ? sections : FULL_PDF_SECTIONS;
}

/** Descarga del PRD/TRD + presupuesto en PDF. Sólo tickets de desarrollo. */
export const GET = auth(async function GET(req, { params }) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = (await params) as { id: string };
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return NextResponse.json({ error: 'Ticket inválido' }, { status: 400 });
  }

  const user = req.auth.user as any;
  const dbUser = await getUserByUsername(user.name);
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
  }

  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // El PRD/TRD es documentación interna sin validar: sólo el personal
    // (técnicos y admins) puede descargarla, ni siquiera el autor del ticket.
    if (!canViewAllTickets(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (ticket.type !== 'desarrollo' || !ticket.spec) {
      return NextResponse.json(
        { error: 'Este ticket no es de desarrollo: no tiene PRD/TRD asociado.' },
        { status: 404 }
      );
    }

    const sections = parseSections(new URL(req.url));
    const pdfBytes = await buildDevelopmentPdf(ticket, ticket.spec, sections);

    const fileTag = [sections.prd && 'PRD', sections.trd && 'TRD', sections.budget && 'Estimacion']
      .filter(Boolean)
      .join('-');

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileTag}-ticket-${ticket.id}.pdf"`,
        'Content-Length': String(pdfBytes.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PRD PDF generation error:', error);
    return NextResponse.json({ error: 'No se pudo generar el PDF.' }, { status: 500 });
  }
}) as any;

export const dynamic = 'force-dynamic';
