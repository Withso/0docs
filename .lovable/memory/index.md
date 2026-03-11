Design system, constraints, and architecture rules for DocBuilder app.

## Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → pages → sections → blocks (all with RLS)
- Public docs accessible at /docs/:slug
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)
- **Shared component architecture**: Always use shared components across the application. Never duplicate UI controls.

## Block Types
heading, paragraph, code_block, image, video, youtube, ordered_list, unordered_list, note, callout, tabs, accordion, card, steps, table, divider, quote, api_endpoint, code_tabs, inline_editor

## Design
- Monochrome palette with semantic tokens from index.css
- Builder mirrors exact doc layout for WYSIWYG feel
- DesignControls.tsx is single source of truth for all design setting UI controls (shared across live + examples mode)
- BlockStyleSettings has per-block-type specific properties (table: headerBg, showCellBorders, stripedRows; api_endpoint: methodBadgeRadius, headerBgColor, responseBg; steps: circleSize, circleBg, connectorColor; quote: borderWidth, italic; divider: thickness, dividerStyle, spacing; card: titleFontSize, showShadow; accordion: headerBgAccordion, contentBg; tabs: activeColor, indicatorColor; code_tabs: tabBarBg, activeTabColor)

## Design Settings Sync
- DesignSettings type in use-design-settings.ts is the single source of truth
- All views (Builder, DesignSettings, PublicDocs) use inline styles from settings object
- DocBlockRenderer applies all block-specific style settings
- blockSections in DesignControls.tsx lists ALL 20 block types with icons
