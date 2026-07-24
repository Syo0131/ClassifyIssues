'use client';

import { useState } from 'react';
import SubmitForm from '@/components/SubmitForm';
import DevelopmentForm from '@/components/DevelopmentForm';
import ModeSelector from '@/components/ModeSelector';
import { Ticket, TicketType } from '@/lib/types';
import Link from 'next/link';

const COPY: Record<TicketType, { title: string; subtitle: string; loading: string; loadingHint: string }> = {
  incidencia: {
    title: 'Reportar Incidencia',
    subtitle: 'Describe tu situación o problema. Deja que nuestra IA lo organice.',
    loading: 'Analizando solicitud...',
    loadingHint: 'Clasificando categoría y prioridad.',
  },
  desarrollo: {
    title: 'Nuevo Desarrollo',
    subtitle: 'Cuéntanos qué quieres construir. La IA lo convertirá en PRD, TRD y presupuesto.',
    loading: 'Redactando PRD y TRD...',
    loadingHint: 'Analizando requisitos y estimando el esfuerzo. Puede tardar unos segundos.',
  },
};

export default function HomeClient({ projects = [] }: { projects: string[] }) {
  const [mode, setMode] = useState<TicketType | null>(null);
  const [result, setResult] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setResult(null);
    setMode(null);
  };

  const showSelector = !mode && !result && !loading;
  const showForm = mode && !result && !loading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 150px)', padding: '2rem' }}>

      {showSelector && <ModeSelector onSelect={setMode} />}

      {showForm && (
        <div style={{ width: '100%', maxWidth: mode === 'desarrollo' ? '820px' : '720px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setMode(null)}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0 1.5rem', fontFamily: 'inherit' }}
          >
            ← Cambiar tipo de solicitud
          </button>

          <div style={{ textAlign: 'center', marginBottom: mode === 'desarrollo' ? '2.5rem' : '4rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {COPY[mode].title}
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
              {COPY[mode].subtitle}
            </p>
          </div>

          <div style={{ width: '100%' }}>
            {mode === 'desarrollo' ? (
              <DevelopmentForm projects={projects} onResult={data => setResult(data as Ticket)} onLoading={setLoading} />
            ) : (
              <SubmitForm projects={projects} onResult={data => setResult(data as Ticket)} onLoading={setLoading} />
            )}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', color: 'var(--primary)', borderWidth: '3px' }} />
          <div>
            <p style={{ fontWeight: 500, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {COPY[mode ?? 'incidencia'].loading}
            </p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{COPY[mode ?? 'incidencia'].loadingHint}</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Ticket Registrado
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '3rem', fontWeight: 400 }}>
            {result.type === 'desarrollo' ? (
              <>Tu solicitud de desarrollo es el ticket <strong>#{result.id}</strong>. Nuestro equipo la revisará y se pondrá en contacto contigo.</>
            ) : (
              <>Tu solicitud ha sido procesada y se le ha asignado el número <strong>{result.id}</strong>.</>
            )}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href={`/tickets/${result.id}`}
              className="btn-primary"
              style={{ padding: '0.8rem 2rem', fontSize: '1rem', borderRadius: '100px' }}
            >
              Ver Detalle
            </Link>
            <button
              onClick={reset}
              style={{ padding: '0.8rem 2rem', fontSize: '1rem', borderRadius: '100px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
            >
              Nueva Solicitud
            </button>
          </div>
        </div>
      )}

      {showSelector && (
        <div style={{ position: 'fixed', bottom: '2rem', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
          SISTEMA DE SOPORTE INTELIGENTE
        </div>
      )}
    </div>
  );
}
