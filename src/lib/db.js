"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByUsername = getUserByUsername;
exports.createUser = createUser;
exports.updateUserPassword = updateUserPassword;
exports.getAllUsers = getAllUsers;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.alterUserRoleConstraint = alterUserRoleConstraint;
exports.createTicket = createTicket;
exports.getAllTickets = getAllTickets;
exports.getProfileTicketCounters = getProfileTicketCounters;
exports.listTicketProjectLabels = listTicketProjectLabels;
exports.getTicketsPaged = getTicketsPaged;
exports.getTicketById = getTicketById;
exports.updateTicketStatus = updateTicketStatus;
exports.getTicketsManagedByTechnician = getTicketsManagedByTechnician;
exports.getTicketsClosedByTechnician = getTicketsClosedByTechnician;
exports.createComment = createComment;
exports.getCommentById = getCommentById;
exports.getCommentsForTicket = getCommentsForTicket;
exports.getStats = getStats;
var pg_1 = require("pg");
function parseJsonArray(value) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.map(function (item) { return String(item); });
    if (typeof value === 'string') {
        try {
            var parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map(function (item) { return String(item); }) : [];
        }
        catch (_a) {
            return [];
        }
    }
    return [];
}
function getPoolConfig() {
    var _a, _b, _c, _d, _e;
    var connectionString = (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.trim();
    if (connectionString) {
        var useSsl_1 = (process.env.PGSSL || '').toLowerCase() === 'true';
        return {
            connectionString: connectionString,
            ssl: useSsl_1 ? { rejectUnauthorized: false } : undefined,
        };
    }
    var host = (_b = process.env.PGHOST) === null || _b === void 0 ? void 0 : _b.trim();
    var port = Number(process.env.PGPORT || 5432);
    var user = (_c = process.env.PGUSER) === null || _c === void 0 ? void 0 : _c.trim();
    var password = (_d = process.env.PGPASSWORD) !== null && _d !== void 0 ? _d : '';
    var database = (_e = process.env.PGDATABASE) === null || _e === void 0 ? void 0 : _e.trim();
    var useSsl = (process.env.PGSSL || '').toLowerCase() === 'true';
    if (!host || !user || !database) {
        throw new Error('Postgres configuration missing. Set DATABASE_URL or PGHOST/PGUSER/PGDATABASE in .env.');
    }
    return {
        host: host,
        port: port,
        user: user,
        password: password,
        database: database,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };
}
function getPool() {
    if (!global.__pgPool) {
        global.__pgPool = new pg_1.Pool(getPoolConfig());
    }
    return global.__pgPool;
}
function ensureSchema() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!global.__pgSchemaReady) {
                        global.__pgSchemaReady = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var pool;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        pool = getPool();
                                        return [4 /*yield*/, pool.query("\n        CREATE TABLE IF NOT EXISTS users (\n          id SERIAL PRIMARY KEY,\n          username TEXT NOT NULL UNIQUE,\n          password_hash TEXT NOT NULL,\n          role TEXT NOT NULL CHECK(role IN ('user', 'technician', 'admin')),\n          projects JSONB NOT NULL DEFAULT '[]'::jsonb\n        );\n\n        CREATE TABLE IF NOT EXISTS tickets (\n          id SERIAL PRIMARY KEY,\n          user_id INTEGER NOT NULL REFERENCES users(id),\n          project TEXT NOT NULL DEFAULT 'General',\n          raw_text TEXT NOT NULL,\n          category TEXT NOT NULL,\n          confidence DOUBLE PRECISION NOT NULL DEFAULT 0,\n          issues JSONB NOT NULL DEFAULT '[]'::jsonb,\n          actions JSONB NOT NULL DEFAULT '[]'::jsonb,\n          summary TEXT NOT NULL DEFAULT '',\n          priority TEXT NOT NULL DEFAULT 'medium',\n          status TEXT NOT NULL DEFAULT 'open',\n          source TEXT NOT NULL DEFAULT 'unknown',\n          closed_by_user_id INTEGER,\n          last_updated_by_user_id INTEGER,\n          last_updated_at TIMESTAMPTZ,\n          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n        );\n\n        CREATE TABLE IF NOT EXISTS comments (\n          id SERIAL PRIMARY KEY,\n          ticket_id INTEGER NOT NULL REFERENCES tickets(id),\n          user_id INTEGER NOT NULL REFERENCES users(id),\n          text TEXT NOT NULL,\n          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n        );\n      ")];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })();
                    }
                    return [4 /*yield*/, global.__pgSchemaReady];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function rowToTicket(row) {
    return __assign(__assign({}, row), { issues: parseJsonArray(row.issues), actions: parseJsonArray(row.actions), priority: row.priority, status: row.status, userProjects: parseJsonArray(row.userprojects) });
}
// User Management
function getUserByUsername(username) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT id, username, password_hash, role, projects\n     FROM users\n     WHERE username = $1", [username])];
                case 2:
                    result = _a.sent();
                    row = result.rows[0];
                    if (!row)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            id: row.id,
                            username: row.username,
                            password_hash: row.password_hash,
                            role: row.role,
                            projects: parseJsonArray(row.projects),
                        }];
            }
        });
    });
}
function createUser(username_1, passwordHash_1, role_1) {
    return __awaiter(this, arguments, void 0, function (username, passwordHash, role, projects) {
        var pool, result;
        if (projects === void 0) { projects = []; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("INSERT INTO users (username, password_hash, role, projects)\n     VALUES ($1, $2, $3, $4::jsonb)\n     RETURNING id", [username, passwordHash, role, JSON.stringify(projects)])];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0].id];
            }
        });
    });
}
function updateUserPassword(userId, newPasswordHash) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _b.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId])];
                case 2:
                    result = _b.sent();
                    return [2 /*return*/, ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0];
            }
        });
    });
}
function getAllUsers() {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT id, username, role, projects\n     FROM users\n     ORDER BY username ASC")];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            username: row.username,
                            role: row.role,
                            projects: parseJsonArray(row.projects),
                        }); })];
            }
        });
    });
}
function updateUser(id_1, role_1) {
    return __awaiter(this, arguments, void 0, function (id, role, projects) {
        var pool, result;
        var _a;
        if (projects === void 0) { projects = []; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _b.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("UPDATE users\n     SET role = $1, projects = $2::jsonb\n     WHERE id = $3", [role, JSON.stringify(projects), id])];
                case 2:
                    result = _b.sent();
                    return [2 /*return*/, ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0];
            }
        });
    });
}
function deleteUser(id) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _b.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("DELETE FROM users\n     WHERE id = $1", [id])];
                case 2:
                    result = _b.sent();
                    return [2 /*return*/, ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0];
            }
        });
    });
}
function alterUserRoleConstraint() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("\n    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;\n    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'technician', 'admin'));\n  ")];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Ticket Management
function createTicket(userId, project, rawText, analysis) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, insertResult, id, rowResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("INSERT INTO tickets (\n       user_id, project, raw_text, category, confidence, issues, actions, summary, priority, status, source\n     )\n     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11)\n     RETURNING id", [
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
                        ])];
                case 2:
                    insertResult = _a.sent();
                    id = insertResult.rows[0].id;
                    return [4 /*yield*/, pool.query("SELECT t.*, u.username, u.projects AS userProjects\n     FROM tickets t\n     JOIN users u ON t.user_id = u.id\n     WHERE t.id = $1", [id])];
                case 3:
                    rowResult = _a.sent();
                    return [2 /*return*/, rowToTicket(rowResult.rows[0])];
            }
        });
    });
}
function getAllTickets(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _b.sent();
                    pool = getPool();
                    if (!userId) return [3 /*break*/, 3];
                    return [4 /*yield*/, pool.query("SELECT t.*, u.username, u.projects AS userProjects\n         FROM tickets t\n         JOIN users u ON t.user_id = u.id\n         WHERE t.user_id = $1\n         ORDER BY t.created_at DESC", [userId])];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, pool.query("SELECT t.*, u.username, u.projects AS userProjects\n         FROM tickets t\n         JOIN users u ON t.user_id = u.id\n         ORDER BY t.created_at DESC")];
                case 4:
                    _a = _b.sent();
                    _b.label = 5;
                case 5:
                    result = _a;
                    return [2 /*return*/, result.rows.map(rowToTicket)];
            }
        });
    });
}
var TICKET_LIST_MAX_LIMIT = 50;
var TICKET_LIST_DEFAULT_LIMIT = 10;
function escapeIlikePattern(s) {
    return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
/** Contadores para el perfil sin cargar todos los tickets. */
function getProfileTicketCounters(userId, role) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, totalRes, totalCreated, closedRes_1, closedRes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT COUNT(*)::int AS c FROM tickets WHERE user_id = $1", [userId])];
                case 2:
                    totalRes = _a.sent();
                    totalCreated = totalRes.rows[0].c;
                    if (!(role === 'technician')) return [3 /*break*/, 4];
                    return [4 /*yield*/, pool.query("SELECT COUNT(*)::int AS c FROM tickets WHERE closed_by_user_id = $1", [userId])];
                case 3:
                    closedRes_1 = _a.sent();
                    return [2 /*return*/, { totalCreated: totalCreated, totalClosedByMe: closedRes_1.rows[0].c }];
                case 4: return [4 /*yield*/, pool.query("SELECT COUNT(*)::int AS c FROM tickets WHERE user_id = $1 AND status = 'closed'", [userId])];
                case 5:
                    closedRes = _a.sent();
                    return [2 /*return*/, { totalCreated: totalCreated, totalClosedByMe: closedRes.rows[0].c }];
            }
        });
    });
}
/** Proyectos distintos visibles en el ámbito (todos los tickets o solo los del usuario). */
function listTicketProjectLabels(userIdScope) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _b.sent();
                    pool = getPool();
                    if (!(userIdScope != null)) return [3 /*break*/, 3];
                    return [4 /*yield*/, pool.query("SELECT DISTINCT COALESCE(NULLIF(TRIM(project), ''), 'General') AS p\n           FROM tickets WHERE user_id = $1 ORDER BY 1", [userIdScope])];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, pool.query("SELECT DISTINCT COALESCE(NULLIF(TRIM(project), ''), 'General') AS p\n           FROM tickets ORDER BY 1")];
                case 4:
                    _a = _b.sent();
                    _b.label = 5;
                case 5:
                    result = _a;
                    return [2 /*return*/, result.rows.map(function (r) { return r.p; })];
            }
        });
    });
}
function buildTicketListWhere(filters) {
    var parts = [];
    var params = [];
    var i = 1;
    if (filters.userIdScope != null) {
        parts.push("t.user_id = $".concat(i++));
        params.push(filters.userIdScope);
    }
    if (filters.status === 'active') {
        parts.push("t.status <> 'closed'");
    }
    else if (filters.status !== 'all') {
        parts.push("t.status = $".concat(i++));
        params.push(filters.status);
    }
    if (filters.priority !== 'all') {
        parts.push("t.priority = $".concat(i++));
        params.push(filters.priority);
    }
    if (filters.project !== 'all') {
        parts.push("COALESCE(NULLIF(TRIM(t.project), ''), 'General') = $".concat(i++));
        params.push(filters.project);
    }
    var q = filters.search.trim();
    if (q) {
        var like = "%".concat(escapeIlikePattern(q), "%");
        parts.push("(CAST(t.id AS TEXT) ILIKE $".concat(i, " ESCAPE '\\' OR t.raw_text ILIKE $").concat(i, " ESCAPE '\\' OR COALESCE(t.summary, '') ILIKE $").concat(i, " ESCAPE '\\')"));
        params.push(like);
        i++;
    }
    var sql = parts.length > 0 ? "WHERE ".concat(parts.join(' AND ')) : '';
    return { sql: sql, params: params };
}
/**
 * Listado paginado con filtros en SQL (bandeja).
 */
