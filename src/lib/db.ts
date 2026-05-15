import { Pool, PoolConfig } from 'pg';
import {
  AnalysisResult,
  Ticket,
  DashboardStats,
  User,
  Comment,
  TicketStatus,
  TicketListFilters,
  TicketListPageResult,
} from './types';

type JsonArrayValue = string[] | unknown[] | string | null | undefined;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __pgSchemaReady: Promise<void> | undefined;
}

function parseJsonArray(value: JsonArrayValue): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(item => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    const useSsl = (process.env.PGSSL || '').toLowerCase() === 'true';
    return {
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };
  }

  const host = process.env.PGHOST?.trim();
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD ?? '';
  const database = process.env.PGDATABASE?.trim();
  const useSsl = (process.env.PGSSL || '').toLowerCase() === 'true';

  if (!host || !user || !database) {
    throw new Error('Postgres configuration missing. Set DATABASE_URL or PGHOST/PGUSER/PGDATABASE in .env.');
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = new Pool(getPoolConfig());
  }
  return global.__pgPool;
}

async function ensureSchema(): Promise<void> {
  if (!global.__pgSchemaReady) {
    global.__pgSchemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('user', 'technician')),
          projects JSONB NOT NULL DEFAULT '[]'::jsonb
        );

        CREATE TABLE IF NOT EXISTS tickets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          project TEXT NOT NULL DEFAULT 'General',
          raw_text TEXT NOT NULL,
          category TEXT NOT NULL,
          confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
          issues JSONB NOT NULL DEFAULT '[]'::jsonb,
          actions JSONB NOT NULL DEFAULT '[]'::jsonb,
          summary TEXT NOT NULL DEFAULT '',
          priority TEXT NOT NULL DEFAULT 'medium',
          status TEXT NOT NULL DEFAULT 'open',
          source TEXT NOT NULL DEFAULT 'unknown',
          closed_by_user_id INTEGER,
          last_updated_by_user_id INTEGER,
          last_updated_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER NOT NULL REFERENCES tickets(id),
          user_id INTEGER NOT NULL REFERENCES users(id),
          text TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })();
  }
  await global.__pgSchemaReady;
}

function rowToTicket(row: any): Ticket {
  return {
    ...row,
    issues: parseJsonArray(row.issues),
    actions: parseJsonArray(row.actions),
    priority: row.priority as Ticket['priority'],
    status: row.status as TicketStatus,
    userProjects: parseJsonArray(row.userprojects),
  };
}

// User Management
export async function getUserByUsername(username: string): Promise<User | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, password_hash, role, projects
     FROM users
     WHERE username = $1`,
    [username]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    password_hash: row.password_hash,
    role: row.role,
    projects: parseJsonArray(row.projects),
  };
}

export async function createUser(
  username: string,
  passwordHash: string,
  role: 'user' | 'technician',
  projects: string[] = []
): Promise<number> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO users (username, password_hash, role, projects)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [username, passwordHash, role, JSON.stringify(projects)]
  );
  return result.rows[0].id;
}

export async function updateUserPassword(userId: number, newPasswordHash: string): Promise<boolean> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [newPasswordHash, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getAllUsers(): Promise<User[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, role, projects
     FROM users
     ORDER BY username ASC`
  );
  return result.rows.map(row => ({
    id: row.id,
    username: row.username,
    role: row.role,
    projects: parseJsonArray(row.projects),
  }));
}

export async function updateUser(id: number, role: 'user' | 'technician', projects: string[] = []): Promise<boolean> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `UPDATE users
     SET role = $1, projects = $2::jsonb
     WHERE id = $3`,
    [role, JSON.stringify(projects), id]
  );
  return (result.rowCount ?? 0) > 0;
}

// Ticket Management
export async function createTicket(
  userId: number,
  project: string,
  rawText: string,
  analysis: AnalysisResult
): Promise<Ticket> {
  await ensureSchema();
  const pool = getPool();

  const insertResult = await pool.query(
    `INSERT INTO tickets (
       user_id, project, raw_text, category, confidence, issues, actions, summary, priority, status, source
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11)
     RETURNING id`,
    [
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
      analysis.source,
    ]
  );

  const id = insertResult.rows[0].id;
  const rowResult = await pool.query(
    `SELECT t.*, u.username, u.projects AS userProjects
     FROM tickets t
     JOIN users u ON t.user_id = u.id
     WHERE t.id = $1`,
    [id]
  );

  return rowToTicket(rowResult.rows[0]);
}

export async function getAllTickets(userId?: number): Promise<Ticket[]> {
  await ensureSchema();
  const pool = getPool();
  const result = userId
    ? await pool.query(
        `SELECT t.*, u.username, u.projects AS userProjects
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         WHERE t.user_id = $1
         ORDER BY t.created_at DESC`,
        [userId]
      )
    : await pool.query(
        `SELECT t.*, u.username, u.projects AS userProjects
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC`
      );

  return result.rows.map(rowToTicket);
}

