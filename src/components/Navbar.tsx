import { auth } from "@/auth";
import Link from "next/link";
import NavbarClient from "./NavbarClient";
import NavLinks from "./NavLinks"; // We will create this for active state tracking

export default async function Navbar() {
  const session = await auth();
  const role = session ? (session.user as any).role : null;

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
      {/* BRAND */}
      <div>
        <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Support Core
        </Link>
      </div>
      
      {/* CENTER LINKS */}
      <div style={{ display: 'flex', height: '100%' }}>
        {session ? (
          <NavLinks role={role} />
        ) : null}
      </div>

      {/* RIGHT ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {session ? (
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
