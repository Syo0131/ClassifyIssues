'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AlertMessage from './AlertMessage';
import CustomSelect from './CustomSelect';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SubmitFormProps {
  userProjects: string[];
}

export default function SubmitForm({ userProjects }: SubmitFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [project, setProject] = useState(userProjects[0] || 'General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length < 10) {
      setError(t('form.error_min_length'));
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, project }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('form.error_generic'));
      }

      setText('');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', background: 'transparent' }}>
      <form onSubmit={handleSubmit}>
        {error && <AlertMessage type="error" message={error} />}

        {userProjects.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary)',
                  padding: '0.3rem 2rem 0.3rem 0.8rem',
                  borderRadius: '100px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.6rem center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {userProjects.map((proj) => (
                  <option key={proj} value={proj} style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                    {t('form.project_prefix')} {proj}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <textarea
            id="text"
            className="form-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('form.placeholder')}
            required
            aria-invalid={!!error}
            style={{ fontSize: '1.25rem', paddingBottom: '1rem' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="chips-container" style={{ margin: 0, gap: '0.5rem' }}>
            {['Error Técnico', 'Facturación', 'Sugerencia'].map((cat) => (
              <button
                key={cat}
                type="button"
                className="chip"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                onClick={() => setText(text ? `${text} [${cat}]` : `[${cat}] `)}
              >
                {cat}
              </button>
            ))}
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ 
              borderRadius: '8px', 
              background: 'var(--primary-soft)', 
              color: 'var(--primary-text)',
              marginLeft: 'auto',
              border: 'none',
              padding: '0.6rem 1.25rem'
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                {t('form.submit_loading')}
              </>
            ) : (
               t('form.submit')
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
