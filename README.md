<div align="center">

# 0docs

**Open-source, self-hostable docs platform — block-based editor, themable design system, versioning, and "Ask docs" AI built in.**

[![Website](https://img.shields.io/badge/website-0docs.dev-3B82F6?style=flat-square)](https://0docs.dev)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Self-host](https://img.shields.io/badge/self--host-one_command-3B82F6?style=flat-square)](#quick-start)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-3B82F6?style=flat-square)](#contributing)

[Website](https://0docs.dev) · [Self-hosting guide](./SELFHOSTING.md) · [MCP server](./artifacts/api-server/MCP.md)

</div>

---

0docs is a Mintlify-style documentation builder. You write docs as pages →
sections → blocks (paragraphs, code, callouts, tabs, cards, steps, API
endpoints, etc), branch to draft changes, publish atomic versions, and ship
a public docs site at a free URL or your own domain. AI-powered "Ask docs"
answers questions over the content of your published version.

This repository is a **pnpm monorepo** containing the API server, the web
app, shared libraries, and everything you need to run the whole product on
your own infrastructure.

---

## Quick start

Pick whichever path fits your setup:

### 1. Deploy on Railway (one click)

> The "Deploy on Railway" button + template arrive in the next release.
> Until then, follow the [manual Railway recipe in `SELFHOSTING.md`](./SELFHOSTING.md#deploying-on-railway).

Railway provisions Postgres for you, exposes `$PORT`, and points
`DATABASE_URL` at the database automatically. Set `SESSION_SECRET`,
optionally `ADMIN_EMAIL` + `ADMIN_PASSWORD`, and deploy.

### 2. Local install (Docker + pnpm)

You'll need:

- **Node.js 20+** and **pnpm** (corepack enables this for you).
- **Docker** with Docker Compose, OR your own Postgres 14+ instance.

Then:

```bash
git clone https://github.com/Withso/0docs.git
cd 0docs
./install.sh         # one command: installs, migrates, seeds admin, boots
```

`install.sh` finishes by exec-ing `pnpm run dev`, so the API + web are
running by the time you read the URL it prints. Open the printed URL.

If you set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before running
`install.sh`, that account is seeded as the admin. Otherwise the first
user that signs up via the web UI becomes the admin.

> Running unattended / in CI? Pass `--no-start` (or set `CI=1`) to do
> setup only, then start the stack later with `pnpm run dev` or
> `docker compose up`.

`install.sh` is **idempotent** — re-running it is safe and skips work
that's already been done. It will:

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

### 3. Run the whole stack in containers

If you'd rather not have Node on your host:

```bash
./install.sh           # still needed for .env / SESSION_SECRET
docker compose up
```

This builds the API server and web app images and runs Postgres + API +
web together. Put a reverse proxy in front for HTTPS — see
[`SELFHOSTING.md`](./SELFHOSTING.md).

### 4. Bring your own Postgres

Edit `DATABASE_URL` in `.env` to point at your own Postgres instance, then
run `./install.sh`. The installer skips the docker step when `docker`
isn't on `PATH`. Either way, the schema is pushed via `pnpm --filter
@workspace/db run push`.

---

## MCP server for AI agents

0docs ships a built-in **Model Context Protocol** endpoint at `POST /api/mcp`
so AI agents (Claude Desktop, Cursor, Continue, custom clients) can read and
edit your docs. Mint a per-project access token under **Settings → MCP Server**,
or run the server in anonymous read-only mode. See
[`artifacts/api-server/MCP.md`](./artifacts/api-server/MCP.md) for the full
tool catalog, auth modes, and environment defaults
(`MCP_ENABLED`, `MCP_ALLOW_ANONYMOUS`, `MCP_DISABLED_TOOLS`).

---

## Authentication

0docs ships with first-party email + password auth, runnable on any
infrastructure. Sessions are server-side, stored in the `sessions` table,
identified by an HttpOnly `sid` cookie.

- The **first user** to sign up automatically becomes the admin.
- Alternatively, set `ADMIN_EMAIL` + `ADMIN_PASSWORD` in `.env` and the
  installer seeds the admin user for you.
- Once your team has accounts, set `DISABLE_SIGNUP=true` to lock down
  public signup. (The first user is still allowed through so a fresh
  install can complete bootstrap.)
- Optional SMTP for password-reset emails (`SMTP_URL` / `SMTP_FROM`).
  Without SMTP, reset links are printed to the server console.

---

## Architecture

```
0docs/
├── artifacts/
│   ├── api-server/     Express 5 API. Routes under /api.
│   │   └── src/lib/auth/  Email + password sessions.
│   ├── zdocs/          React + Vite web app (editor + public viewer).
│   └── mockup-sandbox/ Internal design playground (not user-facing).
├── lib/
│   ├── db/             Drizzle ORM schema + Postgres pool + auto-migrator.
│   │   ├── drizzle/        Versioned SQL migrations (run on every API boot).
│   │   └── src/migrate.ts  Idempotent migration runner.
│   ├── api-spec/       OpenAPI source-of-truth.
│   ├── api-zod/        Zod schemas + types generated from the OpenAPI spec.
│   └── api-client-react/  React Query hooks generated by Orval.
├── scripts/            Workspace scripts (admin seeder etc).
├── docker-compose.yml  Postgres + API + web.
├── Dockerfile          Multi-stage: api / web targets.
├── install.sh          One-command self-host installer.
└── .env.example        Documented environment variables.
```

---

## Environment variables

See [`.env.example`](./.env.example) for the full list with comments. The
most-used ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Required. |
| `SESSION_SECRET` | Random 64+ char string. Generated by `install.sh`. Required. |
| `PORT` | API server port. Defaults to 8081. Railway provides this. |
| `ADMIN_EMAIL` | Bootstrap admin email. First signup with this email becomes admin. |
| `ADMIN_PASSWORD` | When set with `ADMIN_EMAIL`, `install.sh` seeds the admin user directly. |
| `DISABLE_SIGNUP` | Set to `true` to disable public signup once your team is in. |
| `OPENAI_API_KEY` | Powers the "Ask docs" feature. Optional. |
| `OPENAI_BASE_URL` | Override the OpenAI base URL (e.g. for self-hosted Llama via an OpenAI-compatible API). |
| `SMTP_URL`, `SMTP_FROM` | Optional SMTP for password-reset emails. Without these, reset links are printed to the server console. |
| `CORS_ALLOWLIST` | Comma-separated origins to allow in production. |

---

## Useful commands

```bash
# Local install (idempotent)
./install.sh
pnpm run install:local         # alias for install.sh

# Run API + web in dev (requires .env from install.sh)
pnpm run dev

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

---

## Production notes

For production deployments — Railway, reverse proxy, HTTPS, backups, SMTP,
S3 storage — see [`SELFHOSTING.md`](./SELFHOSTING.md).

---

## Contributing

1. Fork the repo and create a branch.
2. Run `./install.sh` and `pnpm run dev` to get the stack up.
3. Make your change.
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

## License

MIT.
