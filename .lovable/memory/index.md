# Memory: index.md
Updated: now

## 0docs — Visual Documentation Builder

### Branding
- App name: **0docs** (not DocBuilder)
- Dashboard sidebar, auth page, homepage all show "0docs"
- Color scheme: dark neutral/black (no purple brand color)
- Primary HSL: 225 15% 15% (light), 225 10% 80% (dark)

### Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → pages → sections → blocks (all with RLS)
- Public docs accessible at /docs/:slug
- Homepage project ID: 4a705271-9c84-49cf-8e84-7c1b019e4c85
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)

### Block Types
heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout, tabs, accordion, card, steps, table, divider, quote, api_endpoint, code_tabs, inline_editor

### Design
- Uses existing doc styles (doc-heading, doc-prose, doc-note, doc-code-block, doc-sidebar-link etc.)
- Builder mirrors exact doc layout for WYSIWYG feel
- Monochrome palette with semantic tokens from index.css

### Design Settings Sync
- DesignSettings type in use-design-settings.ts is the single source of truth
- All 3 views (Builder, DesignSettings, PublicDocs) use inline styles from settings object
- DocContentView is shared renderer for PublicDocs and DesignSettings preview

### Auth Page
- No left-side gradient panel — clean centered form only
- Shows "0docs" branding above forms

### Homepage / PublicDocs
- hideHeaderLabel=true removes "Pages" label from sidebar
- Header shows "0docs" branding left-aligned, Dashboard/Sign In button right-aligned in black
