'use client';

import { useState } from 'react';

interface SubmitFormProps {
  onResult: (data: unknown) => void;
  onLoading: (loading: boolean) => void;
}

export default function SubmitForm({ onResult, onLoading }: SubmitFormProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      setError('Please enter at least 10 characters.');
      return;
    }

    setLoading(true);
    onLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
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

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}
      <div style={{ marginBottom: '1rem' }}>
        <label className="form-label" htmlFor="request-input">Stakeholder Request</label>
        <textarea
          id="request-input"
          className="form-textarea"
          placeholder='e.g. "We need help tracking customer complaints about delivery delays and billing confusion."'
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <div className="char-count">{text.length} characters</div>
      </div>
      <button type="submit" className="submit-btn" disabled={loading || text.trim().length < 10}>
        {loading ? (
          <>
            <div className="spinner" />
            Analyzing...
          </>
        ) : (
          <>🔍 Analyze Request</>
        )}
      </button>
    </form>
  );
}
