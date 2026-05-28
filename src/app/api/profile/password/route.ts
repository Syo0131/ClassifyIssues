import { NextResponse } from 'next/server';
import { updateUserPassword } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { getSessionDbUser } from '@/lib/auth-helpers';
import { PasswordChangeSchema } from '@/lib/validation';

export const POST = auth(async function POST(req) {
  const { dbUser, error } = await getSessionDbUser(req);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = PasswordChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    if (!dbUser.password_hash) {
      return NextResponse.json({ error: "Usuario sin contraseña configurada" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 403 });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const success = await updateUserPassword(dbUser.id, hash);

    if (!success) {
      return NextResponse.json({ error: "No se pudo actualizar la contraseña" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Password update error:', err);
    return NextResponse.json({ error: "Ocurrió un error inesperado" }, { status: 500 });
  }
}) as any;
