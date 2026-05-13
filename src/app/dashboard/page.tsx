'use client';

import { useState, useEffect, useCallback } from 'react';
import TicketTable from '@/components/TicketTable';
import CustomSelect from '@/components/CustomSelect';
import { Ticket } from '@/lib/types';

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active'); // active means != closed
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // Max users per page

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPriority, filterStatus, sortOrder]);

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '1200px' }}>
        <div className="page-header">
          <h1 className="page-title">Bandeja de Tickets</h1>
          <p className="page-subtitle">Cargando tu historial...</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', color: 'var(--primary)', borderWidth: '4px' }} />
        </div>
      </div>
    );
  }

  // Apply filters
  let filteredTickets = tickets.filter(t => {
    if (filterStatus === 'active' && t.status === 'closed') return false;
    if (filterStatus !== 'all' && filterStatus !== 'active' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const matchId = t.id.toString().includes(lowerSearch);
      const matchText = t.raw_text.toLowerCase().includes(lowerSearch);
      const matchSummary = t.summary?.toLowerCase().includes(lowerSearch) || false;
      if (!matchId && !matchText && !matchSummary) return false;
    }
    return true;
  });

  // Apply sorting
  filteredTickets.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Bandeja de Tickets</h1>
        <p className="page-subtitle">Gestiona y da seguimiento a todas las solicitudes activas.</p>
      </div>

      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          
          <div style={{ position: 'relative', flex: '1' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input 
              type="text" 
              className="form-input"
              placeholder="Buscar por número o palabra clave..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '100px', fontSize: '0.85rem' }}
            />
          </div>
          
          <div className="filter-bar" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem' }}>
            <CustomSelect 
              value={filterStatus} 
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'active', label: 'Solo Activos' },
                { value: 'open', label: 'Abierto' },
                { value: 'waiting_on_client', label: 'Esperando Cliente' },
                { value: 'closed', label: 'Finalizado' }
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect 
              value={filterPriority} 
              onChange={setFilterPriority}
              options={[
                { value: 'all', label: 'Cualquier Prioridad' },
                { value: 'critical', label: 'Crítica' },
                { value: 'high', label: 'Alta' },
                { value: 'medium', label: 'Media' },
                { value: 'low', label: 'Baja' }
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect 
              value={sortOrder} 
              onChange={setSortOrder}
              options={[
                { value: 'newest', label: 'Más Recientes' },
                { value: 'oldest', label: 'Más Antiguos' }
              ]}
              integratedMenu
              minimal
            />
          </div>
        </div>
      </div>

      <TicketTable tickets={paginatedTickets} />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
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
    </div>
  );
}
