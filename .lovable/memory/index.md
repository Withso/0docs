# Memory: index.md
Updated: now

## DocBuilder - Documentation Builder App

### Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → nav_groups + pages → sections → blocks (all with RLS)
- nav_groups: sidebar section groupings for pages (title, order_index, project_id)
- pages have optional nav_group_id for grouping
- Public docs accessible at /docs/:slug
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)

### Block Types
heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout

### Design
- Uses existing doc styles (doc-heading, doc-prose, doc-note, doc-code-block, doc-sidebar-link etc.)
- Builder mirrors exact doc layout for WYSIWYG feel
- Monochrome palette with semantic tokens from index.css

### Sidebar Navigation
- Builder sidebar label: "Side Nav" (builder reference only, not shown in preview/public)
- + button opens dropdown: "Add Section" (nav group) or "Add Page" (ungrouped)
- Nav groups are collapsible, double-click to rename titles
- Pages inside groups also double-click to rename
- Public docs sidebar shows groups as category labels

### Design Settings Sync
- DesignSettings type in use-design-settings.ts is the single source of truth
- New settings added: sectionSpacing, pageTitleSize, sidebarPageGap
- All 3 views (Builder, DesignSettings, PublicDocs) use inline styles from settings object
- Builder uses DesignSettingsWrapper + settings for all typography/colors/layout
- BuilderSidebar, SectionEditor, BlockEditor all accept `settings` prop
- DocContentView is shared renderer for PublicDocs and DesignSettings preview
- DocBlockRenderer explicitly applies bodyFont, lineHeight, baseFontSize to paragraph/list/note/callout blocks

### Design Mode Toggle
- Select box (not toggle) switches between "Live" and "Examples" sub-modes
- Examples view: DesignExamplesView with left sidebar categories and collapsible block controls
