import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavbarClient from "./NavbarClient";
import NavLinks from "./NavLinks";
import { User } from "@/lib/types";

export default async function Navbar() {
  const session = await auth();

  // If the session is null but the user is on a protected page, it means the
  // account was deactivated mid-session (the session callback in auth.ts ran
  // the active-status check and returned an empty session). Force re-login.
  if (!session?.user) {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") || "";
    if (pathname !== "/login") {
      redirect("/login?reason=inactive");
    }
  }

  const role = session?.user ? (session.user as User).role : null;

  return (
    <nav style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 2.5rem',
      height: '80px',
      background: 'transparent',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'var(--bg-app)'
    }}>
      <div>
        <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Support Core
        </Link>
      </div>

      <div style={{ display: 'flex', height: '100%' }}>
        {session?.user ? (
          <NavLinks role={role} />
        ) : null}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {session?.user ? (
          <NavbarClient user={session.user} />
        ) : (
          <Link href="/login" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
