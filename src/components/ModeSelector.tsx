'use client';

import { useState } from 'react';
import { TicketType } from '@/lib/types';

const OPTIONS: { type: TicketType; icon: string; title: string; description: string }[] = [
  {
    type: 'incidencia',
    icon: '🛟',
    title: 'Incidencia',
    description: 'Algo que ya existe ha dejado de funcionar o va mal, y necesitas que lo revisemos.',
  },
  {
    type: 'desarrollo',
    icon: '🧩',
    title: 'Desarrollo',
    description: 'Quieres algo nuevo: una funcionalidad, una mejora o un proyecto por presupuestar.',
  },
];

export default function ModeSelector({ onSelect }: { onSelect: (type: TicketType) => void }) {
  const [hovered, setHovered] = useState<TicketType | null>(null);

  return (
    <div style={{ width: '100%', maxWidth: '680px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          ¿Qué necesitas?
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 400, margin: 0 }}>
          Elige el tipo de solicitud para que la gestionemos por la vía adecuada.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {OPTIONS.map(option => {
          const isHovered = hovered === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelect(option.type)}
              onMouseEnter={() => setHovered(option.type)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(option.type)}
              onBlur={() => setHovered(null)}
              style={{
                padding: '2.25rem 1.75rem',
                borderRadius: '16px',
                border: `1px solid ${isHovered ? 'var(--primary)' : 'var(--border-subtle)'}`,
                background: 'transparent',
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                transform: isHovered ? 'translateY(-3px)' : 'none',
                boxShadow: isHovered ? '0 12px 28px rgba(0, 0, 0, 0.08)' : 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '2.25rem', lineHeight: 1 }} aria-hidden="true">{option.icon}</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.02em' }}>{option.title}</span>
              <span style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-secondary)', fontWeight: 400 }}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
