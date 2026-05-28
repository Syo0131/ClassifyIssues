export const UserRole = {
  User: 'user',
  Technician: 'technician',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const TicketPriority = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
} as const;

export type TicketPriorityType = typeof TicketPriority[keyof typeof TicketPriority];

export const TicketStatus = {
  Open: 'open',
  WaitingOnClient: 'waiting_on_client',
  Closed: 'closed',
} as const;

export type TicketStatusType = typeof TicketStatus[keyof typeof TicketStatus];

export interface User {
  id: number;
  username: string;
  role: UserRoleType;
  projects: string[];
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface AnalysisResult {
  category: string;
  confidence: number;
  issues: string[];
  actions: string[];
  summary: string;
  priority: TicketPriorityType;
  source: 'gemini' | 'mock';
}

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
  priority: TicketPriorityType;
  status: TicketStatusType;
  source: string;
  closed_by_user_id?: number;
  last_updated_by_user_id?: number;
  last_updated_at?: string;
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
  total: number; // Total tickets created by this user
  projects?: string[]; // Added for profile page to show user's projects
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  closedCount?: number;
  totalClosedByMe?: number; // Tickets closed by this technician
  recentCount: number;
}

/** Filtros del listado paginado de tickets (API / bandeja). */
export interface TicketListFilters {
  userIdScope?: number;
  status: 'all' | 'active' | 'open' | 'waiting_on_client' | 'closed';
  priority: 'all' | 'low' | 'medium' | 'high' | 'critical';
  project: string;
  search: string;
}

export interface TicketListPageResult {
  tickets: Ticket[];
  total: number;
  projects: string[];
}
