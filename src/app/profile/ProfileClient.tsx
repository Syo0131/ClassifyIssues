'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from '@/lib/types';

export default function ProfileClient({ user }: { user: any }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetch('/api/profile/stats')
      .then(res => res.json())
      .then(data => {
        setStats({ 
          total: data.total, 
          projects: data.projects,
          byCategory: {}, // Default empty
          byPriority: {}, // Default empty
          byStatus: {},   // Default empty
          recentCount: 0  // Default to 0
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
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const projects = user.projects || [];

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.02em' }}>Perfil de Usuario</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* User Info Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
              {user.name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{user.name}</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                {user.role === 'technician' ? 'Técnico de Soporte' : 'Cliente'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Estadísticas</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {loadingStats ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : stats?.total || 0}
                <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Tickets creados</span>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Proyectos Asignados</h3>
              {projects.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {projects.map((p: string) => (
                    <span key={p} style={{ background: 'var(--bg-muted)', padding: '0.35rem 0.75rem', borderRadius: '100px', fontSize: '0.85rem', border: '1px solid var(--border-subtle)' }}>
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>General (Sin proyectos específicos)</p>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Cambiar Contraseña</h2>
          
          {message.text && (
            <div style={{ 
              marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
              borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Contraseña Actual</label>
              <input 
                type="password" 
                className="form-input" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Ingresa tu contraseña actual"
              />
            </div>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nueva Contraseña</label>
              <input 
                type="password" 
                className="form-input" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Confirmar Nueva Contraseña</label>
              <input 
                type="password" 
                className="form-input" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Vuelve a escribir la contraseña"
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={passwordLoading}>
                {passwordLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
