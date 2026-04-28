'use client';

import { DashboardStats } from '@/lib/types';

interface StatsGridProps {
  stats: DashboardStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const categoryCount = Object.keys(stats.byCategory).length;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📋</div>
        <div className="stat-value">{stats.total}</div>
        <div className="stat-label">Total Submissions</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📂</div>
        <div className="stat-value">{categoryCount}</div>
        <div className="stat-label">Categories</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🔥</div>
        <div className="stat-value">{stats.byPriority?.high || 0}</div>
        <div className="stat-label">High Priority</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📅</div>
        <div className="stat-value">{stats.recentCount}</div>
        <div className="stat-label">This Week</div>
      </div>
    </div>
  );
}
