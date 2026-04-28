'use client';

import { Submission } from '@/lib/types';

interface InsightCardProps {
  data: Submission;
}

export default function InsightCard({ data }: InsightCardProps) {
  return (
    <div className="glass-card insight-card">
      <div className="insight-header">
        <div className="insight-badges">
          <span className="badge badge-category">📂 {data.category}</span>
          <span className={`badge badge-priority ${data.priority}`}>
            {data.priority === 'critical' ? '🔴' : data.priority === 'high' ? '🟠' : data.priority === 'medium' ? '🔵' : '🟢'}
            {' '}{data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}
          </span>
        </div>
      </div>

      <p className="insight-summary">{data.summary}</p>

      <div className="insight-section">
        <div className="insight-section-title">
          <span className="icon">⚠️</span> Key Issues Identified
        </div>
        <ul className="insight-list">
          {data.issues.map((issue, i) => (
            <li key={i}>
              <span className="bullet issue-bullet" />
              {issue}
            </li>
          ))}
        </ul>
      </div>

      <div className="insight-section">
        <div className="insight-section-title">
          <span className="icon">✅</span> Suggested Next Actions
        </div>
        <ul className="insight-list">
          {data.actions.map((action, i) => (
            <li key={i}>
              <span className="bullet action-bullet" />
              {action}
            </li>
          ))}
        </ul>
      </div>

      <div className="insight-section">
        <div className="insight-section-title">
          <span className="icon">📊</span> Classification Confidence
        </div>
        <div className="confidence-bar-container">
          <div className="confidence-bar">
            <div className="confidence-fill" style={{ width: `${(data.confidence * 100).toFixed(0)}%` }} />
          </div>
          <span className="confidence-label">{(data.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
