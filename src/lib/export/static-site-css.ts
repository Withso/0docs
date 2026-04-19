import type { DesignSettings } from "@/hooks/use-design-settings";

export function generateCSS(s: DesignSettings): string {
  return `
/* Reset & Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
body {
  font-family: '${s.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: ${s.baseFontSize}px;
  line-height: ${s.lineHeight};
  background-color: hsl(${s.backgroundColor});
  color: hsl(${s.foregroundColor});
}
a { color: hsl(${s.linkColor}); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; display: block; }
pre, code { font-family: '${s.codeFont}', 'Fira Code', monospace; }
button { border: none; background: none; cursor: pointer; font-family: inherit; }

/* Layout */
.site-header {
  position: sticky; top: 0; z-index: 40;
  border-bottom: 1px solid hsl(${s.borderColor});
  background-color: hsl(${s.backgroundColor});
}
.header-inner {
  max-width: ${s.contentMaxWidth + s.sidebarWidth + 248}px;
  margin: 0 auto; padding: 0 24px;
  height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.header-left { display: flex; align-items: center; gap: 8px; }
.project-name {
  font-weight: 600; font-size: 14px;
  font-family: '${s.bodyFont}', sans-serif;
}
.search-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 8px;
  border: 1px solid hsl(${s.borderColor});
  color: hsl(${s.mutedForegroundColor});
  font-size: 13px; font-family: '${s.bodyFont}', sans-serif;
  transition: background-color 0.15s;
}
.search-btn:hover { background-color: hsl(${s.accentColor}); }
.search-btn kbd {
  display: none; border: 1px solid hsl(${s.borderColor});
  border-radius: 4px; padding: 2px 6px; font-size: 10px;
}
@media (min-width: 640px) {
  .search-btn kbd { display: inline-flex; align-items: center; gap: 2px; }
  .search-btn .search-label { display: inline; }
}
.search-btn .search-label { display: none; }

/* Main layout */
.site-body {
  max-width: ${s.contentMaxWidth + s.sidebarWidth + 248}px;
  margin: 0 auto; display: flex; padding: 0 24px;
}

/* Sidebar */
.sidebar {
  width: ${s.sidebarWidth}px; flex-shrink: 0;
  position: sticky; top: 48px; height: calc(100vh - 48px);
  overflow-y: auto; padding: 32px 24px 32px 0;
  display: none;
}
@media (min-width: 1024px) { .sidebar { display: block; } }
.sidebar-label {
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 12px; font-size: ${s.sidebarLabelFontSize || 10}px;
  color: hsl(${s.sidebarLabelColor || s.sidebarTextColor});
}
.sidebar nav { display: flex; flex-direction: column; gap: ${s.sidebarPageGap}px; }
.sidebar .page-link {
  display: block; text-align: left; width: 100%;
  padding: 3px 0; transition: color 0.15s;
  font-size: ${s.sidebarFontSize}px;
  color: hsl(${s.sidebarTextColor});
  font-family: '${s.bodyFont}', sans-serif;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sidebar .page-link.active {
  color: hsl(${s.sidebarActiveColor}); font-weight: 500;
}
.sidebar .section-nav {
  margin-left: 1px; margin-top: 1px; margin-bottom: 4px;
  border-left: 1px solid hsl(${s.borderColor} / 0.5);
  display: flex; flex-direction: column;
}
.sidebar .section-link {
  display: block; padding: 3px 0 3px 12px; position: relative;
  font-size: ${s.sidebarSectionFontSize || (s.sidebarFontSize - 1)}px;
  color: hsl(${s.sidebarSectionColor || s.sidebarTextColor} / 0.65);
  font-family: '${s.bodyFont}', sans-serif;
  transition: color 0.15s; text-align: left; width: 100%;
}
.sidebar .section-link.active {
  color: hsl(${s.sidebarActiveColor}); font-weight: 500;
}
.sidebar .section-link.active::before {
  content: ''; position: absolute; left: -1px; top: 5px; bottom: 5px;
  width: 2px; border-radius: 9999px;
  background-color: hsl(${s.sidebarIndicatorColor});
}
.sidebar .nav-group-label {
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 6px; margin-top: 12px;
  font-size: ${s.sidebarLabelFontSize || 10}px;
  color: hsl(${s.sidebarLabelColor || s.sidebarTextColor} / 0.5);
}
.sidebar .nav-group-text {
  margin-top: 4px; padding: 3px 0;
  font-size: ${s.sidebarFontSize}px;
  color: hsl(${s.sidebarTextColor} / 0.6);
  font-family: '${s.bodyFont}', sans-serif;
}

/* Main content */
.main-content {
  flex: 1; min-width: 0; padding: 40px 0 40px 16px;
}
@media (max-width: 1023px) { .main-content { padding-left: 0; } }
.main-content article { max-width: ${s.contentMaxWidth}px; }
.page-title {
  font-family: '${s.headingFont}', sans-serif;
  font-weight: ${s.headingWeight};
  font-size: ${s.pageTitleSize}px;
  margin-bottom: ${s.sectionSpacing * 0.6}px;
}
.doc-section { margin-bottom: ${s.sectionSpacing}px; }
.section-heading {
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  font-family: '${s.headingFont}', sans-serif;
  font-weight: ${s.headingWeight};
  font-size: ${s.headingFontSize}px;
}
${s.sectionBorderVisible ? `.section-heading .section-line {
  flex: 1; height: ${s.sectionBorderThickness}px;
  background-color: hsl(${s.sectionBorderColor}); opacity: 0.5;
}` : ''}

/* Table of Contents */
.toc {
  flex-shrink: 0; position: sticky; top: 48px; height: calc(100vh - 48px);
  padding: 32px 0 32px 24px; width: 200px; display: none;
}
@media (min-width: 1280px) { .toc { display: block; } }
${!s.tocVisible ? '.toc { display: none !important; }' : ''}
.toc-label {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.1em; margin-bottom: 12px;
  color: hsl(${s.mutedForegroundColor});
}
.toc nav {
  display: flex; flex-direction: column; gap: 4px;
  border-left: 1px solid hsl(${s.borderColor} / 0.4);
}
.toc .toc-link {
  display: block; padding: 3px 0 3px 12px; position: relative;
  font-size: 12px; color: hsl(${s.mutedForegroundColor});
  font-family: '${s.bodyFont}', sans-serif; transition: color 0.15s;
  text-align: left; width: 100%;
}
.toc .toc-link.active {
  color: hsl(${s.sidebarActiveColor}); font-weight: 500;
}
.toc .toc-link.active::before {
  content: ''; position: absolute; left: -1px; top: 5px; bottom: 5px;
  width: 2px; border-radius: 9999px;
  background-color: hsl(${s.sidebarIndicatorColor});
}

/* Block styles */
.block-heading {
  font-family: '${s.headingFont}', sans-serif;
  font-weight: ${s.headingWeight};
  font-size: ${s.headingFontSize}px;
  margin-bottom: 12px;
}
.block-paragraph {
  margin-bottom: ${s.paragraphSpacing}px;
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize}px;
  line-height: ${s.lineHeight};
}
.block-code {
  background-color: hsl(${s.codeBlockBg});
  border-radius: ${s.codeBlockBorderRadius}px;
  border: 1px solid hsl(${s.borderColor});
  padding: 16px; margin-bottom: 16px;
  font-family: '${s.codeFont}', monospace;
  font-size: ${s.baseFontSize - 1}px;
}
.block-code .code-lang {
  color: hsl(${s.mutedForegroundColor});
  font-size: 12px; margin-bottom: 8px;
}
.block-code pre {
  margin: 0; white-space: pre-wrap;
  font-size: inherit; font-family: inherit; color: inherit;
}
.block-code pre code {
  font-size: inherit; font-family: inherit; color: inherit;
}
.block-note {
  background-color: hsl(${s.noteBg});
  border-left: ${s.noteBorderWidth}px solid hsl(${s.noteBorderColor});
  border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin-bottom: 16px;
  font-size: ${s.baseFontSize - 1}px;
  font-family: '${s.bodyFont}', sans-serif;
  line-height: ${s.lineHeight};
}
.block-callout {
  background-color: hsl(${s.accentColor});
  border: 1px solid hsl(${s.borderColor});
  border-radius: 8px; padding: 16px; margin-bottom: 16px;
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize}px;
  line-height: ${s.lineHeight};
}
.block-list {
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize}px;
  line-height: ${s.lineHeight};
  padding-left: 24px; margin-bottom: 16px;
}
.block-list li { margin-bottom: 4px; }
.block-quote {
  border-left: 3px solid hsl(${s.primaryColor});
  padding-left: 16px; margin: 0 0 16px 0;
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize}px;
  font-style: italic; line-height: ${s.lineHeight};
}
.block-quote footer {
  font-size: ${s.baseFontSize - 2}px;
  color: hsl(${s.mutedForegroundColor});
  font-style: normal; margin-top: 8px;
}
.block-image { margin-bottom: 16px; }
.block-image img {
  border-radius: ${s.imageRounded ? '8px' : '0'};
  border: 1px solid hsl(${s.borderColor});
}
.block-image .caption {
  color: hsl(${s.mutedForegroundColor});
  font-size: ${s.baseFontSize - 1}px;
  margin-top: 4px; line-height: ${s.lineHeight};
}
.block-video, .block-youtube { margin-bottom: 16px; }
.block-video video { width: 100%; display: block; border-radius: 8px; }
.block-youtube iframe {
  width: 100%; aspect-ratio: 16/9; border: none; border-radius: 8px;
}
.block-divider {
  border: none; border-top: 1px solid hsl(${s.borderColor});
  margin: 24px 0;
}
.block-card {
  border: 1px solid hsl(${s.borderColor});
  border-radius: 8px; padding: 20px;
  background-color: hsl(${s.accentColor});
  margin-bottom: 16px;
}
.block-card h4 {
  font-family: '${s.headingFont}', sans-serif;
  font-weight: ${s.headingWeight};
  font-size: ${s.baseFontSize}px; margin-bottom: 6px;
}
.block-card p {
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize - 1}px;
  color: hsl(${s.mutedForegroundColor}); line-height: ${s.lineHeight};
}
.block-card a {
  color: hsl(${s.linkColor}); font-size: ${s.baseFontSize - 1}px;
  margin-top: 8px; display: inline-block;
}

/* Tabs */
.block-tabs { margin-bottom: 16px; }
.block-tabs .tab-bar {
  display: flex; border-bottom: 1px solid hsl(${s.borderColor}); gap: 0;
}
.block-tabs .tab-btn {
  padding: 8px 16px; font-size: ${s.baseFontSize - 1}px;
  font-family: '${s.bodyFont}', sans-serif;
  color: hsl(${s.mutedForegroundColor});
  border-bottom: 2px solid transparent; transition: all 0.15s;
}
.block-tabs .tab-btn.active {
  color: hsl(${s.primaryColor}); font-weight: 500;
  border-bottom-color: hsl(${s.primaryColor});
}
.block-tabs .tab-content {
  padding: 12px 0; font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize}px; line-height: ${s.lineHeight};
}

/* Code Tabs */
.block-code-tabs { margin-bottom: 16px; border: 1px solid hsl(${s.borderColor}); border-radius: ${s.codeBlockBorderRadius}px; overflow: hidden; }
.block-code-tabs .tab-bar {
  display: flex; background-color: hsl(${s.accentColor});
  border-bottom: 1px solid hsl(${s.borderColor});
}
.block-code-tabs .tab-btn {
  padding: 8px 14px; font-size: 12px;
  font-family: '${s.codeFont}', monospace;
  color: hsl(${s.mutedForegroundColor});
  border-bottom: 2px solid transparent; transition: all 0.15s;
}
.block-code-tabs .tab-btn.active {
  color: hsl(${s.primaryColor}); font-weight: 600;
  border-bottom-color: hsl(${s.primaryColor});
}
.block-code-tabs .code-panel {
  background-color: hsl(${s.codeBlockBg}); padding: 16px;
  font-family: '${s.codeFont}', monospace;
  font-size: ${s.baseFontSize - 1}px;
}
.block-code-tabs .code-panel pre {
  margin: 0; white-space: pre-wrap;
  font-size: inherit; font-family: inherit; color: inherit;
}

/* Accordion */
.block-accordion {
  margin-bottom: 16px; border: 1px solid hsl(${s.borderColor});
  border-radius: 8px; overflow: hidden;
}
.block-accordion .acc-item { border-bottom: 1px solid hsl(${s.borderColor}); }
.block-accordion .acc-item:last-child { border-bottom: none; }
.block-accordion .acc-header {
  width: 100%; text-align: left; display: flex;
  align-items: center; justify-content: space-between;
  padding: 12px 16px; font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize}px; font-weight: 500; cursor: pointer;
}
.block-accordion .acc-header .arrow { transition: transform 0.2s; font-size: 12px; }
.block-accordion .acc-header.open .arrow { transform: rotate(180deg); }
.block-accordion .acc-body {
  padding: 0 16px 12px 16px; font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize - 1}px;
  color: hsl(${s.mutedForegroundColor}); line-height: ${s.lineHeight};
}

/* Steps */
.block-steps { margin-bottom: 16px; }
.block-steps .step { display: flex; gap: 16px; margin-bottom: 16px; }
.block-steps .step-indicator { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.block-steps .step-circle {
  width: 28px; height: 28px; border-radius: 50%;
  background-color: hsl(${s.primaryColor}); color: hsl(${s.primaryForegroundColor});
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; font-family: '${s.bodyFont}', sans-serif;
}
.block-steps .step-connector {
  width: 2px; flex: 1; margin-top: 4px;
  background-color: hsl(${s.borderColor});
}
.block-steps .step-content { padding-bottom: 8px; }
.block-steps .step-title {
  font-family: '${s.headingFont}', sans-serif;
  font-weight: ${s.headingWeight};
  font-size: ${s.baseFontSize}px; margin-bottom: 4px;
}
.block-steps .step-desc {
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize - 1}px;
  color: hsl(${s.mutedForegroundColor}); line-height: ${s.lineHeight};
}

/* Table */
.block-table {
  border: 1px solid hsl(${s.borderColor});
  border-radius: 8px; overflow: hidden; margin-bottom: 16px;
}
.block-table table { width: 100%; border-collapse: collapse; }
.block-table th {
  padding: 10px 14px; text-align: left;
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize - 1}px; font-weight: 600;
  background-color: hsl(${s.accentColor});
  border-bottom: 1px solid hsl(${s.borderColor});
}
.block-table td {
  padding: 10px 14px;
  font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize - 1}px;
  border-bottom: 1px solid hsl(${s.borderColor});
  line-height: ${s.lineHeight};
}
.block-table tr:last-child td { border-bottom: none; }

/* API Endpoint */
.block-api {
  border: 1px solid hsl(${s.borderColor});
  border-radius: 8px; overflow: hidden; margin-bottom: 16px;
}
.block-api .api-header {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background-color: hsl(${s.accentColor});
  border-bottom: 1px solid hsl(${s.borderColor});
}
.block-api .method-badge {
  color: #fff; padding: 2px 8px; border-radius: 4px;
  font-size: 12px; font-weight: 700;
  font-family: '${s.codeFont}', monospace;
}
.block-api .api-path {
  font-family: '${s.codeFont}', monospace;
  font-size: ${s.baseFontSize - 1}px;
}
.block-api .api-desc {
  padding: 12px 16px; font-family: '${s.bodyFont}', sans-serif;
  font-size: ${s.baseFontSize - 1}px;
  color: hsl(${s.mutedForegroundColor}); line-height: ${s.lineHeight};
}
.block-api .api-params { padding: 0 16px 12px 16px; }
.block-api .api-params-label {
  font-size: 12px; font-weight: 600; margin-bottom: 6px;
  color: hsl(${s.mutedForegroundColor});
}
.block-api .param-row { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
.block-api .param-name { font-family: '${s.codeFont}', monospace; font-size: 13px; }
.block-api .param-meta { font-size: 12px; color: hsl(${s.mutedForegroundColor}); }
.block-api .api-response {
  padding: 12px 16px; border-top: 1px solid hsl(${s.borderColor});
  background-color: hsl(${s.codeBlockBg});
  font-family: '${s.codeFont}', monospace;
  font-size: ${s.baseFontSize - 2}px; white-space: pre-wrap;
}

/* Inline editor content */
.inline-editor-content { margin-bottom: 16px; font-family: '${s.bodyFont}', sans-serif; font-size: ${s.baseFontSize}px; line-height: ${s.lineHeight}; }
.inline-editor-content h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
.inline-editor-content h2 { font-size: 1.5em; font-weight: 600; margin: 0.5em 0; }
.inline-editor-content h3 { font-size: 1.17em; font-weight: 600; margin: 0.5em 0; }
.inline-editor-content p { margin-bottom: 0.8em; }
.inline-editor-content ul, .inline-editor-content ol { padding-left: 1.5em; margin-bottom: 0.8em; }
.inline-editor-content a { color: hsl(${s.linkColor}); }
.inline-editor-content blockquote { border-left: 3px solid hsl(${s.borderColor}); padding-left: 1em; margin: 0.8em 0; color: hsl(${s.mutedForegroundColor}); }
.inline-editor-content code { background: hsl(${s.codeBlockBg}); padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
.inline-editor-content pre { background: hsl(${s.codeBlockBg}); padding: 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 0.8em; }
.inline-editor-content img { max-width: 100%; border-radius: 4px; }

/* Page feedback */
.page-feedback {
  padding: 24px 0; margin-top: 32px;
  border-top: 1px solid hsl(${s.borderColor});
}
.page-feedback .fb-row {
  display: flex; align-items: center; gap: 12px;
  font-family: '${s.bodyFont}', sans-serif;
}
.page-feedback .fb-label {
  font-size: ${s.baseFontSize - 1}px;
  color: hsl(${s.mutedForegroundColor});
}
.page-feedback .fb-btns { display: flex; gap: 6px; }
.page-feedback .fb-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid hsl(${s.borderColor});
  font-size: ${s.baseFontSize - 2}px;
  color: hsl(${s.mutedForegroundColor});
  transition: background-color 0.15s;
}
.page-feedback .fb-btn:hover { background-color: hsl(${s.accentColor}); }
.page-feedback .fb-thanks {
  display: flex; align-items: center; gap: 8px;
  color: hsl(${s.mutedForegroundColor}); font-size: ${s.baseFontSize - 1}px;
}

/* Search overlay */
.search-overlay {
  position: fixed; inset: 0; z-index: 200;
  background-color: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: min(20vh, 120px);
}
.search-dialog {
  width: 90%; max-width: 560px;
  background-color: hsl(${s.backgroundColor});
  border: 1px solid hsl(${s.borderColor});
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}
.search-input-wrap {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid hsl(${s.borderColor});
}
.search-input-wrap svg { flex-shrink: 0; color: hsl(${s.mutedForegroundColor}); }
.search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 15px; color: hsl(${s.foregroundColor});
  font-family: '${s.bodyFont}', sans-serif;
}
.search-input::placeholder { color: hsl(${s.mutedForegroundColor}); }
.search-results {
  max-height: 400px; overflow-y: auto; padding: 8px;
}
.search-group-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; padding: 8px 8px 4px;
  color: hsl(${s.mutedForegroundColor});
}
.search-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px; border-radius: 6px; cursor: pointer;
  font-size: 14px; color: hsl(${s.foregroundColor});
  font-family: '${s.bodyFont}', sans-serif;
  transition: background-color 0.1s;
}
.search-item:hover { background-color: hsl(${s.accentColor}); }
.search-item svg { flex-shrink: 0; color: hsl(${s.mutedForegroundColor}); width: 16px; height: 16px; }
.search-item .search-meta {
  font-size: 12px; color: hsl(${s.mutedForegroundColor});
}
.search-empty {
  padding: 24px; text-align: center;
  color: hsl(${s.mutedForegroundColor}); font-size: 14px;
}

/* Mobile nav */
.mobile-menu-btn { display: none; }
@media (max-width: 1023px) {
  .mobile-menu-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 8px;
    color: hsl(${s.foregroundColor}); transition: background-color 0.15s;
  }
  .mobile-menu-btn:hover { background-color: hsl(${s.accentColor}); }
}
.mobile-overlay {
  position: fixed; inset: 0; z-index: 100;
}
.mobile-backdrop {
  position: absolute; inset: 0; background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
}
.mobile-drawer {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 300px; max-width: 85vw; overflow-y: auto;
  background-color: hsl(${s.backgroundColor});
  border-right: 1px solid hsl(${s.borderColor});
  animation: slideInLeft 0.2s ease-out;
}
.mobile-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid hsl(${s.borderColor});
}
.mobile-drawer-header span {
  font-weight: 600; font-size: 14px;
  font-family: '${s.bodyFont}', sans-serif;
  color: hsl(${s.foregroundColor});
}
.mobile-close {
  width: 28px; height: 28px; border-radius: 8px; display: flex;
  align-items: center; justify-content: center;
  color: hsl(${s.mutedForegroundColor}); transition: background-color 0.15s;
}
.mobile-close:hover { background-color: hsl(${s.accentColor}); }
.mobile-search-btn {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 12px; margin: 8px 12px; border-radius: 8px;
  border: 1px solid hsl(${s.borderColor});
  color: hsl(${s.mutedForegroundColor}); font-size: 13px;
  font-family: '${s.bodyFont}', sans-serif; transition: background-color 0.15s;
  box-sizing: border-box; width: calc(100% - 24px);
}
.mobile-search-btn:hover { background-color: hsl(${s.accentColor}); }
.mobile-tabs {
  display: flex; margin: 4px 12px 8px; border-radius: 8px; padding: 2px;
  background-color: hsl(${s.accentColor});
}
.mobile-tab {
  flex: 1; padding: 6px 0; border-radius: 6px;
  font-size: 11px; font-weight: 500; text-align: center;
  transition: all 0.15s;
}
.mobile-tab.active {
  background-color: hsl(${s.backgroundColor});
  color: hsl(${s.foregroundColor});
}
.mobile-tab:not(.active) { color: hsl(${s.mutedForegroundColor}); }
.mobile-nav-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; }
.mobile-page-btn {
  display: flex; align-items: center; justify-content: space-between;
  text-align: left; padding: 8px 12px; border-radius: 8px;
  font-size: ${s.sidebarFontSize}px;
  font-family: '${s.bodyFont}', sans-serif; transition: background-color 0.15s;
  width: 100%;
}
.mobile-page-btn:hover { background-color: hsl(${s.accentColor}); }
.mobile-page-btn.active {
  background-color: hsl(${s.accentColor});
  color: hsl(${s.sidebarActiveColor}); font-weight: 500;
}
.mobile-page-btn:not(.active) { color: hsl(${s.sidebarTextColor}); }

/* Made with banner */
.made-with {
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 50;
}
.made-with a {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 9999px;
  font-size: 11px; font-weight: 500;
  background-color: hsl(${s.foregroundColor} / 0.85);
  color: hsl(${s.backgroundColor});
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px hsl(${s.foregroundColor} / 0.15);
  transition: transform 0.15s;
}
.made-with a:hover { transform: scale(1.05); text-decoration: none; }

/* Utility */
.hidden { display: none !important; }
@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.search-overlay { animation: fadeIn 0.15s ease-out; }

/* Top-bar Nav (tabs strip + dropdowns) */
.topbar-nav {
  border-top: 1px solid hsl(${s.borderColor});
  background-color: hsl(${s.backgroundColor});
}
.topbar-inner {
  max-width: ${s.contentMaxWidth + s.sidebarWidth + 248}px;
  margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; gap: 16px;
  height: 40px;
}
.tab-strip { display: flex; align-items: center; gap: 4px; height: 100%; }
.tab-strip-btn {
  position: relative;
  padding: 0 12px; height: 100%;
  font-size: 13px; font-weight: 500;
  color: hsl(${s.mutedForegroundColor});
  font-family: '${s.bodyFont}', sans-serif;
  transition: color 0.15s;
}
.tab-strip-btn:hover { color: hsl(${s.foregroundColor}); }
.tab-strip-btn.active { color: hsl(${s.foregroundColor}); }
.tab-strip-btn.active::after {
  content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px;
  height: 2px; background-color: hsl(${s.primaryColor || s.foregroundColor});
  border-radius: 2px 2px 0 0;
}
.dropdown-strip { display: flex; align-items: center; gap: 4px; height: 100%; margin-left: auto; }
.dropdown-wrap { position: relative; height: 100%; display: flex; align-items: center; }
.dropdown-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 0 10px; height: 28px; border-radius: 6px;
  font-size: 13px; font-weight: 500;
  color: hsl(${s.mutedForegroundColor});
  font-family: '${s.bodyFont}', sans-serif;
  transition: background-color 0.15s, color 0.15s;
}
.dropdown-btn:hover, .dropdown-btn.open {
  background-color: hsl(${s.accentColor});
  color: hsl(${s.foregroundColor});
}
.dropdown-arrow { font-size: 10px; opacity: 0.7; }
.dropdown-menu {
  position: absolute; top: calc(100% + 4px); right: 0;
  min-width: 180px; padding: 4px;
  background-color: hsl(${s.backgroundColor});
  border: 1px solid hsl(${s.borderColor});
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  z-index: 50;
  animation: fadeIn 0.1s ease-out;
}
.dropdown-item {
  display: block; width: 100%; text-align: left;
  padding: 6px 10px; border-radius: 4px;
  font-size: 13px; color: hsl(${s.foregroundColor});
  font-family: '${s.bodyFont}', sans-serif;
}
.dropdown-item:hover { background-color: hsl(${s.accentColor}); }
.dropdown-empty { padding: 8px 10px; font-size: 12px; color: hsl(${s.mutedForegroundColor}); }
`;
}
