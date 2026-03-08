

# Competitive Analysis & Implementation Plan

## Current State Analysis

Your product is a **documentation builder** with:
- Visual WYSIWYG editor for pages/sections/blocks
- 10 block types: heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout
- Comprehensive design settings (typography, colors, spacing, sidebar)
- Public docs viewer with dynamic theming
- User authentication and project management

---

## Competitor Feature Analysis

### Mintlify Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **AI Assistant** | Chat with docs, answer questions using doc content | High |
| **Global Search** | Cmd+K search across all pages | Critical |
| **API Playground** | Interactive API testing from OpenAPI spec | High |
| **Components Library** | Accordions, tabs, cards, tooltips, steps | High |
| **Code Tabs** | Multiple languages in single code block | High |
| **Reusable Snippets** | Content reuse across pages | Medium |
| **Custom Domain** | Custom domain support | Medium |
| **Analytics** | Page views, search queries, feedback | Medium |
| **Feedback Widget** | Thumbs up/down on pages | Medium |
| **PDF Export** | Export docs as PDF | Low |
| **SEO Optimization** | Meta tags, sitemap, OG images | Medium |
| **Table of Contents** | Right-side TOC for current page | Medium |
| **Changelogs** | Built-in changelog pages | Medium |

### Fern Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **API Reference** | Auto-generated from OpenAPI/AsyncAPI | High |
| **API Explorer** | Live API testing with auth | High |
| **AI Search ("Ask Fern")** | AI-powered search with citations | High |
| **Versioning** | Multiple doc versions | Medium |
| **SDK Code Samples** | Multi-language code examples | High |
| **Landing Page Builder** | Custom landing pages | Medium |
| **WebSocket Docs** | AsyncAPI support | Low |
| **Access Control (RBAC)** | Role-based content visibility | Medium |
| **Federated Auth** | SSO, OAuth integration | Medium |
| **llms.txt** | AI agent compatibility file | Low |
| **Preview Deployments** | PR-based previews | Medium |

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal: Match table-stakes features**

#### 1.1 Global Search (Cmd+K)
```text
┌─────────────────────────────────────┐
│ ⌘K  Search documentation...         │
├─────────────────────────────────────┤
│ Pages                               │
│   ○ Getting Started                 │
│   ○ Installation Guide              │
│ Sections                            │
│   ○ Quick Start → Setup             │
│ Content                             │
│   ○ "npm install" in Code Block     │
└─────────────────────────────────────┘
```

**Implementation:**
- Create `SearchDialog` component using `cmdk` (already installed)
- Index pages, sections, and block content
- Full-text search with fuzzy matching
- Store index in memory on page load

#### 1.2 Table of Contents (Right Sidebar)
- Show H2/H3 headings from current page
- Scroll-spy to highlight active section
- Click to smooth-scroll

#### 1.3 New Block Types

| Block | Description |
|-------|-------------|
| **Tabs** | Tabbed content container |
| **Accordion** | Collapsible content |
| **Card** | Styled card with title/description/link |
| **Steps** | Numbered step-by-step guide |
| **Table** | Data table with headers |
| **Divider** | Visual separator |
| **Quote** | Blockquote styling |
| **Tip/Warning/Info** | Semantic callouts with icons |

---

### Phase 2: Developer Experience (Week 3-4)
**Goal: API documentation capabilities**

#### 2.1 Code Tabs Block
Multi-language code with tab selection:
```text
┌──────┬────────┬──────┐
│ JS   │ Python │ cURL │
├──────┴────────┴──────┤
│ const client = new   │
│ API({ key: '...' }); │
└──────────────────────┘
```

**Schema:**
```typescript
interface CodeTabsContent {
  tabs: Array<{
    label: string;
    language: string;
    code: string;
  }>;
}
```

#### 2.2 API Endpoint Block
Display API endpoint with method, path, params:
```text
┌────────────────────────────────────┐
│ POST /api/v1/users                 │
├────────────────────────────────────┤
│ Parameters                         │
│   email (string, required)         │
│   name (string, optional)          │
├────────────────────────────────────┤
│ Response 200                       │
│   { "id": "...", "email": "..." }  │
└────────────────────────────────────┘
```

#### 2.3 OpenAPI Import
- Parse OpenAPI/Swagger YAML/JSON
- Auto-generate API reference pages
- Link to API Playground

