'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ role }: { role: string | null }) {
  const pathname = usePathname();

  const getLinkStyle = (path: string) => {
    const isActive = pathname === path;
    return {
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      height: '100%',
      fontSize: '0.9rem',
      fontWeight: 500,
      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
      borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
      transition: 'color 0.2s',
      textDecoration: 'none'
    };
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
      <Link href="/" style={getLinkStyle('/')}>
        Nuevo Ticket
      </Link>
      <Link href="/dashboard" style={getLinkStyle('/dashboard')}>
        Tickets
      </Link>
      {role === 'technician' && (
        <Link href="/admin/users" style={getLinkStyle('/admin/users')}>
          Usuarios
        </Link>
      )}
    </div>
  );
}
