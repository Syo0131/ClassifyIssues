import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { AnalysisResult, Submission, SubmissionRow, DashboardStats } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'insights.db');

function getDb(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_text TEXT NOT NULL,
      category TEXT NOT NULL,
      confidence REAL DEFAULT 0,
      issues TEXT DEFAULT '[]',
      actions TEXT DEFAULT '[]',
      summary TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export function createSubmission(
  rawText: string,
  analysis: AnalysisResult
): Submission {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      INSERT INTO submissions (raw_text, category, confidence, issues, actions, summary, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      rawText,
      analysis.category,
      analysis.confidence,
      JSON.stringify(analysis.issues),
      JSON.stringify(analysis.actions),
      analysis.summary,
      analysis.priority
    );

    const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(result.lastInsertRowid) as SubmissionRow;
    return rowToSubmission(row);
  } finally {
    db.close();
  }
}

export function getAllSubmissions(): Submission[] {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all() as SubmissionRow[];
    return rows.map(rowToSubmission);
  } finally {
    db.close();
  }
}

export function getSubmissionById(id: number): Submission | null {
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as SubmissionRow | undefined;
    return row ? rowToSubmission(row) : null;
  } finally {
    db.close();
  }
}

export function getStats(): DashboardStats {
  const db = getDb();
  try {
    const total = (db.prepare('SELECT COUNT(*) as count FROM submissions').get() as { count: number }).count;

    const categoryRows = db.prepare(
      'SELECT category, COUNT(*) as count FROM submissions GROUP BY category'
    ).all() as { category: string; count: number }[];

    const priorityRows = db.prepare(
      'SELECT priority, COUNT(*) as count FROM submissions GROUP BY priority'
    ).all() as { priority: string; count: number }[];

    const recentCount = (db.prepare(
      "SELECT COUNT(*) as count FROM submissions WHERE created_at >= datetime('now', '-7 days')"
    ).get() as { count: number }).count;

    const byCategory: Record<string, number> = {};
    categoryRows.forEach(r => { byCategory[r.category] = r.count; });

    const byPriority: Record<string, number> = {};
    priorityRows.forEach(r => { byPriority[r.priority] = r.count; });

    return { total, byCategory, byPriority, recentCount };
  } finally {
    db.close();
  }
}

function rowToSubmission(row: SubmissionRow): Submission {
  return {
    ...row,
    issues: JSON.parse(row.issues),
    actions: JSON.parse(row.actions),
    priority: row.priority as Submission['priority'],
  };
}
