'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)',
        padding: '0.4rem 0.8rem',
        borderRadius: '100px',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all var(--transition-base)',
      }}
      title="Cambiar Idioma / Change Language"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      {language.toUpperCase()}
    </button>
  );
}
