

# Revised Export Engine: React-from-CDN Static Site

## The Core Problem

Vanilla JS translation of React components is **not sustainable**. Every new block type, every future feature (custom blocks, AI chat, search) would require maintaining two separate implementations. They will inevitably drift apart.

## The Solution: Ship Real React, No Build Step

Instead of translating React to vanilla JS, the exported site **uses React directly** — loaded from a CDN. All viewer components are written as `React.createElement()` calls (no JSX, no bundler needed). This gives us:

- **Exact behavioral parity** with the builder preview
- **Zero dual-maintenance** — one rendering logic, one codebase
- **Custom blocks work automatically** — HTML/CSS/JS rendered via `dangerouslySetInnerHTML`, same as the builder
- **Future features slot in naturally** — AI chat, advanced search, MCP-generated content all use the same React patterns

## How It Works

```text
Export Engine (doc-exporter.ts) produces:
├── index.html          ← HTML shell + React from CDN + viewer script
├── content.json        ← All pages, sections, blocks (structured data)
├── theme.json          ← Design tokens (colors, fonts, spacing)
├── docs.json           ← Navigation groups + page order
└── .nojekyll           ← GitHub Pages compatibility
```

`index.html` contains:
1. `<script>` tags loading React 18 + ReactDOM from unpkg CDN (~45KB gzipped)
2. A `<script>` block (~600-800 lines) containing the viewer app written with `React.createElement()` — direct translations of `DocContentView`, `DocBlockRenderer`, `DocSidebarNav`, `SearchDialog`, `TableOfContents`, `DocMobileNav`, `PageFeedback`
3. Inlined `<style>` generated from the user's DesignSettings
4. Google Fonts `<link>` for configured fonts

At boot, the viewer fetches `content.json` and renders the full doc site with hash-based routing (`#/page-slug`).

## Future-Proofing Analysis

| Future Feature | How It Works in This Architecture |
|---|---|
| **Custom blocks (HTML/CSS/JS)** | Block content stored in `content.json` with `type: "custom"`. Viewer renders via `dangerouslySetInnerHTML` + scoped `<style>` + inline `<script>`. Identical to builder behavior. |
| **AI Chat widget** | Add the chat component to the viewer script. It calls the same `ask-docs` edge function. Works identically. |
| **Advanced search (Cmd+K)** | Already planned. Fuzzy search over `content.json` data. Same logic as `SearchDialog.tsx`. |
| **MCP-generated content** | MCP tools write to the database. Content flows through the same export pipeline into `content.json`. No viewer changes needed. |
| **New block types** | Add rendering logic to `DocBlockRenderer` (React) → copy the same `createElement` pattern to the viewer script. One pattern, one translation. |
| **Interactive embeds** | Rendered as iframes or raw HTML in custom blocks. Works in both builder and exported site. |

## Why Not Other Approaches

| Approach | Problem |
|---|---|
| **Vanilla JS translation** | Dual maintenance nightmare. Every feature needs two implementations. Custom blocks break. |
| **Ship the entire React app source** | Requires a build step (Vite/npm). Users can't just host static files on GitHub Pages. |
| **Pre-built viewer bundle** | Can't run Vite builds in Lovable at publish time. Would need a separate CI pipeline. |
| **SSG (Docusaurus/Nextra)** | External dependency. Users need Node.js setup. Not "one-click." |
| **React from CDN (this plan)** | No build step. Real React. Works on any static host. One-click. |

## Migration Path for New Features

When adding a new block type or feature:
1. Build the React component in `src/components/docs/` (JSX, as usual)
2. Add the equivalent `React.createElement()` version to the viewer generator in `doc-exporter.ts`
3. Both use the same props, same logic, same styling — just different syntax

This is a **mechanical translation**, not a reimplementation. `createElement('div', {style: {...}}, children)` maps 1:1 to `<div style={{...}}>{children}</div>`.

## Implementation Steps

### Step 1: Rewrite `src/lib/doc-exporter.ts`
- `generateContentJSON()` — structured JSON with all pages, sections, blocks
- `generateStaticHTML(settings, navGroups)` — the main function that produces the complete `index.html`:
  - CSS generation from DesignSettings (same logic as `DesignSettingsWrapper`)
  - Viewer script with all doc components as `createElement` calls
  - HTML shell with sidebar, main content, TOC, search modal, mobile nav containers

### Step 2: Implement viewer components in createElement syntax
Translate these components (in priority order):
1. `DocBlockRenderer` — all 20+ block types
2. `DocSidebarNav` — navigation with scroll tracking
3. `TableOfContents` — right sidebar
4. `SearchDialog` — Cmd+K fuzzy search
5. `DocMobileNav` — responsive hamburger menu
6. `PageFeedback` — feedback widget
7. `DesignSettingsWrapper` — CSS variable injection

### Step 3: Keep edge function unchanged
`publish-to-github` already handles pushing arbitrary files. No changes needed.

## What Changes

| File | Action |
|---|---|
| `src/lib/doc-exporter.ts` | **Rewrite** — generate `index.html` with React CDN viewer + `content.json` |

Everything else stays the same — the edge function, publish UI, settings UI, builder components.

