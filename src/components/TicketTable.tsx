'use client';

import { Ticket } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Inbox, LifeBuoy, Puzzle } from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
}

const PRIORITY_LABEL: Record<Ticket['priority'], string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const STATUS_LABEL: Record<Ticket['status'], string> = {
  open: 'Abierto',
  waiting_on_client: 'Esperando Cliente',
  closed: 'Finalizado',
};

function TypeBadge({ ticket }: { ticket: Ticket }) {
  const isDev = ticket.type === 'desarrollo';
  const Icon = isDev ? Puzzle : LifeBuoy;
  return (
    <span
      className="badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        whiteSpace: 'nowrap',
        background: 'transparent',
        border: `1px solid ${isDev ? 'var(--primary)' : 'var(--border-subtle)'}`,
        color: isDev ? 'var(--primary)' : 'var(--text-muted)',
      }}
    >
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      {isDev ? 'Desarrollo' : 'Incidencia'}
    </span>
  );
}

export default function TicketTable({ tickets }: TicketTableProps) {
  const router = useRouter();

  if (tickets.length === 0) {
    return (
      <div className="card" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Inbox size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} aria-hidden="true" />
        <p>No se encontraron tickets en esta sección.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* ── Tabla (escritorio) ── */}
      <div className="tickets-table-wrap">
        <table className="table tickets-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Solicitud</th>
              <th>Solicitante</th>
              <th>Proyecto</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => router.push(`/tickets/${ticket.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {/* Enlace real para accesibilidad y abrir en pestaña nueva */}
                  <Link href={`/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()}>
                    {ticket.id}
                  </Link>
                </td>
                <td><TypeBadge ticket={ticket} /></td>
                <td>
                  <div style={{ maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.raw_text}>
                    {ticket.raw_text}
                  </div>
                </td>
                <td>
                  <div
                    style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={ticket.username || `User #${ticket.user_id}`}
                  >
                    {ticket.username || `User #${ticket.user_id}`}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {ticket.project || 'General'}
                </td>
                <td>
                  <span className={`badge badge-priority ${ticket.priority}`}>{PRIORITY_LABEL[ticket.priority]}</span>
                </td>
                <td>
                  <span className={`badge status-${ticket.status}`}>{STATUS_LABEL[ticket.status]}</span>
                </td>
                <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Tarjetas (móvil / tablet) ── */}
      <div className="tickets-cards">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="ticket-card">
            <div className="ticket-card__top">
              <span className="ticket-card__id">#{ticket.id}</span>
              <TypeBadge ticket={ticket} />
            </div>
            <p className="ticket-card__text">{ticket.raw_text}</p>
            <div className="ticket-card__badges">
              <span className={`badge badge-priority ${ticket.priority}`}>{PRIORITY_LABEL[ticket.priority]}</span>
              <span className={`badge status-${ticket.status}`}>{STATUS_LABEL[ticket.status]}</span>
            </div>
            <div className="ticket-card__meta">
              <span>{ticket.username || `User #${ticket.user_id}`}</span>
              <span aria-hidden="true">·</span>
              <span>{ticket.project || 'General'}</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
