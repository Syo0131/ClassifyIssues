'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'technician'>('user');
  const [projectsInput, setProjectsInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setUsername('');
    setPassword('');
    setRole('user');
    setProjectsInput('');
    setMessage({ type: '', text: '' });
  };

  const handleEditClick = (user: User) => {
    setIsEditing(true);
    setEditingId(user.id);
    setUsername(user.username);
    setPassword(''); // Don't fetch password, leave blank unless changing
    setRole(user.role);
    setProjectsInput(user.projects?.join(', ') || '');
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const projects = projectsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    try {
      const url = '/api/admin/users';
      const method = isEditing ? 'PATCH' : 'POST';
      const bodyPayload = isEditing 
        ? { id: editingId, role, projects, password } 
        : { username, password, role, projects };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Usuario ${isEditing ? 'actualizado' : 'creado'} correctamente.` });
        resetForm();
        fetchUsers(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || `Error al ${isEditing ? 'actualizar' : 'crear'} usuario.` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div className="page-header">
        <h1 className="page-title">Gestión de Usuarios</h1>
        <p className="page-subtitle">Administra los accesos, roles y proyectos de los clientes y técnicos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        
        {/* LISTA DE USUARIOS */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-muted)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Usuarios Activos</h2>
          </div>
          
          {loadingUsers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner" style={{ color: 'var(--primary)' }} />
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Proyectos</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</td>
                      <td>
                        <span className="badge" style={{ 
                          background: u.role === 'technician' ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg-muted)', 
                          color: u.role === 'technician' ? '#7c3aed' : 'var(--text-secondary)' 
                        }}>
                          {u.role === 'technician' ? 'Técnico' : 'Cliente'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {u.projects && u.projects.length > 0 ? u.projects.join(', ') : 'General'}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleEditClick(u)}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FORMULARIO */}
        <div className="card" style={{ position: 'sticky', top: '100px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {isEditing ? 'Editar Usuario' : 'Crear Usuario'}
            </h2>
            {isEditing && (
              <button onClick={resetForm} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', background: 'transparent', border: 'none', fontWeight: 600 }}>
                Cancelar Edición
              </button>
            )}
          </div>
          
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nombre de Usuario</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isEditing} // Cannot change username easily in this prototype
                placeholder="Ej: nombre_cliente"
                style={{ opacity: isEditing ? 0.6 : 1 }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Temporal'}</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEditing}
                placeholder={isEditing ? "Dejar en blanco para mantener actual" : "********"}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Rol del Usuario</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as 'user' | 'technician')}
              >
                <option value="user">Usuario (Cliente)</option>
                <option value="technician">Técnico (Soporte)</option>
              </select>
            </div>

            {role === 'user' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Proyectos (Separados por coma)</label>
                <input
                  type="text"
                  className="form-input"
                  value={projectsInput}
                  onChange={(e) => setProjectsInput(e.target.value)}
                  placeholder="Ej: Alpha, CRM"
                />
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : (isEditing ? 'Guardar Cambios' : 'Registrar Usuario')}
            </button>
          </form>
        </div>

      </div>
      
      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
