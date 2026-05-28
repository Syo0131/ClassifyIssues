'use client';

import { Ticket } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface TicketTableProps {
  tickets: Ticket[];
}

export default function TicketTable({ tickets }: TicketTableProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  if (tickets.length === 0) {
    return (
      <div className="card empty-state">
        <div className="empty-state-icon" aria-hidden="true">📭</div>
        <p>{t('table.empty')}</p>
      </div>
    );
  }

  const handleRowKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/tickets/${id}`);
    }
  };

  return (
    <div className="card">
      <div className="table-wrapper">
        <table className="table" style={{ minWidth: '800px', width: '100%' }}>
          <caption>{t('table.title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('table.num')}</th>
              <th scope="col">{t('table.req')}</th>
              <th scope="col" style={{ minWidth: '150px' }}>{t('table.requester')}</th>
              <th scope="col">{t('table.project')}</th>
              <th scope="col">{t('table.priority')}</th>
              <th scope="col">{t('table.status')}</th>
              <th scope="col">{t('table.date')}</th>
              <th scope="col">{t('table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                onClick={() => router.push(`/tickets/${ticket.id}`)}
                onKeyDown={(e) => handleRowKeyDown(e, ticket.id)}
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                aria-label={`Ticket ${ticket.id}: ${ticket.summary || 'Sin resumen'}`}
              >
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{ticket.id}</td>
                <td>
                  <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.raw_text}>
                    {ticket.raw_text}
                  </div>
                </td>
                <td>
                  <div
                    style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={ticket.username || `User #${ticket.user_id}`}
                  >
                    {ticket.username || `User #${ticket.user_id}`}
                  </div>
                </td>
                
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {ticket.project || 'General'}
                </td>
                <td>
                  <span className={`badge badge-priority ${ticket.priority}`}>
                    {t(`filter.priority.${ticket.priority}` as any)}
                  </span>
                </td>
                <td>
                  <span className={`badge status-${ticket.status}`}>
                    {t(`filter.status.${ticket.status}` as any)}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem' }}>
                  {new Date(ticket.created_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                </td>
                <td>
                  <Link href={`/tickets/${ticket.id}`} style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.85rem' }} tabIndex={-1}>
                    {t('table.view')}
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
