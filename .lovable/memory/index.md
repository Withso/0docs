# Memory: index.md
Updated: now

## DocBuilder - Documentation Builder App

### Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → pages → sections → blocks (all with RLS)
- Public docs accessible at /docs/:slug
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)
- **Homepage = documentation**: The `/` route renders a special `is_homepage=true` project using DocContentView
- Homepage project is admin-only (hidden from non-admin dashboard)
- Admin role: user_roles table with app_role enum, has_role() security definer function
- Admin user: arunrajkumar@withso.com (860124be-ecff-48a2-90e4-22371b860166)
- Homepage project ID: 4a705271-9c84-49cf-8e84-7c1b019e4c85, slug: docbuilder-home

### Block Types
heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout, tabs, accordion, card, steps, table, divider, quote, api_endpoint, code_tabs, inline_editor

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

### Inline Editor Block
- Uses TipTap (@tiptap/react, starter-kit, link, image, placeholder)
- Stores HTML in content.html field
- Builder: full WYSIWYG with toolbar (InlineEditorBlock.tsx, lazy-loaded)
- Public docs: renders HTML via dangerouslySetInnerHTML with .inline-editor-readonly styles
- CSS styles for both editor and readonly in index.css
