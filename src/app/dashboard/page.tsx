'use client';

import { useState, useEffect, useCallback } from 'react';
import StatsGrid from '@/components/StatsGrid';
import SubmissionTable from '@/components/SubmissionTable';
import { DashboardStats, Submission } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, subsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/submissions'),
      ]);
      const statsData = await statsRes.json();
      const subsData = await subsRes.json();
      setStats(statsData);
      setSubmissions(subsData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Loading insights...</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card" style={{ minHeight: '100px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', marginBottom: '0.75rem' }} />
              <div style={{ width: '60px', height: '24px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', marginBottom: '0.35rem' }} />
              <div style={{ width: '100px', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxCategoryCount = stats ? Math.max(...Object.values(stats.byCategory), 1) : 1;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of all analyzed stakeholder requests</p>
      </div>

      {stats && <StatsGrid stats={stats} />}

      {stats && Object.keys(stats.byCategory).length > 0 && (
        <div className="dashboard-grid">
          <div className="glass-card">
            <div className="chart-title">📊 By Category</div>
            <div className="chart-bars">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="chart-row">
                    <div className="chart-label">{cat}</div>
                    <div className="chart-bar-track">
                      <div className="chart-bar-fill" style={{ width: `${(count / maxCategoryCount) * 100}%` }}>
                        <span className="chart-bar-value">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="glass-card">
            <div className="chart-title">🎯 By Priority</div>
            <div className="chart-bars">
              {['critical', 'high', 'medium', 'low'].map(p => {
                const count = stats.byPriority[p] || 0;
                const maxP = Math.max(...Object.values(stats.byPriority), 1);
                return (
                  <div key={p} className="chart-row">
                    <div className="chart-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge badge-priority ${p}`} style={{ fontSize: '0.7rem' }}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </span>
                    </div>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill"
                        style={{
                          width: `${(count / maxP) * 100}%`,
                          background: p === 'critical' ? 'linear-gradient(135deg, #dc2626, #f43f5e)'
                            : p === 'high' ? 'linear-gradient(135deg, #d97706, #f59e0b)'
                            : p === 'medium' ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                            : 'linear-gradient(135deg, #059669, #10b981)',
                        }}
                      >
                        <span className="chart-bar-value">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SubmissionTable submissions={submissions} />
    </div>
  );
}
