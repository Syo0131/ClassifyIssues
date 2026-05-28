'use client';

import SubmitForm from '@/components/SubmitForm';

interface HomeClientProps {
  userProjects: string[];
}

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function HomeClient({ userProjects }: HomeClientProps) {
  const { t } = useLanguage();
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 150px)' }}>
      <div className="home-hero" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('home.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('home.subtitle')}
        </p>
      </div>
      
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <SubmitForm userProjects={userProjects} />
      </div>
    </div>
  );
}
