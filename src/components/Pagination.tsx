interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem 1.5rem' }}>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        Anterior
      </button>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        Página {currentPage} de {totalPages}
      </span>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        aria-label="Página siguiente"
      >
        Siguiente
      </button>
    </div>
  );
}
