'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import type { User } from 'next-auth';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function NavbarClient({ user }: { user: User }) {
  const { t } = useLanguage();
  const displayName = user?.name || 'Usuario';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
        <div className="avatar avatar-sm">
          {displayName.substring(0, 2).toUpperCase()}
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
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
          justifyContent: 'center',
          transition: 'color var(--transition-base)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        title={t('nav.logout')}
        aria-label={t('nav.logout')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>
  );
}
