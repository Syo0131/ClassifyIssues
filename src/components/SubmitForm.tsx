'use client';

import { useState } from 'react';

interface SubmitFormProps {
  projects?: string[];
  onResult: (data: unknown) => void;
  onLoading: (loading: boolean) => void;
}

export default function SubmitForm({ projects = [], onResult, onLoading }: SubmitFormProps) {
  const [text, setText] = useState('');
  const [selectedProject, setSelectedProject] = useState(projects.length > 0 ? projects[0] : 'General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim().length < 10) {
      setError('Por favor describe tu solicitud con más detalle.');
      return;
    }

    setLoading(true);
    onLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), project: selectedProject }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      const data = await res.json();
      onResult(data);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCategoryClick = (categoryText: string) => {
    setText((prev) => prev ? `${prev}\n\n[${categoryText}]` : `[${categoryText}] `);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
      
      {projects.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Proyecto:</span>
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '100px', 
              border: '1px solid var(--border-subtle)', 
              background: 'var(--bg-card)', 
              color: 'var(--text-primary)', 
              fontSize: '0.85rem', 
              outline: 'none',
              appearance: 'none',
              paddingRight: '2rem',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '14px',
              cursor: 'pointer'
            }}
          >
            {projects.map(p => (
              <option key={p} value={p} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{p}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe la situación o problema..."
          disabled={loading}
          style={{
            width: '100%',
            minHeight: '120px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border-subtle)',
            outline: 'none',
            fontSize: '1.25rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            resize: 'none',
            padding: '1rem 0',
            fontFamily: 'inherit'
          }}
        />
        {/* Placeholder styling is handled via generic CSS but we can ensure it's light enough */}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleCategoryClick('Error Técnico')} style={{ padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>Error Técnico</button>
          <button type="button" onClick={() => handleCategoryClick('Facturación')} style={{ padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>Facturación</button>
          <button type="button" onClick={() => handleCategoryClick('Sugerencia')} style={{ padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>Sugerencia</button>
        </div>

        <button 
          type="submit" 
          disabled={loading || text.trim().length < 10}
          style={{
            background: 'var(--primary)', // Match the vibrant blue from the image
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.6rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: 500,
            cursor: loading || text.trim().length < 10 ? 'not-allowed' : 'pointer',
            opacity: loading || text.trim().length < 10 ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s'
          }}
        >
          {loading ? 'Analizando...' : 'Crear Ticket ✧'}
        </button>
      </div>
    </form>
  );
}
