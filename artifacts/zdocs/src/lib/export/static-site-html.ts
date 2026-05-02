import type { DesignSettings } from "@/hooks/use-design-settings";
import type { ExportPage, ExportSection, ExportBlock, ExportNavGroup, ExportTab } from "./types";
import { generateCSS } from "./static-site-css";
import { generateViewerScript } from "./static-site-viewer";
import { applyModeToSettings, getAppearance } from "@/lib/theme/resolve-doc-theme";
import { scopeCSS } from "./css-scope";

/**
 * Generates a complete index.html that is a self-contained SPA.
 * React 18 is loaded from CDN — no build step required.
 *
 * Emits BOTH light and dark themed CSS so visitors get a sun/moon
 * toggle (unless `appearance.strict` is set).
 */
export function generateStaticHTML(
  projectName: string,
  pages: ExportPage[],
  sections: ExportSection[],
  blocks: ExportBlock[],
  navGroups: ExportNavGroup[],
  settings: DesignSettings,
  tabs: ExportTab[] = [],
): string {
  // Collect unique Google Fonts
  const fonts = new Set<string>();
  fonts.add(settings.bodyFont);
  fonts.add(settings.headingFont);
  if (settings.codeFont && !["monospace"].includes(settings.codeFont)) {
    fonts.add(settings.codeFont);
  }
  const fontFamilies = Array.from(fonts)
    .map((f) => f.replace(/\s+/g, "+") + ":wght@300;400;500;600;700")
    .join("&family=");
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;

  // Build content data
  const contentData = JSON.stringify({
    projectName,
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      order_index: p.order_index,
      nav_group_id: p.nav_group_id || null,
      nav_title: p.nav_title || null,
      meta_description: p.meta_description || null,
      metadata: p.metadata || {},
    })),
    sections: sections.map((s) => ({
      id: s.id,
      page_id: s.page_id,
      title: s.title,
      order_index: s.order_index,
      nav_title: s.nav_title || null,
    })),
    blocks: blocks.map((b) => ({
      id: b.id,
      section_id: b.section_id,
      type: b.type,
      content: b.content,
      order_index: b.order_index,
    })),
    navGroups: navGroups.map((g) => ({
      id: g.id,
      title: g.title,
      order_index: g.order_index,
      type: g.type || "label",
      tab_id: g.tab_id || null,
      metadata: g.metadata || {},
    })),
    tabs: tabs.map((t) => ({
      id: t.id,
      label: t.label,
      icon: t.icon || null,
      order_index: t.order_index,
      metadata: t.metadata || {},
    })),
    appearance: getAppearance(settings),
  });

  // Generate dual-mode CSS: dark is the default scope, light is scoped
  // under html[data-theme="light"]. The pre-paint init script picks one
  // before paint to avoid FOUC.
  const darkSettings = applyModeToSettings(settings, "dark");
  const lightSettings = applyModeToSettings(settings, "light");
  const darkCSS = generateCSS(darkSettings);
  const lightCSS = scopeCSS(generateCSS(lightSettings), 'html[data-theme="light"]');
  const css = `${darkCSS}\n${lightCSS}\n${THEME_TOGGLE_CSS}`;
  const viewerScript = generateViewerScript();
  const appearance = getAppearance(settings);

  // Get the first page slug for default route
  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);
  const firstSlug = sortedPages[0]?.slug || "";

  // SEO: use first page as default
  const defaultTitle = `${projectName} — Documentation`;
  const defaultDescription =
    sortedPages[0]?.meta_description || `Documentation for ${projectName}`;

  // Pre-paint theme init: read stored preference, else appearance.default,
  // else system preference. Strict mode pins to appearance.default.
  const themeInit = `
(function(){
  try {
    var KEY = '0docs_theme';
    var def = ${JSON.stringify(appearance.default)};
    var strict = ${JSON.stringify(appearance.strict)};
    var stored = strict ? null : localStorage.getItem(KEY);
    var pref = stored || def;
    var resolved = pref === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : pref;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch(e) {
    document.documentElement.setAttribute('data-theme','dark');
  }
})();`.trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(defaultTitle)}</title>
  <meta name="description" content="${escapeHtml(defaultDescription)}" />
  <meta name="generator" content="0docs" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${googleFontsUrl}" rel="stylesheet" />
  <script>${themeInit}</script>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>${viewerScript}</script>
  <script>
    (function() {
      var data = ${contentData};
      // Set initial hash if none
      if (!window.location.hash && '${firstSlug}') {
        window.location.hash = '#/${firstSlug}';
      }
      window.__bootDocSite(data);

      // Update document title on hash change
      function updateTitle() {
        var slug = window.location.hash.replace('#/','').replace('#','');
        var page = data.pages.find(function(p){return p.slug===slug});
        if (page) {
          document.title = page.title.replace(/<[^>]*>/g,'') + ' — ' + data.projectName;
          var metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc && page.meta_description) metaDesc.setAttribute('content', page.meta_description);
        }
      }
      window.addEventListener('hashchange', updateTitle);
      updateTitle();
    })();
  </script>
</body>
</html>`;
}

const THEME_TOGGLE_CSS = `
/* Theme toggle button (sun/moon) */
.theme-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  color: inherit; opacity: 0.7;
  transition: background-color 0.15s, opacity 0.15s;
}
.theme-toggle:hover { opacity: 1; background-color: rgba(127,127,127,0.1); }
.theme-toggle svg { width: 16px; height: 16px; }
.theme-toggle .moon { display: none; }
.theme-toggle .sun { display: block; }
html[data-theme="light"] .theme-toggle .sun { display: none; }
html[data-theme="light"] .theme-toggle .moon { display: block; }
html, body { transition: background-color 200ms ease, color 200ms ease; }
`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
