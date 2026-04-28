'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <div className="navbar-logo">⚡</div>
        Insight Engine
      </Link>
      <div className="navbar-nav">
        <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
          Analyze
        </Link>
        <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
