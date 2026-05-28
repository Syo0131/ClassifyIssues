import { NextResponse } from 'next/server';
import { createComment, getCommentById, getCommentsForTicket } from '@/lib/db';
import { auth } from '@/auth';
import { requireTicketAccess } from '@/lib/auth-helpers';
import { CreateCommentSchema } from '@/lib/validation';

export const GET = auth(async function GET(req, { params }) {
  const { id } = await params as { id: string };
  const ticketId = Number(id);

  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { error } = await requireTicketAccess(req, ticketId);
  if (error) return error;

  try {
    const comments = await getCommentsForTicket(ticketId);
    return NextResponse.json(comments);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: "Ocurrió un error inesperado al cargar los comentarios." }, { status: 500 });
  }
}) as any;

export const POST = auth(async function POST(req, { params }) {
  const { id } = await params as { id: string };
  const ticketId = Number(id);

  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { dbUser, error } = await requireTicketAccess(req, ticketId);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = CreateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { text } = parsed.data;

    const commentId = await createComment(ticketId, dbUser.id, text.trim());
    const comment = await getCommentById(commentId);
    
    if (!comment) {
      return NextResponse.json({ error: 'No se pudo crear el comentario.' }, { status: 500 });
    }
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: "Ocurrió un error inesperado al publicar el comentario." }, { status: 500 });
  }
}) as any;
