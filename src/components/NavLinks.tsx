'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ role }: { role: 'user' | 'technician' | 'admin' | null }) {
  const pathname = usePathname();

  // El estilo (color, subrayado activo, tamaños móviles) vive en globals.css
  // bajo `.app-nav-links`; aquí sólo marcamos el enlace activo.
  const current = (path: string) => (pathname === path ? 'page' : undefined);

  return (
    <div className="app-nav-links">
      <Link href="/" aria-current={current('/')}>
        Nuevo Ticket
      </Link>
      <Link href="/dashboard" aria-current={current('/dashboard')}>
        Tickets
      </Link>
      {role === 'admin' && (
        <Link href="/admin/users" aria-current={current('/admin/users')}>
          Usuarios
        </Link>
      )}
    </div>
  );
}
