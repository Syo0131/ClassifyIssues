'use client';

import { useState } from 'react';
import { Submission } from '@/lib/types';

interface SubmissionTableProps {
  submissions: Submission[];
}

export default function SubmissionTable({ submissions }: SubmissionTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const categories = [...new Set(submissions.map(s => s.category))];
  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.category === filter);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="submissions-section">
      <div className="section-header">
        <div className="section-title">Recent Submissions ({filtered.length})</div>
      </div>

      {categories.length > 1 && (
        <div className="filter-bar">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          {categories.map(cat => (
            <button key={cat} className={`filter-btn ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{cat}</button>
          ))}
        </div>
      )}

      <div className="submissions-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No submissions yet. Analyze a request to get started.</p>
          </div>
        ) : (
          filtered.map(sub => (
            <div key={sub.id} className="submission-row" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
              <div className="submission-top">
                <div className="submission-meta">
                  <span className="badge badge-category">{sub.category}</span>
                  <span className={`badge badge-priority ${sub.priority}`}>
                    {sub.priority.charAt(0).toUpperCase() + sub.priority.slice(1)}
                  </span>
                  <span className="submission-time">{formatDate(sub.created_at)}</span>
                </div>
              </div>
              <div className="submission-text">{sub.raw_text}</div>

              {expandedId === sub.id && (
                <div className="submission-detail">
                  <p className="insight-summary">{sub.summary}</p>
                  <div className="insight-section">
                    <div className="insight-section-title"><span className="icon">⚠️</span> Key Issues</div>
                    <ul className="insight-list">
                      {sub.issues.map((issue, i) => (
                        <li key={i}><span className="bullet issue-bullet" />{issue}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="insight-section">
                    <div className="insight-section-title"><span className="icon">✅</span> Actions</div>
                    <ul className="insight-list">
                      {sub.actions.map((action, i) => (
                        <li key={i}><span className="bullet action-bullet" />{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