function getTicketsPaged(filters, sort, page, limit) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, limitClamped, pageSafe, offset, _a, whereSql, whereParams, orderDir, countQuery, countRes, total, projects, limitPlaceholder, offsetPlaceholder, dataQuery, dataParams, dataRes;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _b.sent();
                    pool = getPool();
                    limitClamped = Math.min(Math.max(Number(limit) || TICKET_LIST_DEFAULT_LIMIT, 1), TICKET_LIST_MAX_LIMIT);
                    pageSafe = Math.max(Number(page) || 1, 1);
                    offset = (pageSafe - 1) * limitClamped;
                    _a = buildTicketListWhere(filters), whereSql = _a.sql, whereParams = _a.params;
                    orderDir = sort === 'oldest' ? 'ASC' : 'DESC';
                    countQuery = "\n    SELECT COUNT(*)::int AS c\n    FROM tickets t\n    JOIN users u ON t.user_id = u.id\n    ".concat(whereSql, "\n  ");
                    return [4 /*yield*/, pool.query(countQuery, whereParams)];
                case 2:
                    countRes = _b.sent();
                    total = countRes.rows[0].c;
                    return [4 /*yield*/, listTicketProjectLabels(filters.userIdScope)];
                case 3:
                    projects = _b.sent();
                    limitPlaceholder = whereParams.length + 1;
                    offsetPlaceholder = whereParams.length + 2;
                    dataQuery = "\n    SELECT t.*, u.username, u.projects AS userProjects\n    FROM tickets t\n    JOIN users u ON t.user_id = u.id\n    ".concat(whereSql, "\n    ORDER BY t.created_at ").concat(orderDir, "\n    LIMIT $").concat(limitPlaceholder, " OFFSET $").concat(offsetPlaceholder, "\n  ");
                    dataParams = __spreadArray(__spreadArray([], whereParams, true), [limitClamped, offset], false);
                    return [4 /*yield*/, pool.query(dataQuery, dataParams)];
                case 4:
                    dataRes = _b.sent();
                    return [2 /*return*/, {
                            tickets: dataRes.rows.map(rowToTicket),
                            total: total,
                            projects: projects,
                        }];
            }
        });
    });
}
function getTicketById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT t.*, u.username, u.projects AS userProjects\n     FROM tickets t\n     JOIN users u ON t.user_id = u.id\n     WHERE t.id = $1", [id])];
                case 2:
                    result = _a.sent();
                    if (!result.rows[0])
                        return [2 /*return*/, null];
                    return [2 /*return*/, rowToTicket(result.rows[0])];
            }
        });
    });
}
function updateTicketStatus(id, status, actingUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _c.sent();
                    pool = getPool();
                    if (!(status === 'closed')) return [3 /*break*/, 3];
                    return [4 /*yield*/, pool.query("UPDATE tickets\n           SET status = $1,\n               last_updated_by_user_id = $2,\n               last_updated_at = NOW(),\n               closed_by_user_id = $3\n           WHERE id = $4", [status, actingUserId, actingUserId, id])];
                case 2:
                    _a = _c.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, pool.query("UPDATE tickets\n           SET status = $1,\n               last_updated_by_user_id = $2,\n               last_updated_at = NOW(),\n               closed_by_user_id = NULL\n           WHERE id = $3", [status, actingUserId, id])];
                case 4:
                    _a = _c.sent();
                    _c.label = 5;
                case 5:
                    result = _a;
                    return [2 /*return*/, ((_b = result.rowCount) !== null && _b !== void 0 ? _b : 0) > 0];
            }
        });
    });
}
function getTicketsManagedByTechnician(technicianId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT t.*, u.username, u.projects AS userProjects\n     FROM tickets t\n     JOIN users u ON t.user_id = u.id\n     WHERE t.last_updated_by_user_id = $1\n     ORDER BY t.created_at DESC", [technicianId])];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(rowToTicket)];
            }
        });
    });
}
function getTicketsClosedByTechnician(technicianId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT t.*, u.username, u.projects AS userProjects\n     FROM tickets t\n     JOIN users u ON t.user_id = u.id\n     WHERE t.closed_by_user_id = $1\n     ORDER BY t.created_at DESC", [technicianId])];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(rowToTicket)];
            }
        });
    });
}
// Comments Management
function createComment(ticketId, userId, text) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("INSERT INTO comments (ticket_id, user_id, text)\n     VALUES ($1, $2, $3)\n     RETURNING id", [ticketId, userId, text])];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0].id];
            }
        });
    });
}
function getCommentById(commentId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _b.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT c.id, c.ticket_id, c.user_id, c.text, c.created_at, u.username, u.role\n     FROM comments c\n     JOIN users u ON c.user_id = u.id\n     WHERE c.id = $1", [commentId])];
                case 2:
                    result = _b.sent();
                    return [2 /*return*/, (_a = result.rows[0]) !== null && _a !== void 0 ? _a : null];
            }
        });
    });
}
function getCommentsForTicket(ticketId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _a.sent();
                    pool = getPool();
                    return [4 /*yield*/, pool.query("SELECT c.id, c.ticket_id, c.user_id, c.text, c.created_at, u.username, u.role\n     FROM comments c\n     JOIN users u ON c.user_id = u.id\n     WHERE c.ticket_id = $1\n     ORDER BY c.created_at ASC", [ticketId])];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
function getStats(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, totalResult, _a, total, categoryRows, _b, priorityRows, _c, statusRows, _d, closedCountResult, _e, closedCount, recentCountResult, _f, recentCount, byCategory, byPriority, byStatus;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, ensureSchema()];
                case 1:
                    _g.sent();
                    pool = getPool();
                    if (!userId) return [3 /*break*/, 3];
                    return [4 /*yield*/, pool.query('SELECT COUNT(*)::int AS count FROM tickets WHERE user_id = $1', [userId])];
                case 2:
                    _a = _g.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, pool.query('SELECT COUNT(*)::int AS count FROM tickets')];
                case 4:
                    _a = _g.sent();
                    _g.label = 5;
                case 5:
                    totalResult = _a;
                    total = totalResult.rows[0].count;
                    if (!userId) return [3 /*break*/, 7];
                    return [4 /*yield*/, pool.query('SELECT category, COUNT(*)::int AS count FROM tickets WHERE user_id = $1 GROUP BY category', [userId])];
                case 6:
                    _b = _g.sent();
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, pool.query('SELECT category, COUNT(*)::int AS count FROM tickets GROUP BY category')];
                case 8:
                    _b = _g.sent();
                    _g.label = 9;
                case 9:
                    categoryRows = _b;
                    if (!userId) return [3 /*break*/, 11];
                    return [4 /*yield*/, pool.query('SELECT priority, COUNT(*)::int AS count FROM tickets WHERE user_id = $1 GROUP BY priority', [userId])];
                case 10:
                    _c = _g.sent();
                    return [3 /*break*/, 13];
                case 11: return [4 /*yield*/, pool.query('SELECT priority, COUNT(*)::int AS count FROM tickets GROUP BY priority')];
                case 12:
                    _c = _g.sent();
                    _g.label = 13;
                case 13:
                    priorityRows = _c;
                    if (!userId) return [3 /*break*/, 15];
                    return [4 /*yield*/, pool.query('SELECT status, COUNT(*)::int AS count FROM tickets WHERE user_id = $1 GROUP BY status', [userId])];
                case 14:
                    _d = _g.sent();
                    return [3 /*break*/, 17];
                case 15: return [4 /*yield*/, pool.query('SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status')];
                case 16:
                    _d = _g.sent();
                    _g.label = 17;
                case 17:
                    statusRows = _d;
                    if (!userId) return [3 /*break*/, 19];
                    return [4 /*yield*/, pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE user_id = $1 AND status = 'closed'", [userId])];
                case 18:
                    _e = _g.sent();
                    return [3 /*break*/, 21];
                case 19: return [4 /*yield*/, pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE status = 'closed'")];
                case 20:
                    _e = _g.sent();
                    _g.label = 21;
                case 21:
                    closedCountResult = _e;
                    closedCount = closedCountResult.rows[0].count;
                    if (!userId) return [3 /*break*/, 23];
                    return [4 /*yield*/, pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'", [userId])];
                case 22:
                    _f = _g.sent();
                    return [3 /*break*/, 25];
                case 23: return [4 /*yield*/, pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE created_at >= NOW() - INTERVAL '7 days'")];
                case 24:
                    _f = _g.sent();
                    _g.label = 25;
                case 25:
                    recentCountResult = _f;
                    recentCount = recentCountResult.rows[0].count;
                    byCategory = {};
                    categoryRows.rows.forEach(function (row) {
                        byCategory[row.category] = row.count;
                    });
                    byPriority = {};
                    priorityRows.rows.forEach(function (row) {
                        byPriority[row.priority] = row.count;
                    });
                    byStatus = {};
                    statusRows.rows.forEach(function (row) {
                        byStatus[row.status] = row.count;
                    });
                    return [2 /*return*/, { total: total, byCategory: byCategory, byPriority: byPriority, byStatus: byStatus, closedCount: closedCount, recentCount: recentCount }];
            }
        });
    });
}
