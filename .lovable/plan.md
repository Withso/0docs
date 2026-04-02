

# GitHub-Based Publishing System — Architecture Plan

## Overview

Replace the current same-domain publishing model (`/docs/:slug`) with a GitHub-based workflow where documentation is exported as static files (Markdown/MDX + config) and pushed to a GitHub repository. Users connect their GitHub account, choose a repo (or create one), and "publish" commits their doc changes as files to that repo. Versioning maps to Git branches and commits.

## What Gets Removed

1. **Analytics tab** — Remove the Analytics mode from the builder header and `AnalyticsContent` component. The page view tracking in `PublicDocs.tsx` and search query tracking in `DocContentView.tsx` will be removed.
2. **Same-domain public docs route** — Remove `/docs/:slug` and `/docs/:slug/:pageSlug` routes. Remove `PublicDocs.tsx`. The documentation will be hosted externally (GitHub Pages, Vercel, Netlify, etc.).
3. **Current publish system** — The snapshot-based `published_versions` flow will be replaced with GitHub commits. The `use-publish.ts` hook and `PublishContent.tsx` will be rewritten.
4. **Page analytics tracking** — Remove the `page_analytics` insert/update logic from `PublicDocs.tsx`.

## What Stays

- **Feedback widget** (`PageFeedback`) — stays in the builder preview; feedback data remains in the database for the project owner.
- **Search dialog** — stays in the builder preview for testing.
- **Internal versioning** (`doc_versions` / `use-versions.ts`) — kept as "draft versions" within the editor. These are independent of Git branches but can be mapped to branches when publishing.
- **Design settings** — exported as a `theme.json` or similar config file in the repo.

## New Architecture

```text
┌─────────────────────────────────────────────────┐
│                  zdocs Builder                   │
│                                                  │
│  Editor → Design → Preview → Publish to GitHub   │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐  │
│  │ Draft content │───▶│ Export Engine           │  │
│  │ (DB: pages,   │    │ • pages → .mdx files   │  │
│  │  sections,    │    │ • design → theme.json  │  │
│  │  blocks)      │    │ • nav → docs.json      │  │
│  └──────────────┘    └─────────┬──────────────┘  │
│                                │                  │
│                    ┌───────────▼──────────────┐   │
│                    │ Edge Function:            │   │
│                    │ publish-to-github         │   │
│                    │ • GitHub API (PAT/OAuth)  │   │
│                    │ • Create tree + commit    │   │
│                    │ • Push to branch          │   │
│                    └──────────────────────────┘   │
└─────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   GitHub Repository   │
              │                      │
              │  docs/               │
              │  ├── getting-started.mdx
              │  ├── api-reference.mdx
              │  └── ...             │
              │  docs.json (nav/meta)│
              │  theme.json (design) │
              │  main branch         │
              │  feature branches    │
              └──────────────────────┘
                         │
                         ▼
              User deploys via GitHub Pages,
              Vercel, Netlify, or any SSG
```

## Implementation Steps

### Step 1: GitHub Connection & Auth
- Add a **GitHub Personal Access Token (PAT)** field in Project Settings, stored as a secret per-project in a new `project_secrets` table (encrypted) or via the Supabase secrets/vault.
- Alternatively, store the GitHub PAT in the `projects` table as `github_token` (encrypted at app level) along with `github_repo` (e.g., `owner/repo-name`) and `github_branch` (default: `main`).
- Settings UI: repo URL input, branch selector, token input with secure storage.

### Step 2: Export Engine (Client-Side)
- New utility `src/lib/doc-exporter.ts` that converts the internal data model to files:
  - Each **page** → an `.mdx` file named `{slug}.mdx` with frontmatter (title, description, order)
  - Each **section** → an `## heading` within the page MDX
  - Each **block** → rendered as Markdown (paragraph → text, code_block → fenced code, api_endpoint → formatted endpoint block, etc.)
  - **Navigation** → `docs.json` with page order, nav groups, hierarchy
  - **Design** → `theme.json` with all design tokens
