export interface User {
  id: number;
  username: string;
  role: 'user' | 'technician';
  password_hash?: string;
  projects?: string[];
}

export interface AnalysisResult {
  category: string;
  confidence: number;
  issues: string[];
  actions: string[];
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'gemini' | 'mock';
}

export type TicketStatus = 'open' | 'waiting_on_client' | 'closed';

export interface Ticket {
  id: number;
  user_id: number;
  username?: string; // For display
  userProjects?: string[]; // Projects of the user who created the ticket
  project?: string;
  raw_text: string;
  category: string;
  confidence: number;
  issues: string[];
  actions: string[];
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TicketStatus;
  source: string;
  created_at: string;
}

export interface TicketRow {
  id: number;
  user_id: number;
  username?: string; // Joined field
  userProjects?: string; // Joined field (JSON string)
  project?: string;
  raw_text: string;
  category: string;
  confidence: number;
  issues: string;
  actions: string;
  summary: string;
  priority: string;
  status: string;
  source: string;
  created_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  text: string;
  created_at: string;
  username?: string; // For display
  role?: string;     // For display
}

export interface DashboardStats {
  total: number;
  projects?: string[]; // Added for profile page to show user's projects
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  recentCount: number;
}
