'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/components/PasswordInput';
import AlertMessage from '@/components/AlertMessage';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Credenciales inválidas');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(t('form.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {t('nav.login')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('auth.login_description')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <AlertMessage type="error" message={error} />

          <div className="form-group">
            <label className="form-label" htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <PasswordInput
            id="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p>Solo usuarios registrados pueden acceder.</p>
        </div>
      </div>
    </div>
  );
}
