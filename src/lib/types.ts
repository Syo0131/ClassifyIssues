export interface AnalysisResult {
  category: string;
  confidence: number;
  issues: string[];
  actions: string[];
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface Submission {
  id: number;
  raw_text: string;
  category: string;
  confidence: number;
  issues: string[];
  actions: string[];
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface SubmissionRow {
  id: number;
  raw_text: string;
  category: string;
  confidence: number;
  issues: string;
  actions: string;
  summary: string;
  priority: string;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  recentCount: number;
}
