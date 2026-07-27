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
    <nav className="app-navbar">
      <div>
        <Link href="/" className="app-navbar__brand">
          Support Core
        </Link>
      </div>

      <div className="app-navbar__links">
        {session?.user ? <NavLinks role={role} /> : null}
      </div>

      <div className="app-navbar__actions">
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
