'use client';

import { useState } from 'react';
import { Ticket, Comment, TicketStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface TicketDetailClientProps {
  ticket: Ticket;
  initialComments: Comment[];
  currentUser: any;
}

export default function TicketDetailClient({ ticket, initialComments, currentUser }: TicketDetailClientProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [submitting, setSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const router = useRouter();

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setStatusError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(newStatus);
        router.refresh();
      } else {
        setStatusError(typeof data.error === 'string' ? data.error : 'No se pudo actualizar el estado.');
      }
    } catch (err) {
      console.error(err);
      setStatusError('Error de conexión al actualizar el estado.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && typeof data.id === 'number') {
        setNewComment('');
        setComments(prev => [...prev, data as Comment]);
      } else {
        setCommentError(
          data && typeof (data as { error?: string }).error === 'string'
            ? (data as { error: string }).error
            : 'No se pudo publicar el comentario.'
        );
      }
    } catch (err) {
      console.error(err);
      setCommentError('Error de conexión al publicar.');
    } finally {
      setSubmitting(false);
    }
  };

  const isTechnician = currentUser.role === 'technician';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* CABECERA MINIMALISTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TICKET {ticket.id}
            </span>
            <span className={`badge status-${status}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}>
              {status === 'open' ? 'Abierto' : status === 'waiting_on_client' ? 'Esperando Cliente' : 'Finalizado'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, maxWidth: '800px' }}>
            {isTechnician ? ticket.summary : 'Detalles de la Solicitud'}
          </h1>
        </div>
      </div>

      <div className="ticket-detail-layout">
        
        {/* COLUMNA PRINCIPAL - CONVERSACIÓN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Mensaje Original Estilizado */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                {ticket.username ? ticket.username.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.username} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Cliente)</span></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ticket.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-primary)', padding: '0 0 0 3.25rem' }}>
              {ticket.raw_text}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--border-subtle)', margin: '0' }} />

          {/* Comentarios / Actividad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {comments.map((comment) => {
              const isOwn = comment.user_id === Number(currentUser.id);
              const isTech = comment.role === 'technician';
              return (
                <div key={comment.id} style={{ display: 'flex', gap: '1rem', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: isTech ? 'var(--text-primary)' : 'var(--bg-muted)', 
                    color: isTech ? 'var(--bg-app)' : 'var(--text-primary)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {comment.username ? comment.username.substring(0, 2).toUpperCase() : '?'}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{comment.username}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ 
                      background: isOwn ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)', 
                      color: 'var(--text-primary)',
                      border: isOwn ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid var(--border-subtle)',
                      padding: '1rem 1.25rem', 
                      borderRadius: '12px', 
                      borderTopRightRadius: isOwn ? '4px' : '12px',
                      borderTopLeftRadius: !isOwn ? '4px' : '12px',
                      fontSize: '0.95rem', lineHeight: 1.5
                    }}>
                      {comment.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Editor de Respuesta */}
          <div style={{ marginTop: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            {commentError && (
              <div
                role="alert"
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--danger)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {commentError}
              </div>
            )}
            <form onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Añadir una respuesta..."
                required
                style={{ 
                  width: '100%', minHeight: '80px', background: 'transparent', border: 'none', 
                  outline: 'none', color: 'var(--text-primary)', fontSize: '0.95rem', resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                  {submitting ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Comentar'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* BARRA LATERAL */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Análisis de IA (Solo Técnicos) */}
          {isTechnician && (
            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Propiedades (IA)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Categoría</span>
                  <span className="badge badge-category" style={{ padding: '0.15rem 0.5rem' }}>{ticket.category}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Prioridad</span>
                  <span className={`badge badge-priority ${ticket.priority}`} style={{ padding: '0.15rem 0.5rem' }}>{ticket.priority}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Motor de IA</span>
                  <span className="badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontSize: '0.65rem' }}>
                    {ticket.source === 'gemini' ? '🧠 GEMINI' : ticket.source === 'mock' ? '⚙️ REGLAS' : '📋 SISTEMA'}
                  </span>
                </div>

              </div>

              {ticket.issues.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>Puntos Extraídos</h4>
                  <ul style={{ paddingLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                    {ticket.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Acciones (Solo Técnicos) */}
          {isTechnician && (
            <div>
               <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Acciones
              </h3>
              {statusError && (
                <div
                  role="alert"
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--danger)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {statusError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleStatusChange('open')}
                  style={{ 
                    textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: status === 'open' ? 'var(--primary)' : 'var(--bg-card)', 
                    color: status === 'open' ? 'white' : 'var(--text-primary)',
                    border: status === 'open' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)'
                  }}>
                  ⭕ Re-abrir Ticket
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('waiting_on_client')}
                  style={{ 
                    textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: status === 'waiting_on_client' ? 'var(--warning)' : 'var(--bg-card)', 
                    color: status === 'waiting_on_client' ? 'white' : 'var(--text-primary)',
                    border: status === 'waiting_on_client' ? '1px solid var(--warning)' : '1px solid var(--border-subtle)'
                  }}>
                  ⏳ Esperando al Cliente
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('closed')}
                  style={{ 
                    textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: status === 'closed' ? 'var(--success)' : 'var(--bg-card)', 
                    color: status === 'closed' ? 'white' : 'var(--text-primary)',
                    border: status === 'closed' ? '1px solid var(--success)' : '1px solid var(--border-subtle)'
                  }}>
                  ✅ Finalizar Ticket
                </button>
              </div>
            </div>
          )}
          
          {/* Detalles Generales */}
          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Detalles
            </h3>
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Solicitante</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{ticket.username || 'Desconocido'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Proyecto</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{ticket.project || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Fecha</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}