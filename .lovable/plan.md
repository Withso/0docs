

# 0docs Product Vision & Mintlify Parity Plan

## Research Summary

### Mintlify Feature Map (from screenshots + web knowledge)

**Per-project sidebar (vertical icon rail):**
- Home, Editor, Analytics, Settings (+ Agents section: Agent, Assistant, Workflows, MCP — *deferred per user*)
- Collapse toggle at bottom
- Workspace switcher at top

**Editor inner panel (the core experience):**
- Two tabs: **Navigation** | **Files**
- Top toolbar: Preview/Code toggle, Branch selector, Comments, Search (⌘K), Run/Preview, Publish button
- Right side: contextual editor (visual or raw .mdx code view via Monaco)

**Navigation tab features:**
- Tree of: Documentation tab, Blog tab, Guides, nested Groups (folders), Pages
- Add menu: Tab / Wrap with Dropdown / Language / Product / Version
- Per-group settings panel: Title, Icon, Hidden, Tag, Expanded, OpenAPI spec, AsyncAPI spec
- Per-page settings panel: Title, Slug, External URL, Description, Icon, Sidebar title, OG Image URL, Tag, Keywords, Mode, File path

**Files tab features:**
- File explorer mirroring repo structure (mdx, json, svg, snippets/, images/, logo/)
- `.mintignore`, `docs.json` config, `AGENTS.md`, `CONTRIBUTING.md`
- Click file → opens settings or content editor

**Configurations panel (bottom-left):**
- Overview, Visual Branding (theme + primary/light/dark colors, logos, simple/advanced), Typography, Header & Topbar, Footer, Content Features, Assistant & Search, Integrations, API Documentation, Advanced

**Branch / Git workflow:**
- Branch dropdown ("main" + "Create new branch")
- Commit dialog with comment thread
- Code view (Monaco-style raw .mdx editor with frontmatter)

**Other Mintlify capabilities:**
- OpenAPI/AsyncAPI auto-generated reference, MDX components, snippets, multi-version docs, multi-language, search, AI assistant, analytics, custom domain, deploy preview per branch.

### Current 0docs State

- React+Vite SPA, Supabase backend (auth, postgres, edge functions, storage)
- Builder uses tab-based mode switcher (`editor | design | settings | publish`) in `BuilderHeader`
- `BuilderSidebar` shows pages + nav groups with drag-drop
- Publishing flow → GitHub repo (docs-as-code) via `publish-to-github` edge function
- Already has: design tokens system, versioning (`doc_versions`), OpenAPI import, design panel, AI ask-docs

### Self-Hosting Research

Mintlify is **closed-source**. Open-source competitors that self-host: Docusaurus, Nextra, Starlight, Fumadocs — but none are visual builders. **Opportunity: 0docs becomes the first OSS visual Mintlify alternative.**

For self-hosting on Railway, we need:
1. **Decouple from Lovable Cloud / hosted Supabase** — support self-hosted Supabase OR a portable Postgres + minimal API.
2. **Containerization** — Dockerfile for the Vite frontend (served via nginx or a tiny Node static server).
3. **Edge functions → portable runtime** — port the 4 edge functions to either Deno Deploy-compatible standalone or a small Hono/Express service.
4. **Environment-driven config** — all Supabase URLs/keys via env vars at runtime (currently bundled at build time).
5. **Migrations bundled** — SQL migrations runnable against any Postgres.
6. **One-click templates** — Railway template (`railway.json` + `Dockerfile`), plus Render blueprint, Coolify, Docker Compose.

---

## Proposed Architecture

### New Per-Project Sidebar (vertical rail)

```text
┌────┬─────────────────────┬──────────────────────────┐
│ 🏠 │  [Nav | Files]      │                          │
│ ✏️ │  ─────────────      │   Content Editor         │
│ 📊 │  Documentation      │   (visual or code)       │
│ ⚙️ │  Blog               │                          │
│    │  ▾ Guides           │                          │
│    │    Getting started  │                          │
│    │    Quickstart       │                          │
│    │  ▾ Customization    │                          │
│    │    Global Settings  │                          │
│    │                     │                          │
│    │  Configurations ⚙️  │                          │
└────┴─────────────────────┴──────────────────────────┘
```

