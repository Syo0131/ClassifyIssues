'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from '@/lib/types';

import AlertMessage from '@/components/AlertMessage';
import PasswordInput from '@/components/PasswordInput';

export default function ProfileClient({ user }: { user: any }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState({ type: '' as 'success'|'error'|'warning'|'', text: '' });

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

        <AlertMessage type={message.type} message={message.text} />

        <form onSubmit={handlePasswordChange} style={{ maxWidth: '500px', display: 'grid', gap: '1rem' }}>
          <PasswordInput
            id="currentPassword"
            label="Contraseña Actual"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            placeholder="Ingresa tu contraseña actual"
          />

          <PasswordInput
            id="newPassword"
            label="Nueva Contraseña"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirmar Nueva Contraseña"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Vuelve a escribir la contraseña"
          />

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
