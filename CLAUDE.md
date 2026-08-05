# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

**This project uses pnpm, not npm.** The version is pinned in `packageManager`; `corepack enable` installs it. Never run `npm install` here — it would create a competing `package-lock.json` and a flat `node_modules` that hides the phantom-dependency errors pnpm is there to catch.

```bash
pnpm install                  # respects pnpm-lock.yaml
pnpm install --frozen-lockfile # CI/Docker: fail instead of updating the lockfile
pnpm dev                      # next dev
pnpm build                    # next build (output: 'standalone')
pnpm start                    # serve the production build
pnpm lint                     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
node seed.js                  # create the users table and the admin/admin123 technician account
```

There is no test framework in this project — do not assume one exists.

Two pnpm-specific bits of `package.json` are easy to break:

- `pnpm.overrides` uses pnpm's `parent>child` syntax (`"next-auth>next": "$next"`), not npm's nested-object form. It exists to keep next-auth on the app's own Next version — verify with `pnpm why next`, which must report a single version.
- `pnpm.onlyBuiltDependencies` lists the packages allowed to run install scripts (`sharp`, `unrs-resolver`). pnpm blocks them by default, so a new dependency with a native build step must be added here or it will silently ship unbuilt.

`seed.js` loads `.env` itself (no dotenv dependency); the Next.js runtime relies on Next's own `.env` loading.

## Architecture

Next.js 16 App Router + React 19 support-ticket system. Postgres for storage, Gemini for ticket triage. UI text is Spanish.

### Data layer — `src/lib/db.ts`

Single module holding *all* SQL. There is no ORM and no migration tool:

- A `Pool` and a schema-ready promise are cached on `globalThis` (`__pgPool`, `__pgSchemaReady`) so dev hot-reload doesn't leak connections.
- `ensureSchema()` runs `CREATE TABLE IF NOT EXISTS` + idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on first query of a process. **Schema changes go here**, written to be safe to re-run on every boot.
- Config comes from `DATABASE_URL`, else `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`; `PGSSL=true` enables SSL.
- `src/lib/db.js` and `src/lib/types.js` are stale compiled JS artifacts. Never edit or import them — the `.ts` files are the source.

### Auth — `src/auth.config.ts` / `src/auth.ts` / `src/middleware.ts`

NextAuth v5 beta, JWT sessions, deliberately split into edge-safe and Node halves:

- `auth.config.ts` is **edge-safe** (no DB, no Node APIs) because `middleware.ts` instantiates NextAuth from it. It owns the `authorized` callback (the redirect gate: unauthenticated → `/login`, authenticated on `/login` → `/dashboard`) and shape-only `jwt`/`session` callbacks.
- `auth.ts` re-instantiates NextAuth with the Credentials provider and **overrides `session`** to additionally verify the user is still active in the DB, with a 60s in-process cache. Deactivating a user therefore takes effect within ~a minute without a re-login.
- `AUTH_SESSION_VERSION` is a kill switch: bumping it invalidates every issued JWT (the `jwt`/`session` callbacks reject mismatched tokens).
- `middleware.ts` also injects an `x-pathname` request header so server components (`Navbar`) can read the current path via `headers()`.
- Session/JWT type augmentation lives in `src/types/next-auth.d.ts` (`id: number`, `role`, `projects: string[]`).

### Authorization model

Roles are `user` | `technician` | `admin`. Enforcement is per-route, not centralized:

- API routes wrap handlers in `auth(async function ...)` from `@/auth`, check `req.auth`, then check `role` inline. `export const GET = auth(...) as any` — the `as any` is needed because the NextAuth v5 wrapper's types don't line up with Next 16 route handler signatures.
- Scoping rule: `technician` sees all tickets, everyone else is scoped to their own `user_id` (see the `userIdScope` filter in `src/app/api/tickets/route.ts`).
- `admin` gates user management (`/api/admin/users`, `/admin/users`).
- `projects` is a `string[]` per user (JSONB column) used to tag and filter tickets.

### Two request paths — `incidencia` vs `desarrollo`

After login the user lands on `/` and picks a lane (`ModeSelector`). The choice is stored as `tickets.type` and decides which AI prompt runs — everything downstream branches on it:

- `incidencia` → `analyzeRequest()`, the classic triage below.
- `desarrollo` → `analyzeDevelopmentRequest()`, which prompts Gemini as PM/PO/engineer and returns a `DevelopmentSpec` (PRD + TRD + three-point hour estimates), persisted whole in `tickets.spec` (JSONB). `analysisFromDevelopmentSpec()` then derives the classic ticket fields so a development ticket still lists and filters like any other.

