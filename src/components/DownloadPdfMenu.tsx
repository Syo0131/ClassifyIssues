'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';

interface DownloadOption {
  label: string;
  sections: string;
}

const OPTIONS: DownloadOption[] = [
  { label: 'Documento completo', sections: 'prd,trd,budget' },
  { label: 'Solo PRD', sections: 'prd' },
  { label: 'Solo TRD', sections: 'trd' },
  { label: 'Solo Estimación', sections: 'budget' },
];

/**
 * Botón "Descargar PDF" con un menú de qué incluir: el documento completo o
 * PRD/TRD/Estimación por separado. Cada opción es un enlace directo a
 * `GET /api/tickets/[id]/prd?sections=...`; el PDF se genera y renumera según
 * lo pedido en `lib/pdf.ts`.
 */
export default function DownloadPdfMenu({ ticketId }: { ticketId: number }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn-primary"
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.55rem 1.1rem',
          fontSize: '0.85rem',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
        }}
      >
        <Download size={15} strokeWidth={2} aria-hidden="true" />
        Descargar PDF
        <ChevronDown
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms ease' }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '210px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            zIndex: 50,
            animation: 'select-fade 120ms ease-out both',
          }}
        >
          {OPTIONS.map((option, index) => (
            <a
              key={option.sections}
              href={`/api/tickets/${ticketId}/prd?sections=${option.sections}`}
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '0.65rem 1rem',
                fontSize: '0.85rem',
                fontWeight: index === 0 ? 600 : 500,
                color: 'var(--text-primary)',
                borderTop: index > 0 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              {option.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
