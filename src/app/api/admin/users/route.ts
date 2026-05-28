import { NextResponse } from 'next/server';
import { createUser, getUserByUsername, getAllUsers, updateUser, updateUserPassword } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { requireTechnician } from '@/lib/auth-helpers';
import { CreateUserSchema, UpdateUserSchema } from '@/lib/validation';

export const GET = auth(async function GET(req) {
  const { error } = requireTechnician(req);
  if (error) return error;

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}) as any;

export const POST = auth(async function POST(req) {
  const { error } = requireTechnician(req);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { username, password, role, projects } = parsed.data;

    if (await getUserByUsername(username)) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await createUser(username, hash, role, projects);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}) as any;

export const PATCH = auth(async function PATCH(req) {
  const { error } = requireTechnician(req);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, role, projects, password } = parsed.data;

    await updateUser(id, role, projects);

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await updateUserPassword(id, hash);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}) as any;
