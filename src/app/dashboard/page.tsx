'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import TicketTable from '@/components/TicketTable';
import CustomSelect from '@/components/CustomSelect';
import { Ticket } from '@/lib/types';

const DEFAULT_TICKETS_POLL_MS = 30_000;
const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 350;

function getTicketsPollMs(): number {
  const raw = process.env.NEXT_PUBLIC_TICKETS_POLL_MS;
  if (raw == null || raw === '') return DEFAULT_TICKETS_POLL_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 5_000) return DEFAULT_TICKETS_POLL_MS;
  return n;
}

export default function DashboardPage() {
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterProject, setFilterProject] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchTickets = useCallback(
    async (signal?: AbortSignal) => {
      const isFirst = !initialLoadDone.current;
      if (isFirst) setLoading(true);
      else if (mountedRef.current) setRefreshing(true);

      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('sort', sortOrder);
      params.set('status', filterStatus);
      params.set('priority', filterPriority);
      params.set('project', filterProject);
      if (debouncedSearch) params.set('q', debouncedSearch);

      try {
        const res = await fetch(`/api/tickets?${params.toString()}`, { signal });
        const data = await res.json().catch(() => null);
        if (!mountedRef.current) return;

        if (!res.ok) {
          setFetchError(typeof data?.error === 'string' ? data.error : 'No se pudieron cargar los tickets.');
          setTickets([]);
          setTotal(0);
          setProjectOptions([]);
          return;
        }

        if (!data || !Array.isArray(data.tickets) || typeof data.total !== 'number') {
          setFetchError('Respuesta inválida del servidor.');
          setTickets([]);
          setTotal(0);
          setProjectOptions([]);
          return;
        }

        setFetchError(null);
        setTickets(data.tickets);
        setTotal(data.total);
        setProjectOptions(Array.isArray(data.projects) ? data.projects : []);
        initialLoadDone.current = true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to fetch tickets:', err);
        if (mountedRef.current) {
          setFetchError('Error de conexión al cargar los tickets.');
          setTickets([]);
          setTotal(0);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPage, debouncedSearch, filterPriority, filterStatus, filterProject, sortOrder]
  );

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    void fetchTickets(controller.signal);

    const pollMs = getTicketsPollMs();
    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void fetchTickets();
    }, pollMs);

    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchTickets();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchTickets]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const setStatusFilter = (v: string) => {
    setFilterStatus(v);
    setCurrentPage(1);
  };
  const setPriorityFilter = (v: string) => {
    setFilterPriority(v);
    setCurrentPage(1);
  };
  const setSortFilter = (v: string) => {
    setSortOrder(v);
    setCurrentPage(1);
  };
  const setProjectFilter = (v: string) => {
    setFilterProject(v);
    setCurrentPage(1);
  };

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

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <h1 className="page-title">Bandeja de Tickets</h1>
        <p className="page-subtitle">Gestiona y da seguimiento a todas las solicitudes activas.</p>
        {refreshing && (
          <span
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
            Actualizando…
          </span>
        )}
      </div>

      {fetchError && (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--danger)',
          }}
        >
          {fetchError}
        </div>
      )}

      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div className="dashboard-toolbar">
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
              🔍
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por número o palabra clave..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '100px', fontSize: '0.85rem' }}
            />
          </div>

          <div className="filter-bar dashboard-filters">
            <CustomSelect
              value={filterStatus}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'active', label: 'Solo Activos' },
                { value: 'open', label: 'Abierto' },
                { value: 'waiting_on_client', label: 'Esperando Cliente' },
                { value: 'closed', label: 'Finalizado' },
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect
              value={filterPriority}
              onChange={setPriorityFilter}
              options={[
                { value: 'all', label: 'Cualquier Prioridad' },
                { value: 'critical', label: 'Crítica' },
                { value: 'high', label: 'Alta' },
                { value: 'medium', label: 'Media' },
                { value: 'low', label: 'Baja' },
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect
              value={sortOrder}
              onChange={setSortFilter}
              options={[
                { value: 'newest', label: 'Más Recientes' },
                { value: 'oldest', label: 'Más Antiguos' },
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect
              value={filterProject}
              onChange={setProjectFilter}
              options={[
                { value: 'all', label: 'Todos los Proyectos' },
                ...projectOptions.map(project => ({ value: project, label: project })),
              ]}
              integratedMenu
              minimal
            />
          </div>
        </div>
      </div>

      <TicketTable tickets={tickets} />

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            type="button"
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
            type="button"
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
