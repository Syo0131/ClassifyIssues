'use client';

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Budget, DevDataTable, DevelopmentSpec, RequirementPriority } from '@/lib/types';
import { formatMoney } from '@/lib/budget';
import { collapseBlankLines } from '@/lib/chat';
import DownloadPdfMenu from './DownloadPdfMenu';
import MermaidDiagram from './MermaidDiagram';

const PRIORITY_LABEL: Record<RequirementPriority, string> = {
  must: 'Imprescindible',
  should: 'Deseable',
  could: 'Opcional',
};

const COMPLEXITY_LABEL: Record<DevelopmentSpec['complexity'], string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

type TabId = 'prd' | 'trd' | 'flow' | 'budget' | 'chat';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Bullets({ items, empty = 'Sin datos.' }: { items: string[]; empty?: string }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>{empty}</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
      {children}
    </p>
  );
}

function DataTablesView({ tables }: { tables: DevDataTable[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {tables.map(table => (
        <div key={table.name} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 0.9rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-muted)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{table.name}</div>
            {table.description && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{table.description}</div>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Columna</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map(col => (
                  <tr key={col.name}>
                    <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {col.name}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      {col.type}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      {col.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Documentación generada por la IA para un ticket de tipo `desarrollo`. */
export default function DevelopmentSpecPanel({
  ticketId,
  spec,
  budget,
}: {
  ticketId: number;
  spec: DevelopmentSpec;
  budget: Budget | null;
}) {
  const [tab, setTab] = useState<TabId>('prd');
  const hasConversation = !!spec.conversation && spec.conversation.length > 1;
  const hasFlow = !!spec.flowDiagram;

  // "Flujo" y "Conversación" sólo aparecen cuando aplican: no todo ticket de
  // desarrollo tiene un flujo que valga la pena diagramar, ni pasó por el chat.
  const tabs: { id: TabId; label: string }[] = [
    { id: 'prd', label: 'PRD · Producto' },
    { id: 'trd', label: 'TRD · Técnico' },
    ...(hasFlow ? [{ id: 'flow' as TabId, label: 'Flujo' }] : []),
    { id: 'budget', label: 'Estimación' },
    ...(hasConversation ? [{ id: 'chat' as TabId, label: 'Conversación' }] : []),
  ];

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{spec.title}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Complejidad {COMPLEXITY_LABEL[spec.complexity]}
          </p>
        </div>
        <DownloadPdfMenu ticketId={ticketId} />
      </div>

      {spec.warnings?.length > 0 && (
        <div
          style={{
            margin: '1rem 1.5rem 0',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'rgba(245, 158, 11, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            <TriangleAlert size={15} strokeWidth={2.2} aria-hidden="true" />
            Requiere revisión
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {spec.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.25rem', padding: '0 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: tab === item.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === item.id ? 'var(--primary)' : 'var(--text-secondary)',
              padding: '0.75rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.5rem' }}>
        {tab === 'prd' && (
          <>
            <Section title="Problema"><Paragraph>{spec.problem}</Paragraph></Section>
            <Section title="Objetivo"><Paragraph>{spec.goal}</Paragraph></Section>
            <Section title="Usuarios destinatarios"><Bullets items={spec.targetUsers} /></Section>
            <Section title="Alcance"><Bullets items={spec.scope} /></Section>
            <Section title="Fuera de alcance">
              <Bullets items={spec.outOfScope} empty="No se excluyó nada explícitamente." />
            </Section>

            <Section title="Requisitos funcionales">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {spec.functionalRequirements.map(requirement => (
                  <div key={requirement.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--primary)', marginRight: '0.4rem' }}>{requirement.id}</span>
                        {requirement.title}
                      </span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {PRIORITY_LABEL[requirement.priority]}
                      </span>
                    </div>
                    {requirement.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        {requirement.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Métricas de éxito">
              <Bullets items={spec.successMetrics} empty="Pendiente de acordar con el cliente." />
            </Section>
            <Section title="Supuestos"><Bullets items={spec.assumptions} empty="Sin supuestos registrados." /></Section>
            <Section title="Riesgos"><Bullets items={spec.risks} empty="Sin riesgos identificados." /></Section>
            {spec.openQuestions.length > 0 && (
              <Section title="Cuestiones abiertas"><Bullets items={spec.openQuestions} /></Section>
            )}
          </>
        )}

        {tab === 'trd' && (
          <>
            <Section title="Arquitectura propuesta"><Paragraph>{spec.architecture}</Paragraph></Section>
            <Section title="Componentes"><Bullets items={spec.components} /></Section>
            <Section title="Modelo de datos">
              {spec.dataTables && spec.dataTables.length > 0 ? (
                <DataTablesView tables={spec.dataTables} />
              ) : (
                <Bullets items={spec.dataModel} empty="Este desarrollo no requiere tablas nuevas." />
              )}
            </Section>
            <Section title="Integraciones">
              <Bullets items={spec.integrations} empty="No se identificaron integraciones externas." />
            </Section>
            <Section title="Requisitos no funcionales"><Bullets items={spec.nonFunctional} /></Section>
          </>
        )}

        {tab === 'flow' && spec.flowDiagram && (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.5 }}>
              Diagrama generado a partir de la solicitud. Es un borrador automático: revísalo junto con el resto del análisis.
            </p>
            <MermaidDiagram chart={spec.flowDiagram} />
          </>
        )}

        {tab === 'budget' && budget && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Total estimado
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatMoney(budget.total.likely, budget.currency)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {formatMoney(budget.total.min, budget.currency)} – {formatMoney(budget.total.max, budget.currency)}
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Esfuerzo
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{budget.hours.likely} h</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {budget.hours.min} – {budget.hours.max} h
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Tarifa
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatMoney(budget.hourlyRate, budget.currency)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>por hora</div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '460px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem 0.4rem', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Módulo</th>
                    <th style={{ padding: '0.5rem 0.4rem', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', textAlign: 'right' }}>Horas</th>
                    <th style={{ padding: '0.5rem 0.4rem', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', textAlign: 'right' }}>Coste</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.lines.map(line => (
                    <tr key={line.module}>
                      <td style={{ padding: '0.6rem 0.4rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>{line.module}</td>
                      <td style={{ padding: '0.6rem 0.4rem', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {line.hoursLikely} h
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({line.hoursMin}–{line.hoursMax})</span>
                      </td>
                      <td style={{ padding: '0.6rem 0.4rem', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right', color: 'var(--text-primary)' }}>
                        {formatMoney(line.costLikely, budget.currency)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '0.6rem 0.4rem', color: 'var(--text-secondary)' }}>Contingencia ({budget.contingencyPct}%)</td>
                    <td />
                    <td style={{ padding: '0.6rem 0.4rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {formatMoney(budget.contingency.likely, budget.currency)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ padding: '0.6rem 0.4rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Total</td>
                    <td style={{ padding: '0.6rem 0.4rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {budget.hours.likely} h
                    </td>
                    <td style={{ padding: '0.6rem 0.4rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {formatMoney(budget.total.likely, budget.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Section title="Detalle de módulos">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                {spec.modules.map(module => (
                  <div key={module.name}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {module.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {module.hoursLikely} h</span>
                    </div>
                    {module.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', lineHeight: 1.5 }}>
                        {module.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Estimación orientativa y no vinculante, generada a partir del análisis automático de la solicitud.
              Se confirmará tras el refinamiento de requisitos con el cliente.
            </p>
          </>
        )}

        {tab === 'chat' && hasConversation && (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.5 }}>
              Preguntas que la IA hizo al cliente y sus respuestas. El documento se redactó a partir de esta conversación.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {spec.conversation!.map((m, i) => {
                const isClient = m.role === 'user';
                return (
                  <div key={i}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isClient ? 'var(--text-muted)' : 'var(--primary)', marginBottom: '0.2rem' }}>
                      {isClient ? (i === 0 ? 'Cliente · petición inicial' : 'Cliente') : 'Asistente IA'}
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{collapseBlankLines(m.content)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