- **Rail icons**: Home (→ dashboard), Editor, Analytics, Settings
- **Editor mode** = current builder + new Files tab + Configurations entry
- **Configurations** opens a full-width settings view with Mintlify's left-panel categories (Visual Branding, Typography, Header & Topbar, Footer, Content Features, Assistant & Search, Integrations, API Documentation, Advanced) — replaces the current Design tab's flat structure

### Phased Roadmap

**Phase 0 — Vision doc & restructure (this phase)**
- Create `product-vision.md` at repo root capturing positioning, OSS commitment, roadmap
- No code changes yet

**Phase 1 — Per-project sidebar + Nav/Files split**
- New `ProjectRail` component (icon column) wrapping Builder
- New `FilesPanel` component (file-explorer view of project: pages as `.mdx`, snippets, images, `docs.json`)
- Move Editor / Design / Settings / Publish into rail items
- Keep current `BuilderSidebar` as the Navigation tab content

**Phase 2 — Configurations panel (Mintlify parity)**
- Restructure DesignPanel into 10 categories matching Mintlify
- Add per-page settings panel (currently uses inline SEO floating panel) → expand to: External URL, Sidebar title, OG Image, Keywords, Mode, Tag, File path display
- Add per-group settings panel: Hidden toggle, Tag, Expanded default, OpenAPI/AsyncAPI binding

**Phase 3 — Code view + Branches**
- Add Monaco-based raw MDX editor toggle (Preview ↔ Code icons in header)
- Branch selector UI; map to GitHub branches via existing `publish-to-github` function (extend to read branches, create branches, switch context)
- Commits/comments thread per branch

**Phase 4 — Nav primitives parity**
- Add menu: Tab, Dropdown wrap, Language wrap, Product wrap, Version wrap (Version exists; others new)
- Hidden pages, Tags on pages/groups, External URL pages, Expanded default

**Phase 5 — Self-hostable architecture (OSS pivot)**
- **Runtime config**: Replace build-time `VITE_SUPABASE_*` with `/config.json` fetched at boot; allow operator to point at any Supabase instance
- **Dockerfile** for frontend (multi-stage: build → nginx alpine)
- **Edge functions → Deno standalone service** (`/server` directory, runs as separate Railway service, or via `supabase functions serve` mode)
- **Migration runner**: ship `supabase/migrations/*.sql` + a `bootstrap.sh` that runs them against any Postgres
- **Railway template**: `railway.json` defining 3 services (frontend, functions, postgres) + supabase-self-hosted compose alternative
- **Docs**: `SELF_HOSTING.md`, `DEPLOY_RAILWAY.md`, `DEPLOY_DOCKER.md`
- **License**: add `LICENSE` (MIT or AGPL — to confirm with user)

Status: implemented frontend/runtime/container/docs scaffolding. License decision remains open for Phase 6/OSS hardening.

**Phase 6 — OSS hardening**
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, GitHub Actions CI (lint, test, build, docker build)
- Replace any Lovable-Cloud-only assumptions in code with abstractions
- Optional: pluggable auth (allow disabling Google sign-in, supporting GitHub OAuth, magic links only)

**Phase 7 — Mintlify advanced parity**
- AsyncAPI support, multi-language docs, deploy previews per branch, advanced search (Algolia/Meilisearch pluggable), AI assistant configurability

---

## Deliverables for THIS plan execution

1. `product-vision.md` (repo root) — positioning, OSS commitment, target users (devs, devtool startups, open-source maintainers), differentiators vs Mintlify (visual, OSS, self-hostable), full phased roadmap, success metrics, license decision placeholder
2. Update `.lovable/memory/index.md` to record the OSS + self-hosting pivot

No application code is changed in this step — we lock the vision first, then implement Phase 1 in the next message.

## Open Questions Before Phase 1

1. **License**: MIT (max adoption) vs AGPL (forces SaaS forks to open-source)?
2. **Self-host backend strategy**: bundle self-hosted Supabase (heavy but feature-complete) vs build a minimal Hono+Postgres API (lighter, more work)?
3. **Keep hosted SaaS at docs0.lovable.app alongside OSS, or pure OSS?**