---

### Phase 3: AI & Analytics (Week 5-6)
**Goal: Intelligence layer**

#### 3.1 AI Assistant ("Ask Docs")
- Embed AI chat widget in docs
- RAG over documentation content
- Use Lovable AI models (gemini-2.5-flash)
- Store embeddings per project

#### 3.2 Analytics Dashboard
- Page views per page
- Search queries (what users search for)
- Time on page
- Scroll depth
- Failed searches (content gaps)

#### 3.3 Feedback System
- Thumbs up/down on each page
- Optional comment field
- Dashboard to review feedback

---

### Phase 4: Publishing & Sharing (Week 7-8)
**Goal: Production-ready docs**

#### 4.1 Custom Domains
- Allow custom domain configuration
- SSL certificate management
- DNS verification flow

#### 4.2 SEO Features
- Auto-generate sitemap.xml
- OG image generation
- Meta description per page
- Structured data (JSON-LD)

#### 4.3 Versioning
- Multiple doc versions per project
- Version selector in docs
- Archive old versions

---

## Database Schema Changes

```sql
-- New block types enum
ALTER TYPE block_type ADD VALUE 'tabs';
ALTER TYPE block_type ADD VALUE 'accordion';
ALTER TYPE block_type ADD VALUE 'card';
ALTER TYPE block_type ADD VALUE 'steps';
ALTER TYPE block_type ADD VALUE 'table';
ALTER TYPE block_type ADD VALUE 'divider';
ALTER TYPE block_type ADD VALUE 'quote';
ALTER TYPE block_type ADD VALUE 'api_endpoint';
ALTER TYPE block_type ADD VALUE 'code_tabs';

-- Search index (for faster full-text search)
CREATE INDEX idx_blocks_content_gin ON blocks 
USING gin(to_tsvector('english', content::text));

-- Analytics
CREATE TABLE page_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  view_count integer DEFAULT 0,
  avg_time_seconds integer,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Search analytics
CREATE TABLE search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  query text NOT NULL,
  results_count integer,
  clicked_result_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Page feedback
CREATE TABLE page_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  is_helpful boolean NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Doc versions
CREATE TABLE doc_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Priority Implementation Order

1. **Global Search (Cmd+K)** - Most impactful UX improvement
2. **Code Tabs Block** - Essential for developer docs
3. **Table of Contents** - Improves navigation
4. **Accordion/Tabs Blocks** - Content organization
5. **AI Assistant** - Competitive differentiator
6. **Feedback Widget** - User engagement
7. **Analytics** - Insights for doc owners
8. **API Endpoint Block** - API documentation
9. **Versioning** - Enterprise requirement
10. **Custom Domains** - Publishing requirement

---

## Technical Architecture

```text
┌─────────────────────────────────────────────────────┐
│                    Frontend                         │
├─────────────────────────────────────────────────────┤
│  Builder      │  Public Docs    │  Dashboard        │
│  - Editor     │  - Reader       │  - Analytics      │
│  - Blocks     │  - Search       │  - Feedback       │
│  - Settings   │  - AI Chat      │  - Versions       │
└───────┬───────┴────────┬────────┴────────┬──────────┘
        │                │                 │
        ▼                ▼                 ▼
┌─────────────────────────────────────────────────────┐
│                 Supabase Backend                    │
├─────────────────────────────────────────────────────┤
│  Database     │  Edge Functions  │  Storage         │
│  - Projects   │  - AI Chat       │  - Images        │
│  - Pages      │  - Embeddings    │  - OpenAPI files │
│  - Blocks     │  - Analytics     │  - Exports       │
│  - Analytics  │  - Search        │                  │
└─────────────────────────────────────────────────────┘
```

---

## Competitive Differentiation

| Our Advantage | vs Mintlify | vs Fern |
|---------------|-------------|---------|
| **No-code visual builder** | ✅ (they use YAML/MDX) | ✅ (they use YAML) |
| **Real-time design preview** | ✅ | ✅ |
| **Block-level customization** | ✅ | ✅ |
| **Integrated AI (no API key)** | ✅ | ❌ (paid AI addon) |
| **Lower learning curve** | ✅ | ✅ |

Position as: **"The visual documentation builder for teams who want beautiful docs without writing code or YAML"**

