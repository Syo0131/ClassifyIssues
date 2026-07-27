'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { ChatMessage } from '@/lib/types';

interface DevelopmentFormProps {
  projects?: string[];
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

const primaryBtn = (enabled: boolean): React.CSSProperties => ({
  background: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '0.7rem 1.6rem',
  fontSize: '0.95rem',
  fontWeight: 500,
  cursor: enabled ? 'pointer' : 'not-allowed',
  opacity: enabled ? 1 : 0.6,
  transition: 'background 0.2s',
});

/**
 * Vía "desarrollo" en dos fases:
 *  1. `intro`: el cliente describe qué quiere.
 *  2. `chat`: la IA le hace preguntas de negocio/alcance para pulir la solicitud.
 *
 * El chat es opcional (botón "Generar ya") y dinámico (la IA decide cuándo tiene
 * suficiente, con tope en el servidor). Al terminar se crea el ticket con toda la
 * conversación como contexto y el PRD/TRD se genera en segundo plano; se redirige
 * a la bandeja sin mostrar el procesamiento interno al cliente.
 */
export default function DevelopmentForm({ projects = [] }: DevelopmentFormProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'intro' | 'chat'>('intro');
  const [text, setText] = useState('');
  const [selectedProject, setSelectedProject] = useState(projects.length > 0 ? projects[0] : 'General');

  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false); // esperando la próxima pregunta
  const [submitting, setSubmitting] = useState(false); // creando el ticket
  const [error, setError] = useState('');

  const pendingQuestion =
    conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant'
      ? conversation[conversation.length - 1].content
      : null;

  /** Pide a la IA la siguiente pregunta; si ya no hay más, genera el documento. */
  const advance = async (convo: ChatMessage[]) => {
    setThinking(true);
    setError('');
    try {
      const res = await fetch('/api/dev-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: convo }),
      });
      const data = (await res.json().catch(() => ({ done: true }))) as { done?: boolean; question?: string | null };

      if (!data.done && data.question) {
        setConversation([...convo, { role: 'assistant', content: data.question }]);
        setThinking(false);
      } else {
        await generate(convo);
      }
    } catch {
      // Ante fallo del chat, no bloqueamos: generamos con lo que haya.
      await generate(convo);
    }
  };

  /** Crea el ticket con la conversación como contexto y redirige a la bandeja. */
  const generate = async (convo: ChatMessage[]) => {
    setThinking(false);
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'desarrollo',
          text: text.trim(),
          project: selectedProject,
          conversation: convo,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo registrar la solicitud');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
      setSubmitting(false);
    }
  };

  const startChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim().length < 10) {
      setError('Describe el desarrollo que necesitas con más detalle.');
      return;
    }
    const convo: ChatMessage[] = [{ role: 'user', content: text.trim() }];
    setConversation(convo);
    setPhase('chat');
    void advance(convo);
  };

  const sendAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answer.trim() || thinking || submitting) return;
    const convo: ChatMessage[] = [...conversation, { role: 'user', content: answer.trim() }];
    setConversation(convo);
    setAnswer('');
    void advance(convo);
  };

  // ── Fase 1: descripción inicial ──
  if (phase === 'intro') {
    const canSubmit = text.trim().length >= 10;
    return (
      <form onSubmit={startChat} style={{ width: '100%' }}>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

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

        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }} htmlFor="dev-description">
          ¿Qué quieres construir? <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <textarea
          id="dev-description"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ej.: Necesitamos un portal donde los clientes puedan consultar sus facturas, descargarlas en PDF y pagarlas con tarjeta..."
          style={{ ...inputStyle, minHeight: '150px', resize: 'vertical', lineHeight: 1.55, marginBottom: '1.5rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '380px' }}>
            Te haremos unas breves preguntas para entender mejor tu solicitud antes de registrarla.
          </p>
          <button type="submit" disabled={!canSubmit} style={{ ...primaryBtn(canSubmit), display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            Continuar
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </form>
    );
  }

  // ── Fase 2: chat de refinamiento ──
  const busy = thinking || submitting;
  return (
    <div style={{ width: '100%' }}>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {conversation.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '0.7rem 1rem',
                  borderRadius: '14px',
                  borderTopRightRadius: isUser ? '4px' : '14px',
                  borderTopLeftRadius: isUser ? '14px' : '4px',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                  background: isUser ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-card)',
                  border: `1px solid ${isUser ? 'rgba(59, 130, 246, 0.25)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                }}
              >
                {!isUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                    <Bot size={13} strokeWidth={2} aria-hidden="true" />
                    Asistente
                  </div>
                )}
                {m.content}
              </div>
            </div>
          );
        })}

        {thinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span className="spinner" style={{ width: '16px', height: '16px', color: 'var(--primary)', borderWidth: '2px' }} />
            Pensando...
          </div>
        )}
      </div>

      {submitting ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-secondary)', padding: '1rem' }}>
          <span className="spinner" style={{ width: '20px', height: '20px', color: 'var(--primary)', borderWidth: '2px' }} />
          Registrando tu solicitud...
        </div>
      ) : (
        <form onSubmit={sendAnswer}>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAnswer();
              }
            }}
            placeholder={pendingQuestion ? 'Escribe tu respuesta...' : 'Añade cualquier detalle...'}
            disabled={busy || !pendingQuestion}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', lineHeight: 1.5, marginBottom: '1rem', opacity: !pendingQuestion ? 0.6 : 1 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => generate(conversation)}
              disabled={busy}
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '6px', padding: '0.7rem 1.4rem', fontSize: '0.9rem', fontWeight: 500, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              No responder más preguntas, generar ticket
            </button>
            <button type="submit" disabled={busy || !answer.trim() || !pendingQuestion} style={primaryBtn(!busy && !!answer.trim() && !!pendingQuestion)}>
              Enviar respuesta
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
