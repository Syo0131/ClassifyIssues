'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from '@/lib/types';

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 5L21 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9.88 5.09C10.56 4.89 11.27 4.78 12 4.78C16.8 4.78 20.78 9.45 21.82 10.83C22.06 11.15 22.06 11.58 21.82 11.9C21.41 12.44 20.53 13.51 19.3 14.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.69 7.24C4.55 8.74 3.06 10.67 2.18 11.84C1.94 12.16 1.94 12.59 2.18 12.91C3.22 14.29 7.2 18.96 12 18.96C14.02 18.96 15.84 18.14 17.37 17.06" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.18 12.91C3.22 14.29 7.2 18.96 12 18.96C16.8 18.96 20.78 14.29 21.82 12.91C22.06 12.59 22.06 12.16 21.82 11.84C20.78 10.46 16.8 5.79 12 5.79C7.2 5.79 3.22 10.46 2.18 11.84C1.94 12.16 1.94 12.59 2.18 12.91Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function ProfileClient({ user }: { user: any }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetch('/api/profile/stats')
      .then(res => res.json())
      .then(data => {
        setStats({
          total: data.total,
          projects: data.projects,
          totalClosedByMe: data.totalClosedByMe,
          byCategory: {},
          byPriority: {},
          byStatus: {},
          recentCount: 0,
        });
        setLoadingStats(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingStats(false);
      });
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const projectsToDisplay = stats?.projects || [];
  const statValue = (value?: number) => (loadingStats ? <div className="spinner" style={{ width: '18px', height: '18px' }} /> : value || 0);

  return (
    <div className="page-container" style={{ maxWidth: '980px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Perfil de Usuario</h1>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {user.name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.65rem', marginBottom: '0.15rem' }}>{user.name}</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
              {user.role === 'technician' ? 'Técnico de Soporte' : 'Cliente'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem', marginBottom: '1.25rem' }}>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem', background: 'var(--bg-muted)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{statValue(stats?.total)}</div>
            <div style={{ marginTop: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Tickets creados por mí</div>
          </div>

          {user.role === 'technician' && (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem', background: 'rgba(37, 99, 235, 0.08)' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{statValue(stats?.totalClosedByMe)}</div>
              <div style={{ marginTop: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Tickets cerrados por mí</div>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Proyectos asignados
          </h3>

          {loadingStats ? (
            <div className="spinner" style={{ width: '20px', height: '20px' }} />
          ) : projectsToDisplay.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {projectsToDisplay.map((project: string) => (
                <span
                  key={project}
                  style={{
                    background: 'var(--bg-muted)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                  }}
                >
                  {project}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>General (Sin proyectos asignados)</p>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 700 }}>Cambiar Contraseña</h2>

        {message.text && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              border: '1px solid',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
              borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={{ maxWidth: '500px', display: 'grid', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Contraseña Actual</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                className="form-input"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="Ingresa tu contraseña actual"
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(prev => !prev)}
                aria-label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                title={showCurrentPassword ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PasswordVisibilityIcon visible={showCurrentPassword} />
              </button>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="form-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(prev => !prev)}
                aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                title={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PasswordVisibilityIcon visible={showNewPassword} />
              </button>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Confirmar Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Vuelve a escribir la contraseña"
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                title={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PasswordVisibilityIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" disabled={passwordLoading}>
              {passwordLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
