'use client';

import { useState } from 'react';
import SubmitForm from '@/components/SubmitForm';
import InsightCard from '@/components/InsightCard';
import { Submission } from '@/lib/types';

export default function HomePage() {
  const [result, setResult] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="page-container">
      <div className="home-hero">
        <h1>
          Transform Requests into <span>Structured Insights</span>
        </h1>
        <p>
          Paste any stakeholder request below. Our AI will classify it, extract key issues,
          and generate actionable next steps — instantly.
        </p>
      </div>

      <div className="home-content">
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <SubmitForm
            onResult={(data) => setResult(data as Submission)}
            onLoading={setLoading}
          />
        </div>

        {loading && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ borderColor: 'rgba(124,58,237,0.3)', borderTopColor: '#7c3aed' }} />
              Processing with AI...
            </div>
          </div>
        )}

        {result && !loading && <InsightCard data={result} />}

        {!result && !loading && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.7 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧠</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Submit a stakeholder request above to see AI-powered insights
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
