import { NextResponse } from 'next/server';
import { getUserByUsername, updateUserPassword } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Ambas contraseñas son requeridas" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const sessionUser = req.auth.user as any;
    const user = await getUserByUsername(sessionUser.name);

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Check old password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 403 });
    }

    // Hash new password and update
    const hash = await bcrypt.hash(newPassword, 10);
    const success = await updateUserPassword(user.id, hash);

    if (!success) {
      return NextResponse.json({ error: "No se pudo actualizar la contraseña" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}) as any;
