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

Clients are existing customers, so the development form never asks them about their stack — we already know it. `lib/project-context.ts` resolves it per project name from `DEV_PROJECT_STACKS` (a JSON map) with a `DEV_DEFAULT_STACK` fallback, and the API injects it into the brief server-side. A `stack` sent in the request body is ignored by design, so a client cannot spoof it. The prompt labels that block as internal verified fact and forbids the model from raising stack questions in `openQuestions`.

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
