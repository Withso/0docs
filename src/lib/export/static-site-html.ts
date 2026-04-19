import type { DesignSettings } from "@/hooks/use-design-settings";
import type { ExportPage, ExportSection, ExportBlock, ExportNavGroup, ExportTab } from "./types";
import { generateCSS } from "./static-site-css";
import { generateViewerScript } from "./static-site-viewer";

/**
 * Generates a complete index.html that is a self-contained SPA.
 * React 18 is loaded from CDN — no build step required.
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
    })),
  });

  const css = generateCSS(settings);
  const viewerScript = generateViewerScript();

  // Get the first page slug for default route
  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);
  const firstSlug = sortedPages[0]?.slug || "";

  // SEO: use first page as default
  const defaultTitle = `${projectName} — Documentation`;
  const defaultDescription =
    sortedPages[0]?.meta_description || `Documentation for ${projectName}`;

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
