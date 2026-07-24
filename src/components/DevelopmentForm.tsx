'use client';

import { useState } from 'react';
import CustomSelect from './CustomSelect';

interface DevelopmentFormProps {
  projects?: string[];
  onResult: (data: unknown) => void;
  onLoading: (loading: boolean) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '0.95rem',
  color: 'var(--text-primary)',
  padding: '0.7rem 0.9rem',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.4rem',
};

/**
 * Formulario de la vía "desarrollo". Además de la descripción libre recoge el
 * brief (objetivo, usuarios, plazo, restricciones) que se envía como contexto
 * extra al prompt de PM/PO/Ingeniero. Todos los campos del brief son opcionales:
 * lo que falte acaba en los supuestos y preguntas abiertas del PRD.
 */
export default function DevelopmentForm({ projects = [], onResult, onLoading }: DevelopmentFormProps) {
  const [text, setText] = useState('');
  const [objective, setObjective] = useState('');
  const [users, setUsers] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedProject, setSelectedProject] = useState(projects.length > 0 ? projects[0] : 'General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = text.trim().length >= 10 && !loading;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim().length < 10) {
      setError('Describe el desarrollo que necesitas con más detalle.');
      return;
    }

    setLoading(true);
    onLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'desarrollo',
          text: text.trim(),
          project: selectedProject,
          // El stack no se envía: lo añade el servidor desde la ficha del proyecto.
          brief: { objective, users, deadline },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo analizar la solicitud');
      }

      onResult(await res.json());
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Proyecto:</span>
          <CustomSelect
            value={selectedProject}
            onChange={setSelectedProject}
            options={projects.map(project => ({ value: project, label: project }))}
            integratedMenu
            minimal
          />
        </div>
      )}

      <label style={labelStyle} htmlFor="dev-description">
        ¿Qué quieres construir? <span style={{ color: 'var(--danger)' }}>*</span>
      </label>
      <textarea
        id="dev-description"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ej.: Necesitamos un portal donde los clientes puedan consultar sus facturas, descargarlas en PDF y pagarlas con tarjeta..."
        disabled={loading}
        style={{ ...inputStyle, minHeight: '150px', resize: 'vertical', lineHeight: 1.55, marginBottom: '1.5rem' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={labelStyle} htmlFor="dev-objective">Objetivo de negocio</label>
          <input
            id="dev-objective"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            placeholder="Reducir las llamadas de soporte por facturación"
            disabled={loading}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="dev-users">¿Quién lo va a usar?</label>
          <input
            id="dev-users"
            value={users}
            onChange={e => setUsers(e.target.value)}
            placeholder="Clientes finales y el equipo de administración"
            disabled={loading}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="dev-deadline">Plazo deseado</label>
          <input
            id="dev-deadline"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            placeholder="Antes del cierre del trimestre"
            disabled={loading}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '380px' }}>
          Generaremos un PRD, un TRD y una estimación con presupuesto orientativo. Los campos opcionales mejoran la precisión.
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.7rem 1.6rem',
            fontSize: '0.95rem',
            fontWeight: 500,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.6,
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Analizando...' : 'Generar PRD y presupuesto ✧'}
        </button>
      </div>
    </form>
  );
}
