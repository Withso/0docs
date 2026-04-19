# Memory: index.md
Updated: now

## 0docs - Documentation Builder App

### Strategic Direction (NEW)
- **Open-source, self-hostable Mintlify alternative.** See `product-vision.md` at repo root.
- Hosted SaaS (`docs0.lovable.app`) continues alongside OSS distribution.
- Phased roadmap: Phase 0 vision (done) → Phase 1 per-project sidebar → ... → Phase 5 self-hosting (Railway template, Docker, Coolify) → Phase 7 advanced parity.

### Architecture
- Auth: email/password with auto-confirm, profiles table auto-created on signup
- Database: projects → pages → sections → blocks (all with RLS)
- Public docs accessible at /docs/:slug
- Builder at /builder/:projectId (WYSIWYG, same layout as public docs)
- App name: 0docs (not DocBuilder, not 0colors)

### Design Settings
- DesignSettings type in use-design-settings.ts is the single source of truth
- TOC controls: tocVisible, tocGap
- Section border: sectionBorderVisible, sectionBorderColor, sectionBorderThickness
- Sidebar label/section: sidebarLabelFontSize, sidebarLabelColor, sidebarSectionFontSize, sidebarSectionColor
- All 3 views (Builder, DesignSettings, PublicDocs) use inline styles from settings object
- DocContentView is shared renderer for PublicDocs and DesignSettings preview

### Features
- "Made with 0docs" banner on all live/preview/homepage pages (MadeWithBanner component)
- Project duplicate in Dashboard (deep copies nav groups, pages, sections, blocks, design settings)
- Video blocks: showControls and loop per-video in editor mode
- Image blocks: resize (width %) and alignment (left/center/right) per-image in editor mode
- Scroll tracking: first section highlighted at top of page, last at bottom

### Upcoming UI Restructure (Phase 1)
- Vertical icon rail per project: Home / Editor / Analytics / Settings
- Editor inner tabs: Navigation | Files
- Configurations entry replaces flat Design tab (Phase 2: 10 Mintlify-style categories)
