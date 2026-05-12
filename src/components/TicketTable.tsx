'use client';

import { Ticket } from '@/lib/types';
import Link from 'next/link';

interface TicketTableProps {
  tickets: Ticket[];
}

export default function TicketTable({ tickets }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
        <p>No se encontraron tickets en esta sección.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Solicitud</th>
              <th>Proyecto</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{ticket.id}</td>
                <td>
                  <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.raw_text}>
                    {ticket.raw_text}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {ticket.project || 'General'}
                </td>
                <td>
                  <span className={`badge badge-priority ${ticket.priority}`}>
                    {ticket.priority === 'critical' ? 'Crítica' : ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </td>
                <td>
                  <span className={`badge status-${ticket.status}`}>
                    {ticket.status === 'open' ? 'Abierto' : ticket.status === 'waiting_on_client' ? 'Esperando Cliente' : 'Finalizado'}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem' }}>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td>
                  <Link href={`/tickets/${ticket.id}`} style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.85rem' }}>
                    Ver Detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
