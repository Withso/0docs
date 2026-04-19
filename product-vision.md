# 0docs — Product Vision

> The first **open-source, self-hostable, visual** alternative to Mintlify.

---

## 1. Positioning

**0docs** is a visual documentation builder for product and engineering teams. It combines the
WYSIWYG editing experience of Notion/Mintlify with the docs-as-code workflow of Docusaurus —
without forcing teams to choose between visual editing and Git-based ownership.

Unlike Mintlify (closed-source, hosted-only), 0docs is **fully open-source** and can be
**self-hosted in one click** on Railway, Render, Coolify, Docker, or any Postgres-compatible
infrastructure. Teams keep their content in their own GitHub repository and their data in their
own database.

### Tagline options
- "Mintlify, but open."
- "The visual docs builder you can self-host."
- "Beautiful docs. Yours to own."

---

## 2. Target Users

| Segment | Why they pick 0docs |
|---|---|
| **Devtool startups** | Need Mintlify-quality docs without the per-seat pricing or vendor lock-in. |
| **Open-source maintainers** | Want a free, self-hostable docs site with a visual editor non-developers can use. |
| **Enterprises with compliance needs** | Must keep docs and analytics inside their own VPC / on-prem. |
| **Agencies & freelancers** | Build docs sites for many clients; pay-per-project or self-hosted is cheaper than per-seat SaaS. |
| **Solo developers** | Want a polished docs site without writing MDX by hand. |

---

## 3. Differentiators vs Mintlify

| Capability | Mintlify | 0docs |
|---|---|---|
| Visual WYSIWYG editor | ✅ | ✅ |
| Docs-as-code (Git sync) | ✅ | ✅ |
| OpenAPI / API reference | ✅ | ✅ (in progress) |
| Multi-version docs | ✅ | ✅ |
| AI assistant | ✅ | ✅ (Lovable AI) |
| **Open source** | ❌ | ✅ |
| **Self-hostable** | ❌ | ✅ (Railway / Docker / Coolify) |
| **Own your database** | ❌ | ✅ |
| **No per-seat pricing** | ❌ ($150+/mo) | ✅ (free when self-hosted) |
| Custom blocks (HTML/CSS/JS) | Limited (MDX components) | ✅ planned (sandboxed iframe) |
| MCP integration | ✅ | ✅ planned |
| Real-time collaboration | ✅ | 🟡 planned (Yjs + Supabase Realtime) |

---

## 4. Architecture Pillars

1. **Visual-first, code-equivalent.** Every visual edit produces the same `.mdx` files a
   developer would write by hand. Switch to Code view at any time.
2. **Docs-as-code by default.** Source of truth is the user's GitHub repo. The database is a
   cache + collaboration layer.
3. **Portable runtime.** Frontend = static SPA. Backend = Postgres + a small set of edge
   functions that run on any Deno/Node host.
4. **Bring-your-own-everything.** Your DB, your storage, your domain, your AI key. Sensible
   defaults via Lovable Cloud for the hosted SaaS; full control when self-hosted.
5. **Plugin-friendly.** Block types, auth providers, search backends, and AI providers are
   pluggable.

---

## 5. Phased Roadmap

### Phase 0 — Vision & restructure *(this commit)*
- `product-vision.md` (this file).
- Memory updated.

### Phase 1 — Per-project sidebar + Nav/Files split
- New vertical icon rail (Home, Editor, Analytics, Settings).
- Editor splits into **Navigation** | **Files** tabs.
- Move Editor / Design / Settings / Publish from top tabs into the rail.

### Phase 2 — Configurations panel (Mintlify parity)
- Restructure Design panel into 10 categories: Overview, Visual Branding, Typography,
  Header & Topbar, Footer, Content Features, Assistant & Search, Integrations,
  API Documentation, Advanced.
- Per-page settings (External URL, Sidebar title, OG Image, Keywords, Mode, Tag, File path).
- Per-group settings (Hidden, Tag, Expanded default, OpenAPI/AsyncAPI binding).

### Phase 3 — Code view + Branches
- Monaco-based raw `.mdx` editor toggle.
- Branch selector wired to GitHub (read/create/switch).
- Per-branch commit + comment thread.

### Phase 4 — Nav primitives parity
- Add menu: Tab, Dropdown, Language wrap, Product wrap, Version wrap.
- Hidden pages, Tags, External URL pages, Expanded-by-default.

### Phase 5 — Self-hostable architecture *(OSS pivot)*
- **Runtime config:** swap build-time `VITE_SUPABASE_*` for `/config.json` fetched at boot.
- **Dockerfile** for frontend (multi-stage build → nginx alpine).
- **Portable functions:** package edge functions as a standalone Deno service runnable
  outside the Supabase-managed runtime.
- **Migration runner:** ship `supabase/migrations/*.sql` + `bootstrap.sh` for any Postgres.
- **Railway template** (`railway.json`) — three services: frontend, functions, postgres.
- **Docker Compose** + **Coolify** + **Render Blueprint** alternates.
- Docs: `SELF_HOSTING.md`, `DEPLOY_RAILWAY.md`, `DEPLOY_DOCKER.md`.
- **LICENSE** file *(decision pending — see §7)*.

### Phase 6 — OSS hardening
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates.
- GitHub Actions CI: lint, typecheck, test, docker build, release.
- Pluggable auth (email-only, GitHub OAuth, Google OAuth, magic links).
- Remove all Lovable-Cloud-only assumptions; document required env vars.

### Phase 7 — Advanced parity & differentiation
- AsyncAPI support.
- Multi-language docs.
- Deploy previews per branch.
- Pluggable search (built-in / Algolia / Meilisearch / Typesense).
- Custom code blocks (HTML/CSS/JS in sandboxed iframe).
- MCP integration.
- Real-time multiplayer (Yjs + Supabase Realtime).

---

## 6. Success Metrics

**Hosted SaaS (docs0.lovable.app)**
- Time-to-first-published-page < 5 minutes.
- ≥ 60 % of trial users publish at least one page.
- Per-project pricing (~$2/project/user) with healthy gross margin (>90 %).

**Open-source distribution**
- ⭐ 1 000 GitHub stars within 6 months of OSS launch.
- Listed on Railway Templates marketplace.
- ≥ 20 community-contributed PRs in year one.
- ≥ 100 verified self-hosted deployments (opt-in telemetry).

**Product quality**
- 1:1 visual parity between builder preview and published site.
- < 200 ms p95 page-load on published static sites.
- Zero data loss across publish / branch / version operations.

---

## 7. Open Decisions

1. **License** — MIT (max adoption) vs **AGPL-3.0** (forces SaaS forks to open-source).
   Leaning AGPL to protect the SaaS business while keeping the code free for self-hosters.
2. **Self-host backend strategy** — bundle self-hosted Supabase (heavy, feature-complete)
   vs ship a minimal Hono+Postgres API (lighter, more work). Leaning **self-hosted Supabase**
   for Phase 5; revisit a slim alternative in Phase 7.
3. **Hosted SaaS** — keep `docs0.lovable.app` running alongside OSS as the easy-onboarding
   path and revenue source. (Recommended: yes — OSS + hosted is the standard playbook:
   Plausible, Cal.com, Posthog, Supabase itself.)

---

## 8. Non-Goals (for now)

- Replacing full-featured CMSs (Sanity, Contentful) for marketing sites.
- Static site generators for non-documentation use cases.
- A general-purpose Notion clone.
- A no-code app builder.

Stay focused: **the best visual documentation builder, open and yours.**
