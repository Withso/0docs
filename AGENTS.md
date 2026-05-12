# 0docs — Agent guide

pnpm workspace monorepo using TypeScript. Each package manages its own
dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (plain `pg` driver)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm run dev` — run API + web in parallel for local development
- `./install.sh` — one-shot installer for self-hosting

## zdocs Configurations design system

Visual Branding is the intended single source of truth. Each per-block field
in `blockStyles` is an *optional override*; when empty/falsy, the renderer
falls back through:

  block override → category default (e.g. `noteBg`, `codeBlockBg`) → branding token

Every color control in `BlockControls` and `SidebarControls` shows whether
the value is inherited or overridden, with a one-click reset to clear the
override. Block accordions and the Sidebar accordion open with a live
`BlockPreview` / `SidebarPreview` rendered by the real `DocBlockRenderer` so
edits update the preview in real time.

Key files:
- `artifacts/zdocs/src/components/builder/preview/BlockPreview.tsx`
- `artifacts/zdocs/src/components/builder/preview/SidebarPreview.tsx`
- `artifacts/zdocs/src/components/builder/DesignControls.tsx` — `BlockControls`,
  `SidebarControls`, `InheritableColorField`, `SectionDivider`
- `artifacts/zdocs/src/styles/global-classes.css` — `.block-preview-content`
  margin-trim rules

Phases 2 (TokenColorField + Visual Branding redesign + split-pane layout)
and 3 (Header/Footer build-out, Typography preview, code_tabs pre-color
control) are deferred follow-ups.

## zdocs Builder visual system (Mintlify "Faithful" clone)

The Builder UI follows Mintlify's 4-pane layout: project rail (224px) →
navigation tree (~228px) → optional settings side-panel → content. Tokens
in `src/styles/variables.css` drive everything via the shadcn bridge:

- Dark mode uses a **warm 30° tint** (not cool blue) — `--background: 30 6% 4%`
- `--primary` is **emerald** `160 84% 39%` (≈#10b981) in dark, `160 84% 32%`
  in light. This cascades to every shadcn `<Button>`, the rail's active row
  bar, focus rings (`--ring`), and the Monaco editor's keyword color.
- `--sidebar-accent` stays neutral so non-active rail hovers remain subtle;
  the active row is `bg-primary/10` + emerald left bar.

Builder components:
- `ProjectRail.tsx` — Workspace section (Home/Editor/Configurations/
  Analytics/Settings) plus an **Agents section** with placeholders
  (Workflows/Agent/Assistant/MCP). Placeholders use `aria-disabled` (not
  `disabled`) so they remain keyboard-focusable, and a shadcn `Tooltip`
  surfaces "Coming soon" to keyboard/screen-reader users.
- `BuilderHeader.tsx` — content-scoped header. Left: Visual/Code icon
  toggle. Right: search (wide pill at ≥lg, icon-only below lg so the
  header never overflows on narrow viewports), preview button, Publish
  (emerald). The redundant Configurations gear was removed; Configurations
  now lives only in the rail.
- **Settings-replaces-nav swap (Builder.tsx)** — Mintlify-faithful: when a
  page/group/tab settings target is opened, `SettingsSidePanel` REPLACES
  `NavigationTree` in the same left tooling column (rather than being a
  sibling that squeezes the content area). The panel widens to
  `max(sidebarWidth + 8, 320)` and its header uses a `← {label}` back
  button (no separate X) — clicking returns to the nav tree. This
  prevents the 4-pane squeeze where content collapsed to ~200px and
  cards/video/header overflowed.
- `CodeView.tsx` — Monaco uses custom `zdocs-dark`/`zdocs-light` themes
  registered via `beforeMount`, mirroring the warm bg + emerald accents.
  A `MutationObserver` on `[data-theme]` keeps the editor in sync with
  app theme toggles.
- All custom buttons (rail items, view toggle, preview-shell icons) carry
  `focus-visible:ring-2 focus-visible:ring-ring` for a11y.

## Routing (zdocs)

- `/` → `pages/Landing.tsx` — marketing landing (hero, feature trio, footer).
  "Documentation" / "Learn more" buttons → `/docs`. "Sign In" / "Get started"
  → `/auth`.
- `/docs` → `pages/Index.tsx` — public docs viewer for the homepage project.
- `/p/:slug` → `pages/Index.tsx` — per-project public docs viewer.
- `/auth` → `pages/Auth.tsx` — email/password sign-in, sign-up, forgot-password,
  and reset-password forms.
- `/dashboard`, `/builder/:projectId`, `/settings/profile` — auth-gated app
  routes wrapped in `ProtectedRoute`.

## Authentication

0docs uses first-party email + password auth, runnable on any infrastructure
(Railway, Docker, VPS, bare metal). Sessions are server-side, stored in the
`sessions` table, and identified by an `sid` cookie (HttpOnly, SameSite=Lax,
Secure in production).

Code layout (`artifacts/api-server/src/lib/auth/`):
- `shared.ts` — sessions, cookies, `getSessionId`
- `routes.ts` — email/password: `/api/auth/{signup,login,logout,forgot-password,reset-password}`
- `password.ts` — scrypt hashing + password strength checks
- `ratelimit.ts` — in-memory rate limit for login / reset endpoints
- `email.ts` — optional SMTP for reset emails (falls back to `console.log`)
- `index.ts` — exports `buildAuthRouter()` which mounts `/api/auth/user`
  (current user) plus the auth provider's routes

The frontend (`artifacts/zdocs/src/contexts/AuthContext.tsx`) calls
`/api/auth/user` to hydrate the current user. `pages/Auth.tsx` renders
sign-in, sign-up, forgot-password, and reset-password forms.

DB columns supporting auth:
- `users.password_hash`, `users.is_admin`
- `password_reset_tokens` (tokenHash, userId, expiresAt, usedAt)

**Bootstrap admin:** The first user to sign up automatically becomes the
admin (`isAdmin=true`). Alternatively, set `ADMIN_EMAIL` + `ADMIN_PASSWORD`
in `.env` and run `node scripts/seed-admin.mjs` to create an admin user
non-interactively (used by `install.sh`).

**Disabling public signup:** set `DISABLE_SIGNUP=true` so only admin-
invited users can register. (The first user is still allowed through
this gate so a fresh install can complete the bootstrap.)

Self-host docs: top-level [`README.md`](./README.md) and
[`SELFHOSTING.md`](./SELFHOSTING.md). One-command install: `./install.sh`
or `pnpm run install:local`. Full stack via `docker compose up`.

## Media uploads

`POST /api/uploads` accepts raw bytes (body) plus `projectId` /
`filename` / `mimeType` query params. Returns `{ id, url }` where `url`
= `/api/uploads/<id>`. The image and video block editors use the shared
`MediaUploadButton` component (`artifacts/zdocs/src/components/builder/
MediaUploadButton.tsx`).

Storage adapters live in `artifacts/api-server/src/lib/storage/`:
- `postgres.ts` (default) — bytes go into `media_blobs` table.
- `s3.ts` — bytes go to an S3-compatible bucket (AWS / R2 / B2 / MinIO).
  Loaded lazily so the SDK isn't paid for unless `STORAGE_BACKEND=s3`.

Metadata for every asset is in `media_assets` (project + filename +
mime + size + storage backend + storage key). Reads check that the
caller owns the project OR the project has an active published version
(public assets are served with `Cache-Control: public, max-age=1y`).

## Single-service deployment

In production the api-server serves both `/api/*` and the built
frontend's static files (`dist/public/`) on a single port. `app.ts`
resolves the frontend dist via:
1. `WEB_DIST_DIR` env (escape hatch).
2. `<api-dist>/public` (Dockerfile copies frontend here).
3. `artifacts/zdocs/dist/public` (monorepo source layout).

If none exist (dev mode), the api skips static serving and the Vite dev
server handles the frontend with a `/api` proxy back to the api-server.

`app.set('trust proxy', 1)` is required for HTTPS-Secure cookies to
work behind Railway / nginx / Caddy. Healthcheck: `GET /api/healthz`.

## Public docs viewer (zdocs Index.tsx)

The public viewer at `/docs` reads:
- `GET /api/projects?homepage=true` for the project marked `is_homepage`
- `GET /api/tabs?projectId=…` (public when project is published; same gating
  pattern as `/api/pages` and `/api/navgroups`)
- `GET /api/projects/:id/published-versions` then the snapshot endpoint
When no homepage project exists, Index renders a small "No docs published
yet" placeholder (the marketing fallback was extracted to `Landing.tsx`).

Tabs render as Mintlify-style pills in the header. Default selection is the
first **visible** tab. The sidebar (`DocSidebarNavMintlify`) filters nav
groups by `activeTabId`; pages without a tab show only when no tab is
active. Active page resets via a `filteredPageIdsKey` effect when membership
changes.

## Activity feed publisher names

`/api/versions` and `/api/projects/:id/published-versions` batch-look up
profile display names with `inArray(profilesTable.id, ids)` and append
`{ publisherName, pagesCount, sectionsCount, blocksCount }` to each row.
ProjectHome's activity feed renders these directly.

## Atomic publish/revert

`POST /api/projects/:id/published-versions` and the revert endpoint run
inside `db.transaction(async (tx) => { … })`. Deactivate-old, insert-new,
and update-project-pointer happen in one transaction so partial failures
cannot leave the project pointing at a non-existent or inactive version.
