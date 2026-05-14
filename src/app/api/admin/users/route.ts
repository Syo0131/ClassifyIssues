import { NextResponse } from 'next/server';
import { createUser, getUserByUsername, getAllUsers, updateUser, updateUserPassword } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export const GET = auth(async function GET(req) {
  if (!req.auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const user = req.auth.user as any;
  if (user.role !== 'technician') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = req.auth.user as any;
  if (user.role !== 'technician') {
    return NextResponse.json({ error: "Only technicians can create users" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, password, role, projects } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (await getUserByUsername(username)) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await createUser(username, hash, role, projects || []);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;

export const PATCH = auth(async function PATCH(req) {
  if (!req.auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const user = req.auth.user as any;
  if (user.role !== 'technician') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const { id, role, projects, password } = body;

    if (!id || !role) {
      return NextResponse.json({ error: "ID and role are required" }, { status: 400 });
    }

    await updateUser(id, role, projects || []);

    if (password && password.trim().length >= 6) {
      const hash = await bcrypt.hash(password.trim(), 10);
      await updateUserPassword(id, hash);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}) as any;