**Development analysis runs in the background.** The Gemini call takes ~20s, too long to block on. `POST /api/analyze` for a `desarrollo` ticket creates the row immediately with a placeholder analysis (`source: 'pending'`, `spec` NULL), returns `202`, and the client is redirected straight to `/dashboard`. `runDevAnalysisInBackground()` (in `lib/dev-analysis.ts`) is fired without `await` and fills the spec in via `applyDevTicketAnalysis()`. **`spec` NULL on a `desarrollo` ticket means "still analyzing"** — that's the pending sentinel the UI polls on (the staff ticket detail auto-refreshes every 4s until it arrives). This relies on the standalone Node server being long-lived; a restart mid-analysis leaves the ticket pending forever. Runbook to reprocess: call `runDevAnalysisInBackground(id, rawText, brief)` for any `desarrollo` row where `spec IS NULL`, or resubmit. If this becomes load-bearing, move it to a real job queue.

**The PRD/TRD is staff-only.** It is unvalidated AI/rules output meant to be reviewed in a meeting before reaching the client, so a `user` sees a development ticket as an ordinary ticket: the spec panel is gated behind `canViewAllTickets` in the detail view, and `GET /api/tickets/[id]/prd` (the PDF) rejects non-staff even for the ticket's own author. See `lib/permissions.ts` for the role predicates.

Clients are existing customers, so the development form never asks them about their stack — we already know it. `lib/project-context.ts` resolves it per project name from `DEV_PROJECT_STACKS` (a JSON map) with a `DEV_DEFAULT_STACK` fallback, and the API injects it into the brief server-side. A `stack` sent in the request body is ignored by design, so a client cannot spoof it. The prompt labels that block as internal verified fact and forbids the model from raising stack questions in `openQuestions`.

**Refinement chat.** Before a development ticket is created, the client goes through a short Q&A: `DevelopmentForm` has two phases (`intro` → `chat`). Each turn calls `POST /api/dev-chat` → `nextDevChatQuestion()` (a third Gemini profile, `'chat'`, in `getGeminiModelCached`), which returns `{done, question}` — one business/scope question at a time, never technical (we know the stack), capped at `DEV_CHAT_MAX_QUESTIONS` (enforced both in the prompt and server-side). It never blocks: no API key or any error → `{done:true}`, and the client can hit "Generar ya" anytime. On finish, the full `ChatMessage[]` transcript goes to `POST /api/analyze` as `conversation`, is woven into `buildDevPrompt` (replacing the old static objective/users/deadline brief fields, now removed), and is persisted inside `spec.conversation` for staff traceability (shown as a "Conversación" tab in `DevelopmentSpecPanel` and a PDF appendix). Note: `gemini-flash-latest`-family models spend output tokens on internal "thinking", so the chat profile needs a generous `maxOutputTokens` (2000) or the JSON reply truncates.

**Model pinning.** `GEMINI_MODEL` defaults to a pinned version (`gemini-3.1-flash-lite`), never a `-latest` alias — Google can silently repoint an alias to a newer model with a much smaller free-tier quota (this happened: `gemini-flash-latest` started resolving to a model capped at 20 requests/day). If you hit persistent 429s, check `models/{name}?key=...` against the current quota, don't just swap back to an alias.

**Flow diagram and data tables (conditional).** The dev prompt asks Gemini for two more optional fields, only "cuando aplique": `flowDiagram` (Mermaid `flowchart` syntax) and `dataTables` (structured `{name, description, columns}[]`, distinct from the older free-text `dataModel: string[]`). Both are validated server-side in `ai.ts` — `normalizeFlowDiagram()` requires the string to start with `flowchart`/`graph` + a direction and contain at least one `-->` edge, or it's dropped with a warning rather than persisted broken; `normalizeDataTables()` drops any table left with zero valid columns. Neither is added to `REVIEWABLE_ARRAY_FIELDS`, since absence is a legitimate outcome (a copy tweak has no flow or tables), not something to flag to the reviewer. `MermaidDiagram.tsx` renders `flowDiagram` client-side only (`mermaid` needs a browser) inside a `try/catch` — the diagram text is LLM output, so `securityLevel: 'strict'` sanitizes the SVG, and a parse failure shows a fallback message instead of crashing the panel. The PDF can't embed the rendered diagram (no headless browser in this stack by design — see the Helvetica/WinAnsi note below), so it prints the raw Mermaid source in a monospace block instead, readable and pastable into a Mermaid live editor. `dataTables`, when present, renders as a real column/type/notes table in both the panel and the PDF (`drawDataTables()`, a bespoke layout — it doesn't reuse `drawTableRow`/`TABLE_COLUMNS`, which are hardwired to the budget table's numeric right-aligned columns).

