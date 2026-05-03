# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

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
- `/auth` → `pages/Auth.tsx` — single "Log in to continue" button that hits
  `GET /api/login` (Replit OIDC).
- `/dashboard`, `/builder/:projectId`, `/settings/profile` — auth-gated app
  routes wrapped in `ProtectedRoute`.

## Authentication

0docs supports two auth modes selected by the `AUTH_MODE` env var
(default `replit` so the Replit-hosted demo keeps working unchanged):

- `AUTH_MODE=replit`   — OIDC flow against `replit.com/oidc`.
- `AUTH_MODE=selfhost` — email + password, runnable on any infra.

Both implementations live behind a tiny `AuthProvider` interface
(`artifacts/api-server/src/lib/auth/types.ts`). Code partitioning:

- `lib/auth/shared.ts` — sessions, cookies, `getSessionId`. Shared.
- `lib/auth/replit/` — OIDC config + `/api/login`, `/api/callback`,
  `/api/logout`, mobile token-exchange.
- `lib/auth/selfhost/` — email/password: `/api/auth/{signup,login,
  logout,forgot-password,reset-password}`, scrypt hashing
  (`password.ts`), in-memory rate limit (`ratelimit.ts`), optional
  SMTP for reset emails (`email.ts`, falls back to console.log).
- `lib/auth/index.ts` picks the active provider at boot and exports
  `buildAuthRouter()` which mounts `/api/auth/user` (current user) and
  `/api/auth/config` (mode hint for the frontend) plus the active
  provider's routes.

The frontend (`artifacts/zdocs/src/contexts/AuthContext.tsx`) reads
`/api/auth/config` once on mount. `pages/Auth.tsx` renders sign-in,
sign-up, forgot-password, and reset-password forms in selfhost mode and
auto-redirects to `/api/login` in replit mode. The rest of the app only
touches `useAuth()` so new features automatically work in both modes.

DB additions for selfhost: `users.password_hash`, `users.is_admin`, and
the `password_reset_tokens` table — all nullable/default so the existing
Replit data is unaffected.

Self-host docs: top-level [`README.md`](./README.md) and
[`SELFHOSTING.md`](./SELFHOSTING.md). One-command install: `./install.sh`
or `pnpm run selfhost`. Full stack via `docker compose up`.

## Shared dev/prod database

`lib/db/src/index.ts` prefers `SHARED_DATABASE_URL` over the auto-provisioned
`DATABASE_URL`. Setting `SHARED_DATABASE_URL` to the dev connection string
makes the deployed app read/write the same data as development, so the user
sees one consistent dataset across environments.

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