- This runs client-side and produces a `Map<string, string>` of file paths to content.

### Step 3: Edge Function — `publish-to-github`
- New Supabase Edge Function that receives the exported files and pushes to GitHub using the Git Data API:
  1. Get the current commit SHA of the target branch
  2. Get the tree SHA of that commit
  3. Create blobs for each file
  4. Create a new tree with all blobs
  5. Create a commit with a message (e.g., "docs: publish v0.05 — Added API Reference page")
  6. Update the branch ref to point to the new commit
- Supports creating new branches (for versioning/drafts)
- The edge function receives: `{ repoOwner, repoName, branch, files: [{path, content}], commitMessage, token }`

### Step 4: Rewrite Publish UI (`PublishContent.tsx`)
- Replace the current snapshot-based UI with:
  - **Repository info**: Connected repo, branch, last push timestamp
  - **Changed files**: Show which `.mdx` files changed (diff against last publish)
  - **Commit message**: Auto-generated but editable
  - **Branch selector**: Push to `main` or create/select a feature branch
  - **Publish button**: Triggers export → edge function → GitHub push
- Keep the version history but now it shows Git commits (fetched from GitHub API)

### Step 5: Branch Management
- Allow users to create branches from the builder (maps to Git branches)
- Branch switcher in the publish panel
- "Merge" concept — user merges branches on GitHub directly (we link to the PR creation URL)

### Step 6: Remove Analytics & Public Docs
- Remove `AnalyticsContent.tsx` import and mode from `Builder.tsx`
- Remove analytics button from `BuilderHeader.tsx`
- Remove `/docs/:slug` routes from `App.tsx`
- Remove `PublicDocs.tsx`
- Remove page view tracking code
- Remove search query tracking from `DocContentView.tsx` (keep the search UI for preview)
- Clean up the analytics route from the builder URL handling

### Step 7: Update Settings
- Remove the "URL Slug" / docs URL display from `SettingsContent.tsx`
- Add GitHub repository settings section:
  - Repository: `owner/repo` input
  - Default branch: dropdown
  - GitHub token: secure input (masked)
  - "Test Connection" button
  - Status indicator (connected/disconnected)

## Database Changes
- Add columns to `projects` table: `github_repo` (text, nullable), `github_branch` (text, default 'main'), `github_token_encrypted` (text, nullable)
- Or create a `project_github_settings` table with `project_id`, `repo_full_name`, `default_branch`, `token_hash`
- Keep `published_versions` table but repurpose it to store commit SHAs and metadata for history

## File Changes Summary

| File | Action |
|------|--------|
| `src/components/builder/AnalyticsContent.tsx` | Delete |
| `src/pages/PublicDocs.tsx` | Delete |
| `src/components/builder/BuilderHeader.tsx` | Remove analytics button |
| `src/pages/Builder.tsx` | Remove analytics mode, rewrite publish integration |
| `src/components/builder/PublishContent.tsx` | Rewrite for GitHub publishing |
| `src/components/builder/SettingsContent.tsx` | Add GitHub repo settings, remove slug URL |
| `src/hooks/use-publish.ts` | Rewrite to use GitHub API via edge function |
| `src/lib/doc-exporter.ts` | **New** — export engine |
| `supabase/functions/publish-to-github/index.ts` | **New** — edge function |
| `src/App.tsx` | Remove `/docs/:slug` routes |
| `src/components/docs/DocContentView.tsx` | Remove search tracking |
| Database migration | Add GitHub settings columns |

## Security Considerations
- GitHub PAT is stored encrypted and only sent to the edge function (server-side)
- The edge function validates ownership before pushing
- PAT should have minimal scope: `repo` or `public_repo` only

## Questions Before Implementation

I want to clarify a few things before proceeding:

