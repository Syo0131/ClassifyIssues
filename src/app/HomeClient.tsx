'use client';

import { useState } from 'react';
import SubmitForm from '@/components/SubmitForm';
import { Ticket } from '@/lib/types';
import Link from 'next/link';

export default function HomeClient({ projects = [] }: { projects: string[] }) {
  const [result, setResult] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 150px)', padding: '2rem' }}>
      
      {!result && !loading && (
        <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Nueva Solicitud
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
              Describe tu situación o problema. Deja que nuestra IA lo organice.
            </p>
          </div>
          
          <div style={{ width: '100%' }}>
            <SubmitForm
              projects={projects}
              onResult={(data) => setResult(data as Ticket)}
              onLoading={setLoading}
            />
          </div>
          
          <div style={{ position: 'fixed', bottom: '2rem', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            SISTEMA DE SOPORTE INTELIGENTE
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', color: 'var(--primary)', borderWidth: '3px' }} />
          <div>
            <p style={{ fontWeight: 500, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Analizando solicitud...</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '1rem' }}>Ticket Registrado</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '3rem', fontWeight: 400 }}>
            Tu solicitud ha sido procesada y se le ha asignado el número <strong>{result.id}</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href={`/tickets/${result.id}`} className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem', borderRadius: '100px' }}>
              Ver Detalle
            </Link>
            <button onClick={() => setResult(null)} style={{ padding: '0.8rem 2rem', fontSize: '1rem', borderRadius: '100px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
              Nueva Solicitud
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
