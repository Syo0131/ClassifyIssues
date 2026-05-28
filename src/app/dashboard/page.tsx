'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import TicketTable from '@/components/TicketTable';
import CustomSelect from '@/components/CustomSelect';
import Pagination from '@/components/Pagination';
import AlertMessage from '@/components/AlertMessage';
import SkeletonLoader from '@/components/SkeletonLoader';
import { Ticket } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

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

  const { t } = useLanguage();

  useEffect(() => {
    const tTimer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(tTimer);
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
          setFetchError(typeof data?.error === 'string' ? data.error : t('form.error_generic'));
          setTickets([]);
          setTotal(0);
          setProjectOptions([]);
          return;
        }

        if (!data || !Array.isArray(data.tickets) || typeof data.total !== 'number') {
          setFetchError(t('form.error_generic'));
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
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err === 'Component unmounted') return;
        console.error('Failed to fetch tickets:', err);
        if (mountedRef.current) {
          setFetchError(t('form.error_generic'));
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
    [currentPage, debouncedSearch, filterPriority, filterStatus, filterProject, sortOrder, t]
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
      controller.abort('Component unmounted');
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
  const setProjectFilter = (v: string) => {
    setFilterProject(v);
    setCurrentPage(1);
  };
  const setSortFilter = (v: string) => {
    setSortOrder(v);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '1200px' }}>
        <div className="page-header">
          <h1 className="page-title">{t('dash.title')}</h1>
          <p className="page-subtitle">{t('dash.subtitle_loading')}</p>
        </div>
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            {t('dash.title')}
            {refreshing && <span className="spinner" style={{ marginLeft: '1rem', width: '20px', height: '20px' }} />}
          </h1>
          <p className="page-subtitle">{t('dash.subtitle')}</p>
        </div>
      </div>

      {fetchError && (
        <div style={{ marginBottom: '1.5rem' }}>
          <AlertMessage type="error" message={fetchError} />
        </div>
      )}

      <div className="dashboard-controls">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              className="form-input"
              placeholder={t('dash.search_placeholder')}
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
                { value: 'all', label: t('filter.status.all') },
                { value: 'active', label: t('filter.status.active') },
                { value: 'open', label: t('filter.status.open') },
                { value: 'waiting_on_client', label: t('filter.status.waiting') },
                { value: 'closed', label: t('filter.status.closed') },
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect
              value={filterPriority}
              onChange={setPriorityFilter}
              options={[
                { value: 'all', label: t('filter.priority.all') },
                { value: 'critical', label: t('filter.priority.critical') },
                { value: 'high', label: t('filter.priority.high') },
                { value: 'medium', label: t('filter.priority.medium') },
                { value: 'low', label: t('filter.priority.low') },
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect
              value={sortOrder}
              onChange={setSortFilter}
              options={[
                { value: 'newest', label: t('filter.sort.newest') },
                { value: 'oldest', label: t('filter.sort.oldest') },
              ]}
              integratedMenu
              minimal
            />

            <CustomSelect
              value={filterProject}
              onChange={setProjectFilter}
              options={[
                { value: 'all', label: t('filter.project.all') },
                ...projectOptions.map(project => ({ value: project, label: project })),
              ]}
              integratedMenu
              minimal
            />
          </div>
        </div>
      </div>

      <TicketTable tickets={tickets} />

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
