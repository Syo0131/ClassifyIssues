import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { 
  AnalysisResult, 
  Ticket, 
  TicketRow, 
  DashboardStats, 
  User, 
  Comment,
  TicketStatus 
} from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'insights.db');

function getDb(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Schema setup
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'technician')),
      projects TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project TEXT DEFAULT 'General',
      raw_text TEXT NOT NULL,
      category TEXT NOT NULL,
      confidence REAL DEFAULT 0,
      issues TEXT DEFAULT '[]',
      actions TEXT DEFAULT '[]',
      summary TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      source TEXT DEFAULT 'unknown',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return db;
}

// User Management
export function getUserByUsername(username: string): User | null {
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!row) return null;
    return {
      ...row,
      projects: row.projects ? JSON.parse(row.projects) : [],
    };
  } finally {
    db.close();
  }
}

export function createUser(username: string, passwordHash: string, role: 'user' | 'technician', projects: string[] = []): number {
  const db = getDb();
  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash, role, projects) VALUES (?, ?, ?, ?)');
    const result = stmt.run(username, passwordHash, role, JSON.stringify(projects));
    return result.lastInsertRowid as number;
  } finally {
    db.close();
  }
}

export function updateUserPassword(userId: number, newPasswordHash: string): boolean {
  const db = getDb();
  try {
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

export function getAllUsers(): User[] {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT id, username, role, projects FROM users ORDER BY username ASC').all() as any[];
    return rows.map(row => ({
      ...row,
      projects: row.projects ? JSON.parse(row.projects) : [],
    }));
  } finally {
    db.close();
  }
}

export function updateUser(id: number, role: 'user' | 'technician', projects: string[] = []): boolean {
  const db = getDb();
  try {
    const result = db.prepare('UPDATE users SET role = ?, projects = ? WHERE id = ?').run(role, JSON.stringify(projects), id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

// Ticket Management
export function createTicket(
  userId: number,
  project: string,
  rawText: string,
  analysis: AnalysisResult
): Ticket {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      INSERT INTO tickets (user_id, project, raw_text, category, confidence, issues, actions, summary, priority, status, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      project,
      rawText,
      analysis.category,
      analysis.confidence,
      JSON.stringify(analysis.issues),
      JSON.stringify(analysis.actions),
      analysis.summary,
      analysis.priority,
      'open',
      analysis.source
    );

    const row = db.prepare('SELECT t.*, u.username FROM tickets t JOIN users u ON t.user_id = u.id WHERE t.id = ?').get(result.lastInsertRowid) as TicketRow;
    return rowToTicket(row);
  } finally {
    db.close();
  }
}

export function getAllTickets(userId?: number): Ticket[] {
  const db = getDb();
  try {
    let stmt;
    const query = `
      SELECT t.*, u.username, u.projects as userProjects 
      FROM tickets t 
      JOIN users u ON t.user_id = u.id 
      ${userId ? 'WHERE t.user_id = ?' : ''} 
      ORDER BY t.created_at DESC
    `;
    if (userId) {
      stmt = db.prepare(query);
      const rows = stmt.all(userId) as TicketRow[];
      return rows.map(rowToTicket);
    } else {
      stmt = db.prepare(query);
      const rows = stmt.all() as TicketRow[];
      return rows.map(rowToTicket);
    }
  } finally {
    db.close();
  }
}

export function getTicketById(id: number): Ticket | null {
  const db = getDb();
  try {
    const row = db.prepare(`
      SELECT t.*, u.username, u.projects as userProjects 
      FROM tickets t 
      JOIN users u ON t.user_id = u.id 
      WHERE t.id = ?
    `).get(id) as TicketRow | undefined;
    return row ? rowToTicket(row) : null;
  } finally {
    db.close();
  }
}

export function updateTicketStatus(id: number, status: TicketStatus): boolean {
  const db = getDb();
  try {
    const result = db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

// Comments Management
export function createComment(ticketId: number, userId: number, text: string): number {
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO comments (ticket_id, user_id, text) VALUES (?, ?, ?)')
      .run(ticketId, userId, text);
    return result.lastInsertRowid as number;
  } finally {
    db.close();
  }
}

export function getCommentsForTicket(ticketId: number): Comment[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT c.*, u.username, u.role 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.ticket_id = ? 
      ORDER BY c.created_at ASC
    `).all(ticketId) as Comment[];
    return rows;
  } finally {
    db.close();
  }
}

export function getStats(userId?: number): DashboardStats {
  const db = getDb();
  try {
    const whereClause = userId ? 'WHERE user_id = ?' : '';
    const params = userId ? [userId] : [];

    const total = (db.prepare(`SELECT COUNT(*) as count FROM tickets ${whereClause}`).get(...params) as { count: number }).count;

    const categoryRows = db.prepare(
      `SELECT category, COUNT(*) as count FROM tickets ${whereClause} GROUP BY category`
    ).all(...params) as { category: string; count: number }[];

    const priorityRows = db.prepare(
      `SELECT priority, COUNT(*) as count FROM tickets ${whereClause} GROUP BY priority`
    ).all(...params) as { priority: string; count: number }[];

    const statusRows = db.prepare(
      `SELECT status, COUNT(*) as count FROM tickets ${whereClause} GROUP BY status`
    ).all(...params) as { status: string; count: number }[];

    const recentCount = (db.prepare(
      `SELECT COUNT(*) as count FROM tickets ${whereClause} ${userId ? 'AND' : 'WHERE'} created_at >= datetime('now', '-7 days')`
    ).get(...params) as { count: number }).count;

    const byCategory: Record<string, number> = {};
    categoryRows.forEach(r => { byCategory[r.category] = r.count; });

    const byPriority: Record<string, number> = {};
    priorityRows.forEach(r => { byPriority[r.priority] = r.count; });

    const byStatus: Record<string, number> = {};
    statusRows.forEach(r => { byStatus[r.status] = r.count; });

    return { total, byCategory, byPriority, byStatus, recentCount };
  } finally {
    db.close();
  }
}

function rowToTicket(row: TicketRow): Ticket {
  return {
    ...row,
    issues: JSON.parse(row.issues),
    actions: JSON.parse(row.actions),
    priority: row.priority as Ticket['priority'],
    status: row.status as TicketStatus,
    source: row.source,
    userProjects: row.userProjects ? JSON.parse(row.userProjects) : [],
  };
}
