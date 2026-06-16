'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';
import CustomSelect from '@/components/CustomSelect';
import { ConfirmModal, AlertModal } from '@/components/Modal';

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
  const [role, setRole] = useState<'user' | 'technician' | 'admin'>(user?.role || 'user');
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
            onChange={(value) => setRole(value as 'user' | 'technician' | 'admin')}
            options={[
              { value: 'user', label: 'Usuario (Cliente)' },
              { value: 'technician', label: 'Técnico (Soporte)' },
              { value: 'admin', label: 'Administrador' },
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
  const [filterProject, setFilterProject] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Confirm modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reactivate modal state
  const [userToReactivate, setUserToReactivate] = useState<User | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  // Alert modal state
  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string; variant: 'info' | 'success' | 'error' }>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // Max users per page

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?includeInactive=true');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]); // Ensure users is always an array
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterProject]);

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

  const handleDeleteUser = async (userToDelete: User) => {
    setUserToDelete(userToDelete);
  };

  const handleReactivateUser = (user: User) => {
    setUserToReactivate(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToDelete.id }),
      });

      if (res.ok) {
        setAlertState({
          open: true,
          title: 'Usuario desactivado',
          message: `El usuario ${userToDelete.username} fue desactivado. Podrás reactivarlo cuando lo necesites.`,
          variant: 'success',
        });
        setUserToDelete(null);
        fetchUsers(); // Refresh the list
      } else {
        const errorData = await res.json();
        console.error('Deactivate user error:', errorData.error);
        setAlertState({
          open: true,
          title: 'Error al desactivar usuario',
          message: errorData.error || 'Ocurrió un error inesperado.',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      setAlertState({
        open: true,
        title: 'Error al desactivar usuario',
        message: 'No se pudo conectar con el servidor.',
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmReactivateUser = async () => {
    if (!userToReactivate) return;
    setIsReactivating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToReactivate.id, is_active: true }),
      });

      if (res.ok) {
        setAlertState({
          open: true,
          title: 'Usuario reactivado',
          message: `El usuario ${userToReactivate.username} fue reactivado correctamente.`,
          variant: 'success',
        });
        setUserToReactivate(null);
        fetchUsers();
      } else {
        const errorData = await res.json();
        console.error('Reactivate user error:', errorData.error);
        setAlertState({
          open: true,
          title: 'Error al reactivar usuario',
          message: errorData.error || 'Ocurrió un error inesperado.',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      setAlertState({
        open: true,
        title: 'Error al reactivar usuario',
        message: 'No se pudo conectar con el servidor.',
        variant: 'error',
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const availableProjects = Array.from(
    new Set(
      users.flatMap(user =>
        user.projects && user.projects.length > 0 ? user.projects : ['General']
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredUsers = users.filter(user => {
    if (filterProject === 'all') return true;
    const userProjects = user.projects && user.projects.length > 0 ? user.projects : ['General'];
    return userProjects.includes(filterProject);
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
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
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Usuarios del Sistema</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <CustomSelect
              value={filterProject}
              onChange={setFilterProject}
              options={[
                { value: 'all', label: 'Todos los Proyectos' },
                ...availableProjects.map(project => ({ value: project, label: project })),
              ]}
              integratedMenu
              minimal
            />
            <button onClick={handleCreateUser} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              + Nuevo Usuario
            </button>
          </div>
        </div>
        
        {loadingUsers ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ color: 'var(--primary)' }} />
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table users-table">
                <colgroup>
                  <col style={{ width: '230px' }} />
                  <col style={{ width: '150px' }} />
                  <col />
                  <col style={{ width: '210px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Proyectos</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const isInactive = u.is_active === false;
                    return (
                      <tr key={u.id} className={isInactive ? 'row-inactive' : undefined}>
                        <td className="cell-user">
                          <span className={`status-dot ${isInactive ? 'status-dot--inactive' : 'status-dot--active'}`} aria-hidden="true" />
                          <span className="username-text">{u.username}</span>
                          <span className={`badge badge-inactive ${isInactive ? '' : 'badge-inactive--hidden'}`}>Inactivo</span>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : u.role === 'technician' ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg-muted)',
                            color: u.role === 'admin' ? 'var(--danger)' : u.role === 'technician' ? '#7c3aed' : 'var(--text-secondary)'
                          }}>
                            {u.role === 'admin' ? 'Administrador' : u.role === 'technician' ? 'Técnico' : 'Cliente'}
                          </span>
                        </td>
                        <td
                          className="cell-projects"
                          title={u.projects && u.projects.length > 0 ? u.projects.join(', ') : 'General'}
                        >
                          {u.projects && u.projects.length > 0 ? u.projects.join(', ') : 'General'}
                        </td>
                        <td className="cell-actions">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="btn-secondary btn-sm"
                          >
                            Editar
                          </button>
                          {isInactive ? (
                            <button
                              onClick={() => handleReactivateUser(u)}
                              className="btn-reactivate btn-sm"
                            >
                              Reactivar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="btn-danger btn-sm"
                            >
                              Desactivar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No hay usuarios para el proyecto seleccionado.
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

      <ConfirmModal
        isOpen={userToDelete !== null}
        onClose={() => !isDeleting && setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title="Desactivar usuario"
        message={`¿Quieres desactivar al usuario ${userToDelete?.username}? No podrá iniciar sesión, pero sus datos y tickets se conservan. Podrás reactivarlo más tarde.`}
        confirmText="Desactivar"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />

      <ConfirmModal
        isOpen={userToReactivate !== null}
        onClose={() => !isReactivating && setUserToReactivate(null)}
        onConfirm={confirmReactivateUser}
        title="Reactivar usuario"
        message={`¿Quieres reactivar al usuario ${userToReactivate?.username}? Volverá a poder iniciar sesión con su rol y proyectos anteriores.`}
        confirmText="Reactivar"
        cancelText="Cancelar"
        variant="primary"
        loading={isReactivating}
      />

      <AlertModal
        isOpen={alertState.open}
        onClose={() => setAlertState(prev => ({ ...prev, open: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />

      <style jsx>{`
        .users-table {
          table-layout: fixed;
          width: 100%;
        }
        .users-table th {
          white-space: nowrap;
        }
        .users-table td {
          vertical-align: middle;
        }
        .users-table .cell-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
        }
        .users-table .username-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex-shrink: 1;
        }
        .users-table .cell-projects {
          font-size: 0.85rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .users-table .cell-actions {
          text-align: right;
          white-space: nowrap;
        }
        .users-table .cell-actions :global(.btn-sm) {
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          margin-left: 0.4rem;
        }
        .users-table .cell-actions :global(.btn-sm):first-child {
          margin-left: 0;
        }
        .users-table :global(.row-inactive) td {
          color: var(--text-muted);
        }
        .users-table :global(.row-inactive) .username-text {
          color: var(--text-secondary);
          text-decoration: line-through;
          text-decoration-color: rgba(148, 163, 184, 0.5);
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          display: inline-block;
        }
        .status-dot--active {
          background: var(--success);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
        .status-dot--inactive {
          background: var(--text-muted);
          box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
        }
        :global(.badge-inactive) {
          background: rgba(100, 116, 139, 0.15) !important;
          color: var(--text-secondary) !important;
          flex-shrink: 0;
        }
        :global(.badge-inactive--hidden) {
          visibility: hidden;
        }
        :global(.btn-reactivate) {
          background: var(--bg-card);
          color: var(--success);
          border: 1px solid var(--success);
          border-radius: var(--radius-md);
          font-weight: 600;
          transition: all var(--transition-base);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        :global(.btn-reactivate:hover) {
          background: var(--success);
          color: white;
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

