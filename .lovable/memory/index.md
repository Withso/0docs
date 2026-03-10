# Memory: index.md

## DocBuilder - Documentation Builder App

### Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → pages → sections → blocks (all with RLS)
- Public docs accessible at /docs/:slug
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)

### Block Types
heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout

### Design
- Uses existing doc styles (doc-heading, doc-prose, doc-note, doc-code-block, doc-sidebar-link etc.)
- Builder mirrors exact doc layout for WYSIWYG feel
- Monochrome palette with semantic tokens from index.css

### Design Settings Sync
- DesignSettings type in use-design-settings.ts is the single source of truth
- New settings added: sectionSpacing, pageTitleSize, sidebarPageGap
- All 3 views (Builder, DesignSettings, PublicDocs) use inline styles from settings object
- Builder uses DesignSettingsWrapper + settings for all typography/colors/layout
- BuilderSidebar, SectionEditor, BlockEditor all accept `settings` prop
- DocContentView is shared renderer for PublicDocs and DesignSettings preview
- DocBlockRenderer explicitly applies bodyFont, lineHeight, baseFontSize to paragraph/list/note/callout blocks

### Name Editing Flow (nav_title)
- Pages and sections have both `title` and `nav_title` (nullable) columns
- Main area edits `title` → reflects in sidebar (as fallback) and right TOC
- Sidebar edits `nav_title` → sidebar-only override, does NOT change main area or right TOC
- Sidebar displays `nav_title || title`
- Right-side "On This Page" TOC always uses `title`
- Public docs sidebar also uses `nav_title || title`

### Drag & Drop
- Sidebar: Single unified flat list (pages, labels, text) in one SortableContext with drag handles
- Group membership derived from position (pages below a label belong to that label)
- Content area: Sections have DnD with drag handles (SectionsDndWrapper in Builder.tsx)
- Blocks within sections have DnD with drag handles (SectionEditor.tsx)
- reorderBlocks function in use-builder.ts persists block order + section_id changes
