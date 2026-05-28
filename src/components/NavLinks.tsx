'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function NavLinks({ role }: { role: string | null }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const getClassName = (path: string) => {
    return `nav-link ${pathname === path ? 'active' : ''}`;
  };

  return (
    <>
      <Link 
        href="/" 
        className={getClassName('/')}
        aria-current={pathname === '/' ? 'page' : undefined}
      >
        {t('nav.new_ticket')}
      </Link>
      <Link 
        href="/dashboard" 
        className={getClassName('/dashboard')}
        aria-current={pathname === '/dashboard' ? 'page' : undefined}
      >
        {t('nav.tickets')}
      </Link>
      {role === 'technician' && (
        <Link 
          href="/admin/users" 
          className={getClassName('/admin/users')}
          aria-current={pathname === '/admin/users' ? 'page' : undefined}
        >
          {t('nav.users')}
        </Link>
      )}
    </>
  );
}