**Data model precision.** `DevTableColumn` isn't free-text: `type` is constrained to a closed Postgres vocabulary (`PgColumnType` in `types.ts` — uuid/text/varchar/integer/bigint/numeric/boolean/timestamptz/date/jsonb), plus `typeDetail` (varchar length or numeric precision,scale), `primaryKey`, `nullable`, and an optional `references: {table, column}` for foreign keys. The prompt asks Gemini for this shape directly, but `normalizeColumnType()` in `ai.ts` re-canonicalizes every column regardless — it maps common synonyms the model still emits despite instructions (`string`→varchar, `int`→integer, `float`/`decimal`→numeric, `datetime`→timestamptz, `json`→jsonb, etc.) and anything unrecognized falls back to `text`, so the type column is never free text even when the model doesn't comply. `validateTableReferences()` cross-checks every `references` against the *other tables in the same generated schema*: if the target table is one Gemini declared but the column doesn't exist there, that's almost certainly a hallucinated column name — the reference is stripped and a warning raised. A reference to a table *not* in the schema (an existing table on the client's side, e.g. `users`) can't be verified against anything, so it's left as-is; per the prompt, those get a plain-text note instead of a `references` object, since we have no ground truth to point at. `ensurePrimaryKeys()` warns if a table has zero or more than one `primaryKey: true` column. None of this is optional/best-effort — every `dataTables` column goes through it, which is what makes the generated schema comparable across tables instead of however the model felt like phrasing it that run.

`dataModel` (free text) and `dataTables` (structured) are deliberately exclusive in the prompt: `dataModel` is now *only* for existing data the ticket reuses without change; any new entity must go in `dataTables`, never described only in prose. If the model still puts something in `dataModel` while leaving `dataTables` empty, a warning flags it for the reviewer — that combination almost always means a table got described in words but never structured.

The spec deliberately contains **no money**. `lib/budget.ts` derives cost from hours × `DEV_HOURLY_RATE` (+ `DEV_CONTINGENCY_PCT`, `DEV_CURRENCY`) at render time and the result is never stored, so changing the rate reprices every existing ticket without re-calling Gemini. Budgets are computed server-side and passed into client components as props.

`lib/pdf.ts` renders the spec to a downloadable PDF at `GET /api/tickets/[id]/prd`, using pdf-lib with the **standard** Helvetica fonts — no font files, no filesystem access, so it works unchanged in the standalone/Docker build. The tradeoff is WinAnsi encoding: all text goes through `sanitize()`, which transliterates typographic punctuation and drops anything outside Latin-1 (plus `€`/`™`). Adding a symbol to the PDF means whitelisting it there first.

### AI triage — `src/lib/ai.ts`

`analyzeRequest()` is the incident entry point and **never throws**: with no/`mock` `GEMINI_API_KEY`, or on any Gemini failure, it silently falls back to `mockAnalyze()` (keyword matching). The returned `source` field (`'gemini' | 'mock'`) is what tells you which path ran.

`analyzeDevelopmentRequest()` follows the same contract: it falls back to `mockDevelopmentSpec()` and `validateDevelopmentSpec()` clamps hours and forces `hoursMin <= hoursLikely <= hoursMax`, which the model breaks often enough to matter.

Gemini output is always passed through `validateResult()` (clamps confidence, whitelists category/priority) and then `applyBusinessPriorityPolicy()`, a hard-coded business rule that downgrades personal-hardware complaints and requires explicit outage + global-impact keywords for `critical`. The mock path applies the same policy. When changing triage behaviour, update the Spanish `SYSTEM_PROMPT` **and** the keyword lists together, or the two paths will disagree.

### Request flow

Ticket creation: `SubmitForm` → `POST /api/analyze` → `analyzeRequest()` → `createTicket()` (analysis is persisted with the ticket; it is not re-run). Listing: `/dashboard` is a client component that polls `GET /api/tickets` (interval from `NEXT_PUBLIC_TICKETS_POLL_MS`, min 5000, default 30000) with server-side pagination/filtering via `getTicketsPaged`.

### Conventions

- Pages that need the session are thin async server components that fetch data and hand it to a `*Client.tsx` component (`page.tsx` → `HomeClient`, `profile/page.tsx` → `ProfileClient`, `tickets/[id]/page.tsx` → `TicketDetailClient`). `dashboard/page.tsx` and `admin/users/page.tsx` are the exception — fully client-side, fetching through the API.
- Styling is inline `style={{}}` objects referencing CSS custom properties (`var(--bg-app)`, `var(--text-primary)`, …) defined in `src/app/globals.css`. CSS modules exist but are barely used.
- Import alias `@/*` → `src/*`.
- Route handlers that read auth use `export const dynamic = 'force-dynamic'`.