const TICKET_LIST_MAX_LIMIT = 50;
const TICKET_LIST_DEFAULT_LIMIT = 10;

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Contadores para el perfil sin cargar todos los tickets. */
export async function getProfileTicketCounters(
  userId: number,
  role: 'user' | 'technician'
): Promise<{ totalCreated: number; totalClosedByMe: number }> {
  await ensureSchema();
  const pool = getPool();

  const totalRes = await pool.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM tickets WHERE user_id = $1`,
    [userId]
  );
  const totalCreated = totalRes.rows[0].c;

  if (role === 'technician') {
    const closedRes = await pool.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM tickets WHERE closed_by_user_id = $1`,
      [userId]
    );
    return { totalCreated, totalClosedByMe: closedRes.rows[0].c };
  }

  const closedRes = await pool.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM tickets WHERE user_id = $1 AND status = 'closed'`,
    [userId]
  );
  return { totalCreated, totalClosedByMe: closedRes.rows[0].c };
}

/** Proyectos distintos visibles en el ámbito (todos los tickets o solo los del usuario). */
export async function listTicketProjectLabels(userIdScope?: number): Promise<string[]> {
  await ensureSchema();
  const pool = getPool();
  const result =
    userIdScope != null
      ? await pool.query<{ p: string }>(
          `SELECT DISTINCT COALESCE(NULLIF(TRIM(project), ''), 'General') AS p
           FROM tickets WHERE user_id = $1 ORDER BY 1`,
          [userIdScope]
        )
      : await pool.query<{ p: string }>(
          `SELECT DISTINCT COALESCE(NULLIF(TRIM(project), ''), 'General') AS p
           FROM tickets ORDER BY 1`
        );
  return result.rows.map(r => r.p);
}

function buildTicketListWhere(filters: TicketListFilters): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filters.userIdScope != null) {
    parts.push(`t.user_id = $${i++}`);
    params.push(filters.userIdScope);
  }

  if (filters.status === 'active') {
    parts.push(`t.status <> 'closed'`);
  } else if (filters.status !== 'all') {
    parts.push(`t.status = $${i++}`);
    params.push(filters.status);
  }

  if (filters.priority !== 'all') {
    parts.push(`t.priority = $${i++}`);
    params.push(filters.priority);
  }

  if (filters.project !== 'all') {
    parts.push(`COALESCE(NULLIF(TRIM(t.project), ''), 'General') = $${i++}`);
    params.push(filters.project);
  }

  const q = filters.search.trim();
  if (q) {
    const like = `%${escapeIlikePattern(q)}%`;
    parts.push(
      `(CAST(t.id AS TEXT) ILIKE $${i} ESCAPE '\\' OR t.raw_text ILIKE $${i} ESCAPE '\\' OR COALESCE(t.summary, '') ILIKE $${i} ESCAPE '\\')`
    );
    params.push(like);
    i++;
  }

  const sql = parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
  return { sql, params };
}

/**
 * Listado paginado con filtros en SQL (bandeja).
 */
export async function getTicketsPaged(
  filters: TicketListFilters,
  sort: 'newest' | 'oldest',
  page: number,
  limit: number
): Promise<TicketListPageResult> {
  await ensureSchema();
  const pool = getPool();

  const limitClamped = Math.min(
    Math.max(Number(limit) || TICKET_LIST_DEFAULT_LIMIT, 1),
    TICKET_LIST_MAX_LIMIT
  );
  const pageSafe = Math.max(Number(page) || 1, 1);
  const offset = (pageSafe - 1) * limitClamped;

  const { sql: whereSql, params: whereParams } = buildTicketListWhere(filters);
  const orderDir = sort === 'oldest' ? 'ASC' : 'DESC';

  const countQuery = `
    SELECT COUNT(*)::int AS c
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ${whereSql}
  `;
  const countRes = await pool.query<{ c: number }>(countQuery, whereParams);
  const total = countRes.rows[0].c;

  const projects = await listTicketProjectLabels(filters.userIdScope);

  const limitPlaceholder = whereParams.length + 1;
  const offsetPlaceholder = whereParams.length + 2;
  const dataQuery = `
    SELECT t.*, u.username, u.projects AS userProjects
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ${whereSql}
    ORDER BY t.created_at ${orderDir}
    LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder}
  `;
  const dataParams = [...whereParams, limitClamped, offset];
  const dataRes = await pool.query(dataQuery, dataParams);

  return {
    tickets: dataRes.rows.map(rowToTicket),
    total,
    projects,
  };
}

export async function getTicketById(id: number): Promise<Ticket | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT t.*, u.username, u.projects AS userProjects
     FROM tickets t
     JOIN users u ON t.user_id = u.id
     WHERE t.id = $1`,
    [id]
  );
  if (!result.rows[0]) return null;
  return rowToTicket(result.rows[0]);
}

