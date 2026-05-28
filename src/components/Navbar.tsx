import { auth } from "@/auth";
import Link from "next/link";
import NavbarClient from "./NavbarClient";
import NavLinks from "./NavLinks";
import LanguageSwitcher from "./LanguageSwitcher";

export default async function Navbar() {
  const session = await auth();
  const role = session?.user?.role || null;

  return (
    <nav className="navbar" aria-label="Navegación principal">
      {/* BRAND */}
      <div>
        <Link href="/" className="navbar-brand">
          <div className="navbar-logo">S</div>
          Support Core
        </Link>
      </div>
      
      {/* CENTER LINKS */}
      <div className="navbar-nav">
        {session?.user ? (
          <NavLinks role={role} />
        ) : null}
      </div>

      {/* RIGHT ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        <LanguageSwitcher />
        {session?.user ? (
           <NavbarClient user={session.user} />
        ) : (
          <Link href="/login" className="nav-link" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
