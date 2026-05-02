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

- Replit Auth (OIDC) end-to-end. No Clerk anywhere.
- Server: `artifacts/api-server/src/lib/auth.ts` runs the OIDC handshake;
  `middlewares/authMiddleware.ts` populates `req.user` from the session;
  `middlewares/requireAuth.ts` is the gate for write routes.
- Client: `lib/replit-auth-web` exposes `useReplitAuth()`; `AuthContext.tsx`
  wraps it and `lib/api-client.ts` sends `credentials: "include"` so cookies
  carry the session.
- Mixed-auth read endpoints (`projects`, `sections`, `blocks`, `navgroups`,
  `versions`) gate on "is the project published, OR is the caller the owner?".

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
