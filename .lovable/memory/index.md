# Memory: index.md
Updated: now

## DocBuilder - Documentation Builder App

### Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → pages → sections → blocks (all with RLS)
- Public docs accessible at /docs/:slug
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)
- **Publishing**: published_versions table stores full content+design snapshots
- **Versioning**: Auto-increment version numbers (0.01, 0.02...), revert support
- Public docs serve published snapshot when available, fallback to live data

### Block Types
heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout, tabs, accordion, card, steps, table, divider, quote, api_endpoint, code_tabs, inline_editor

### Design
- Uses existing doc styles (doc-heading, doc-prose, doc-note, doc-code-block, doc-sidebar-link etc.)
- Builder mirrors exact doc layout for WYSIWYG feel
- Monochrome palette with semantic tokens from index.css

### Rules
- **Shared component architecture**: Always use shared components across the app. No UI duplication.
- Design controls (SliderField, ColorField, ToggleField, InlineSelect, FontSelect) in DesignControls.tsx
- All block customizations in BlockControls shared component

### Design Settings Sync
- DesignSettings type in use-design-settings.ts is the single source of truth
- All views use inline styles from settings object
- DesignSettingsWrapper + settings for all typography/colors/layout

### Publishing & Versioning
- usePublish hook: manages publish flow, change detection, version management
- PublishDialog: shows editor/design change diff, version history, revert
- published_versions table: stores snapshots of pages, sections, blocks, design, nav_groups
- projects.published_version_id: points to active published version
- projects.custom_domain: optional domain configuration