export async function updateTicketStatus(id: number, status: TicketStatus, actingUserId: number): Promise<boolean> {
  await ensureSchema();
  const pool = getPool();

  const result =
    status === 'closed'
      ? await pool.query(
          `UPDATE tickets
           SET status = $1,
               last_updated_by_user_id = $2,
               last_updated_at = NOW(),
               closed_by_user_id = $3
           WHERE id = $4`,
          [status, actingUserId, actingUserId, id]
        )
      : await pool.query(
          `UPDATE tickets
           SET status = $1,
               last_updated_by_user_id = $2,
               last_updated_at = NOW(),
               closed_by_user_id = NULL
           WHERE id = $3`,
          [status, actingUserId, id]
        );

  return (result.rowCount ?? 0) > 0;
}

export async function getTicketsManagedByTechnician(technicianId: number): Promise<Ticket[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT t.*, u.username, u.projects AS userProjects
     FROM tickets t
     JOIN users u ON t.user_id = u.id
     WHERE t.last_updated_by_user_id = $1
     ORDER BY t.created_at DESC`,
    [technicianId]
  );
  return result.rows.map(rowToTicket);
}

export async function getTicketsClosedByTechnician(technicianId: number): Promise<Ticket[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT t.*, u.username, u.projects AS userProjects
     FROM tickets t
     JOIN users u ON t.user_id = u.id
     WHERE t.closed_by_user_id = $1
     ORDER BY t.created_at DESC`,
    [technicianId]
  );
  return result.rows.map(rowToTicket);
}

// Comments Management
export async function createComment(ticketId: number, userId: number, text: string): Promise<number> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO comments (ticket_id, user_id, text)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [ticketId, userId, text]
  );
  return result.rows[0].id;
}

export async function getCommentById(commentId: number): Promise<Comment | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT c.id, c.ticket_id, c.user_id, c.text, c.created_at, u.username, u.role
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = $1`,
    [commentId]
  );
  return result.rows[0] ?? null;
}

export async function getCommentsForTicket(ticketId: number): Promise<Comment[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT c.id, c.ticket_id, c.user_id, c.text, c.created_at, u.username, u.role
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.ticket_id = $1
     ORDER BY c.created_at ASC`,
    [ticketId]
  );
  return result.rows;
}

export async function getStats(userId?: number): Promise<DashboardStats> {
  await ensureSchema();
  const pool = getPool();

  const totalResult = userId
    ? await pool.query('SELECT COUNT(*)::int AS count FROM tickets WHERE user_id = $1', [userId])
    : await pool.query('SELECT COUNT(*)::int AS count FROM tickets');
  const total = totalResult.rows[0].count;

  const categoryRows = userId
    ? await pool.query(
        'SELECT category, COUNT(*)::int AS count FROM tickets WHERE user_id = $1 GROUP BY category',
        [userId]
      )
    : await pool.query('SELECT category, COUNT(*)::int AS count FROM tickets GROUP BY category');

  const priorityRows = userId
    ? await pool.query(
        'SELECT priority, COUNT(*)::int AS count FROM tickets WHERE user_id = $1 GROUP BY priority',
        [userId]
      )
    : await pool.query('SELECT priority, COUNT(*)::int AS count FROM tickets GROUP BY priority');

  const statusRows = userId
    ? await pool.query(
        'SELECT status, COUNT(*)::int AS count FROM tickets WHERE user_id = $1 GROUP BY status',
        [userId]
      )
    : await pool.query('SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status');

  const closedCountResult = userId
    ? await pool.query(
        "SELECT COUNT(*)::int AS count FROM tickets WHERE user_id = $1 AND status = 'closed'",
        [userId]
      )
    : await pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE status = 'closed'");
  const closedCount = closedCountResult.rows[0].count;

  const recentCountResult = userId
    ? await pool.query(
        "SELECT COUNT(*)::int AS count FROM tickets WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'",
        [userId]
      )
    : await pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE created_at >= NOW() - INTERVAL '7 days'");
  const recentCount = recentCountResult.rows[0].count;

  const byCategory: Record<string, number> = {};
  categoryRows.rows.forEach((row: { category: string; count: number }) => {
    byCategory[row.category] = row.count;
  });

  const byPriority: Record<string, number> = {};
  priorityRows.rows.forEach((row: { priority: string; count: number }) => {
    byPriority[row.priority] = row.count;
  });

  const byStatus: Record<string, number> = {};
  statusRows.rows.forEach((row: { status: string; count: number }) => {
    byStatus[row.status] = row.count;
  });

  return { total, byCategory, byPriority, byStatus, closedCount, recentCount };
}
