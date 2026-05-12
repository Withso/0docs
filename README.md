# 0docs

> **Docs that are open, powerful, and yours.** An open-source, self-hostable
> documentation platform with a visual block-based editor, version
> publishing, branching, and an "Ask docs" AI feature.

**🌐 Website:** [0docs.dev](https://0docs.dev) · **📦 GitHub:** [Withso/0docs](https://github.com/Withso/0docs) · **📜 License:** MIT

0docs is a Mintlify-grade documentation builder you can run on your own
infrastructure for free. You write docs as pages → sections → blocks
(paragraphs, code, callouts, steps, tabs, cards, API endpoints, and more),
branch to draft changes, publish atomic versions, and ship a public docs
site at a free URL or your own domain. AI-powered "Ask docs" answers
questions over the content of your published version, and a built-in MCP
server lets AI agents read and edit your docs directly.

This repository is a **pnpm monorepo** containing the API server, the web
app, shared libraries, and everything you need to run the whole product on
your own infrastructure.

## Highlights

- 🧩 **Block-based visual editor** — paragraphs, headings, callouts, steps, code blocks, tabs, accordions, cards, API endpoints, tables, and more.
- 🎨 **Themable design system** — visual branding cascades to every block; per-block overrides when you need them.
- 🔀 **Branching & atomic publishing** — draft on a branch, snapshot a version, ship; full version history and one-click revert.
- 🌍 **Custom domains** — bring your own domain or use the free `*.0docs.dev` URL.
- 🤖 **Ask docs (AI)** — readers can ask questions answered from your published content.
- 🔌 **MCP server** — AI agents (Claude Desktop, Cursor, Continue, custom clients) can read & edit docs over the Model Context Protocol.
- 🔐 **Two auth modes** — email + password (self-host) or Replit OIDC (hosted demo); switch with one env var.
- 📦 **One-command install** — `./install.sh` boots Postgres, applies migrations, seeds an admin, and starts the stack.

---

## MCP server for AI agents

0docs ships a built-in **Model Context Protocol** endpoint at `POST /api/mcp`
so AI agents (Claude Desktop, Cursor, Continue, custom clients) can read and
edit your docs. Mint a per-project access token under **Settings → MCP Server**,
or run the server in anonymous read-only mode. See
[`artifacts/api-server/MCP.md`](./artifacts/api-server/MCP.md) for the full
tool catalog, auth modes, and environment defaults
(`MCP_ENABLED`, `MCP_ALLOW_ANONYMOUS`, `MCP_DISABLED_TOOLS`).

## Two ways to run it

| Mode | When to use it | Auth |
|---|---|---|
| **Self-hosted** (default for the OSS release) | You want to run 0docs on your own machine, server, or VPS. | Email + password, with optional SMTP-based password reset. |
| **Replit-hosted demo** | You want to play with the hosted demo, or you're a Replit user who wants Replit Auth. | Replit OIDC (Sign in with Replit). |

A single environment variable selects the mode at boot:

```bash
AUTH_MODE=selfhost   # email + password (default for self-hosters)
AUTH_MODE=replit     # Replit OIDC (default in the Replit container)
```

The frontend reads the active mode from `GET /api/auth/config` and renders
the correct sign-in UI automatically. The rest of the codebase never
branches on the mode — see [Architecture](#architecture).

---

## Quick start (self-hosted)

You'll need:

- **Node.js 20+** and **pnpm** (corepack enables this for you).
- **Docker** with Docker Compose, OR your own Postgres 14+ instance.

Then:

```bash
git clone https://github.com/Withso/0docs.git
cd 0docs
./install.sh         # one command: installs, migrates, seeds admin, boots
```

That's it. `install.sh` finishes by exec-ing `pnpm run selfhost:dev`, so
the API + web are running by the time you read the URL it prints. Open
http://localhost:8080.

If you set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before running
`install.sh`, that account is seeded as the admin. Otherwise the first
user that signs up via the web UI becomes the admin.

> Running unattended / in CI? Pass `--no-start` (or set `CI=1`) to do
> setup only, then start the stack later with `pnpm run selfhost:dev` or
> `docker compose up`.

`install.sh` is **idempotent** — re-running it is safe and skips work that's
already been done. It will:

1. Verify Node and pnpm are installed.
2. Copy `.env.example` → `.env` (if missing) and generate a fresh `SESSION_SECRET`.
3. Start Postgres via `docker compose` (or skip if you've pointed `DATABASE_URL`
   elsewhere).
4. Install dependencies and push the Drizzle schema to the database.
5. Seed the admin user from `ADMIN_EMAIL` + `ADMIN_PASSWORD` (or skip,
   in which case the first signup wins).
6. Boot the API + web (unless `--no-start` / `CI=1`).

> **Migrations run on every boot.** The API server calls `runMigrations()`
> before `app.listen`, so any pending SQL files in `lib/db/drizzle/` are
> applied automatically. The runner is idempotent (it converts
> `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX` →
> `CREATE INDEX IF NOT EXISTS`, and adds missing columns via
> `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), so partially-applied or
> drifted databases converge to the desired schema instead of failing.
> Applied migrations are recorded in `drizzle.__drizzle_migrations`,
> making repeated boots no-ops.

### Run the whole stack in containers

If you'd rather not have Node on your host:

```bash
./install.sh           # still needed for .env / SESSION_SECRET
docker compose up
```

This builds the API server and web app images and runs Postgres + API + web
together. The web app is served on `WEB_PORT` (default 8080), the API on
`API_PORT` (default 8081). Put a reverse proxy in front of both for HTTPS —
see [`SELFHOSTING.md`](./SELFHOSTING.md).

### Bring your own Postgres

Edit `DATABASE_URL` in `.env` to point at your own Postgres instance, then
run `./install.sh`. The installer skips the docker step when `docker`
isn't on `PATH`. Either way, the schema is pushed via `pnpm --filter
@workspace/db run push`.

---

## Architecture

```
0docs/
├── artifacts/
│   ├── api-server/     Express 5 API. Routes under /api.
│   │   └── src/lib/auth/
│   │       ├── shared.ts        Sessions, cookies, getSessionId.
│   │       ├── types.ts         AuthProvider interface + getAuthMode().
│   │       ├── replit/          Replit OIDC implementation.
│   │       └── selfhost/        Email + password implementation.
│   ├── zdocs/          React + Vite web app (the editor + public viewer).
│   └── mockup-sandbox/ Internal design playground (not user-facing).
├── lib/
│   ├── db/             Drizzle ORM schema + Postgres pool + auto-migrator.
│   │   ├── drizzle/        Versioned SQL migrations (run on every API boot).
│   │   └── src/migrate.ts  Idempotent migration runner.
│   ├── api-spec/       OpenAPI source-of-truth.
│   ├── api-zod/        Zod schemas + types generated from the OpenAPI spec.
│   ├── api-client-react/  React Query hooks generated by Orval.
│   └── replit-auth-web/   Tiny `useAuth()` for legacy callers (delegates
│                          to /api/auth/user).
├── scripts/            Workspace scripts (post-merge hook etc).
├── docker-compose.yml  Postgres + (optional) API + web.
├── Dockerfile          Multi-stage: api / web targets.
├── install.sh          One-command self-host installer.
└── .env.example        Documented environment variables.
```

### How auth is partitioned

The server defines a small `AuthProvider` interface in
`artifacts/api-server/src/lib/auth/types.ts`:

```ts
interface AuthProvider {
  mode: "replit" | "selfhost";
  router: IRouter;                  // mounted under /api
  refreshSession?: (...) => ...;    // hook called by authMiddleware
  publicConfig: () => Record<string, unknown>;  // /api/auth/config payload
}
```

Both implementations live behind it:

- `lib/auth/replit/` — OIDC: `GET /api/login` → IdP → `GET /api/callback`,
  `GET /api/logout`, plus the mobile-auth token-exchange endpoint.
- `lib/auth/selfhost/` — email + password: `POST /api/auth/signup`,
  `POST /api/auth/login`, `POST /api/auth/logout` (and `GET /api/logout`),
  `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.

`getAuthMode()` reads `AUTH_MODE` once at boot and exports the right
provider as `provider`. `authMiddleware` calls `provider.refreshSession`
without caring which mode is active. New features added later
automatically work in both modes because they only ever depend on
`req.user` and the shared session helpers in `lib/auth/shared.ts`.

The frontend (`artifacts/zdocs/src/contexts/AuthContext.tsx`) calls
`GET /api/auth/config` once on mount and renders `pages/Auth.tsx` (forms)
or auto-redirects to `/api/login` (Replit OIDC) based on the result.

---

## Environment variables

See [`.env.example`](./.env.example) for the full list with comments. The
most-used ones:

| Variable | Purpose |
|---|---|
| `AUTH_MODE` | `selfhost` (email + password) or `replit` (OIDC). Default `replit`. |
| `DATABASE_URL` | Postgres connection string. |
| `SHARED_DATABASE_URL` | Optional override; takes precedence over `DATABASE_URL` so a deployment can share the dev database. |
| `SESSION_SECRET` | Random 64+ char string. Generated by `install.sh`. |
| `ADMIN_EMAIL` | Self-host: email that should be marked admin on signup. |
| `SELFHOST_DISABLE_SIGNUP` | Set to `true` to disable public signup once your team is in. |
| `OPENAI_API_KEY` | Powers the "Ask docs" feature. Optional. |
| `SMTP_URL`, `SMTP_FROM` | Optional SMTP for password-reset emails. Without these, reset links are printed to the server console. |
| `CORS_ALLOWLIST` | Comma-separated extra origins to allow in production. |
| `REPL_ID`, `ISSUER_URL` | Replit-mode only. Set by the Replit container. |

---

## Useful commands

```bash
# Self-host one-shot install (idempotent)
./install.sh
pnpm run selfhost              # alias for install.sh

# Run API + web in dev (requires .env from install.sh)
pnpm run selfhost:dev

# Type-check the whole monorepo
pnpm run typecheck

# Build everything
pnpm run build

# Apply migrations manually (the API server also does this on every boot)
pnpm --filter @workspace/db run migrate

# Generate a new SQL migration after editing lib/db/src/schema/
pnpm --filter @workspace/db run generate

# Ad-hoc dev push (bypasses the migration journal — for prototyping only)
pnpm --filter @workspace/db run push

# Run only the API server
pnpm --filter @workspace/api-server run dev

# Run only the web app
pnpm --filter @workspace/zdocs run dev
```

---

## Upgrading

```bash
git pull
pnpm install
# restart your services — migrations run on the next API boot
```

If you're using the Docker Compose stack:

```bash
git pull
docker compose build
docker compose up -d
```

The API container runs `runMigrations()` on startup, so any new SQL files
in `lib/db/drizzle/` are applied automatically against your `DATABASE_URL`
the next time the container boots. **Take a backup before upgrading** if
your data matters — the runner is idempotent and additive, but schema
changes are still schema changes.

If you'd rather apply migrations manually (e.g. to inspect them first):

```bash
pnpm --filter @workspace/db run migrate    # standalone CLI runner
# or, for ad-hoc dev pushes that bypass the migration table:
pnpm --filter @workspace/db run push
```

---

## Production notes

For production deployments — reverse proxy, HTTPS, backups, SMTP, and the
current limits around object storage — see
[`SELFHOSTING.md`](./SELFHOSTING.md).

---

## Contributing

1. Fork the repo and create a branch.
2. Run `./install.sh` and `pnpm run selfhost:dev` to get the stack up.
3. Make your change. Keep auth-mode-specific code inside `lib/auth/replit/`
   or `lib/auth/selfhost/` — never branch on `process.env.AUTH_MODE`
   outside those folders.
4. Run `pnpm run typecheck` and `pnpm run build`.
5. Open a pull request describing the change and how you tested it.

The codebase follows a small set of conventions:

- Express routes are grouped per resource in
  `artifacts/api-server/src/routes/`.
- Drizzle schema is the source of truth for shape; OpenAPI (`lib/api-spec`)
  is the contract for what the API exposes.
- Frontend talks to the API exclusively via the generated React Query
  hooks in `lib/api-client-react`.

---

## Links

- 🌐 Website / hosted demo: **[0docs.dev](https://0docs.dev)**
- 📦 Source: **[github.com/Withso/0docs](https://github.com/Withso/0docs)**
- 📖 Self-hosting guide: [`SELFHOSTING.md`](./SELFHOSTING.md)
- 🤖 MCP server reference: [`artifacts/api-server/MCP.md`](./artifacts/api-server/MCP.md)

---

## License

MIT — see [`LICENSE`](./LICENSE) (or assume MIT if the file is absent; the
project is released under the standard MIT terms).
