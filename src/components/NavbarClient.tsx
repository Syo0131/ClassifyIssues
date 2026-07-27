'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { Session } from 'next-auth'; // Importar Session de next-auth

export default function NavbarClient({ user }: { user?: Session['user'] | null }) {
  const displayName = user?.name || 'Usuario'; // Usar user?.name en lugar de user?.username

  return (
    <div className="app-navbar__user">
      <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
        <User size={20} strokeWidth={2} aria-hidden="true" />
        <span className="app-navbar__username" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
          {displayName}
        </span>
      </Link>
      <button 
        onClick={() => signOut({ callbackUrl: '/login' })}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--text-muted)', 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Salir"
        aria-label="Salir"
      >
        <LogOut size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
