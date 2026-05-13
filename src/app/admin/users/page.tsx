'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';
import CustomSelect from '@/components/CustomSelect';

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

// Modal component
function UserFormModal({ isOpen, onClose, user, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (payload: any) => Promise<boolean>;
}) {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'technician'>(user?.role || 'user');
  const [projectsInput, setProjectsInput] = useState(user?.projects?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setRole(user.role);
      setProjectsInput(user.projects?.join(', ') || '');
      setPassword('');
    } else {
      setUsername('');
      setPassword('');
      setRole('user');
      setProjectsInput('');
    }
    setShowPassword(false);
    setMessage({ type: '', text: '' });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const projects = projectsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const payload = user 
      ? { id: user.id, role, projects, password: password || undefined }
      : { username, password, role, projects };

    const success = await onSave(payload);

    if (success) {
      setMessage({ type: 'success', text: `Usuario ${user ? 'actualizado' : 'creado'} correctamente.` });
      // Clear form only if creating a new user
      if (!user) {
        setUsername('');
        setPassword('');
        setRole('user');
        setProjectsInput('');
      }
      onClose(); // Close modal on success
    } else {
      setMessage({ type: 'error', text: `Error al ${user ? 'actualizar' : 'crear'} usuario.` });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>&times;</button>
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
              disabled={!!user} // Disable if editing
              placeholder="Ej: nombre_cliente"
              style={{ opacity: user ? 0.6 : 1 }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{user ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!user}
                placeholder={user ? "Dejar en blanco para no cambiar" : "********"}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                <PasswordVisibilityIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Rol del Usuario</label>
            <CustomSelect
              value={role}
              onChange={(value) => setRole(value as 'user' | 'technician')}
              options={[
                { value: 'user', label: 'Usuario (Cliente)' },
                { value: 'technician', label: 'Técnico (Soporte)' },
              ]}
              integratedMenu
              minimal
            />
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
            {loading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : (user ? 'Guardar Cambios' : 'Registrar Usuario')}
          </button>
        </form>
      </div>
    </div>
  );
}

// AdminUsersPage Component
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // Max users per page

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

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (payload: any) => {
    const method = payload.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/admin/users', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      fetchUsers(); // Refresh the list
      return true;
    }
    const errorData = await res.json();
    console.error('Save user error:', errorData.error);
    return false;
  };

  // Pagination Logic
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div className="page-header">
        <h1 className="page-title">Gestión de Usuarios</h1>
        <p className="page-subtitle">Administra los accesos, roles y proyectos de los clientes y técnicos.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Usuarios del Sistema</h2>
          <button onClick={handleCreateUser} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            + Nuevo Usuario
          </button>
        </div>
        
        {loadingUsers ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ color: 'var(--primary)' }} />
          </div>
        ) : (
          <>
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
                  {paginatedUsers.map((u) => (
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
                          onClick={() => handleEditUser(u)}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
      />
      
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
