# Memory: index.md
Updated: now

## DocBuilder - Documentation Builder App

### Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → pages → sections → blocks (all with RLS)
- Public docs accessible at /docs/:slug
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)
- **RULE: Always use shared component architecture across the entire application. Never duplicate UI controls.**

### Block Types
heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout

### Design
- Uses existing doc styles (doc-heading, doc-prose, doc-note, doc-code-block, doc-sidebar-link etc.)
- Builder mirrors exact doc layout for WYSIWYG feel
- Monochrome palette with semantic tokens from index.css

### Shared Design Controls
- `src/components/builder/DesignControls.tsx` is the single source of truth for all design setting UI controls
- Contains: SliderField, ColorField, ToggleField, InlineSelect, FontSelect, WeightSelect, SettingsSection, ColorControls, LayoutControls, SidebarControls, BlockControls
- Both DesignPanel (live mode) and DesignExamplesView (examples mode) import from DesignControls
- All controls use unified container style: 34px height, rounded-xl, hsl(var(--foreground) / 0.06) bg
- ColorField uses react-colorful HexColorPicker in a popover
- hslToHex/hexToHsl helpers are in DesignControls.tsx

### Design Settings Sync
- DesignSettings type in use-design-settings.ts is the single source of truth
- New settings added: sectionSpacing, pageTitleSize, sidebarPageGap
- All 3 views (Builder, DesignSettings, PublicDocs) use inline styles from settings object
- Builder uses DesignSettingsWrapper + settings for all typography/colors/layout
- BuilderSidebar, SectionEditor, BlockEditor all accept `settings` prop
- DocContentView is shared renderer for PublicDocs and DesignSettings preview
- DocBlockRenderer explicitly applies bodyFont, lineHeight, baseFontSize to paragraph/list/note/callout blocks
