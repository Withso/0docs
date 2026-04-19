/**
 * Export Engine — converts the internal data model (pages, sections, blocks)
 * into a self-contained static website ready to push to GitHub.
 *
 * Output structure:
 *   index.html          — Complete SPA (React from CDN + viewer + CSS)
 *   content.json        — All pages, sections, blocks as structured JSON
 *   docs.json           — Navigation / metadata
 *   theme.json          — Design tokens
 *   .nojekyll           — GitHub Pages compatibility
 */

import type { DesignSettings } from "@/hooks/use-design-settings";
import type {
  ExportPage,
  ExportSection,
  ExportBlock,
  ExportNavGroup,
  ExportTab,
  ExportResult,
} from "./export/types";
import { generateStaticHTML } from "./export/static-site-html";

// Re-export types for consumers
export type { ExportPage, ExportSection, ExportBlock, ExportNavGroup, ExportTab, ExportResult };

// ── Main export function ────────────────────────────────
export function exportProject(
  pages: ExportPage[],
  sections: ExportSection[],
  blocks: ExportBlock[],
  settings: DesignSettings,
  navGroups: ExportNavGroup[],
  projectName = "Documentation",
  tabs: ExportTab[] = [],
): ExportResult {
  const files: { path: string; content: string }[] = [];

  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);
  const sortedGroups = [...navGroups].sort((a, b) => a.order_index - b.order_index);

  // 1. index.html — the complete static site SPA
  const html = generateStaticHTML(
    projectName,
    pages,
    sections,
    blocks,
    navGroups,
    settings,
  );
  files.push({ path: "index.html", content: html });

  // 2. content.json — structured data (readable in GitHub, also consumed by index.html inline)
  const contentJson = {
    pages: sortedPages.map((p) => ({
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
    navGroups: sortedGroups.map((g) => ({
      id: g.id,
      title: g.title,
      order_index: g.order_index,
      type: g.type || "label",
    })),
  };
  files.push({
    path: "content.json",
    content: JSON.stringify(contentJson, null, 2) + "\n",
  });

  // 3. docs.json — navigation metadata
  const docsJson = {
    navigation: sortedGroups.map((group) => ({
      group: group.title,
      pages: sortedPages
        .filter((p) => p.nav_group_id === group.id)
        .map((p) => ({
          title: p.nav_title || p.title,
          slug: p.slug,
        })),
    })),
    ungrouped: sortedPages
      .filter((p) => !p.nav_group_id)
      .map((p) => ({
        title: p.nav_title || p.title,
        slug: p.slug,
      })),
  };
  files.push({
    path: "docs.json",
    content: JSON.stringify(docsJson, null, 2) + "\n",
  });

  // 4. theme.json — design tokens
  const themeJson = {
    colors: {
      primary: settings.primaryColor,
      background: settings.backgroundColor,
      foreground: settings.foregroundColor,
      border: settings.borderColor,
      mutedForeground: settings.mutedForegroundColor,
      codeBlockBg: settings.codeBlockBg,
    },
    typography: {
      bodyFont: settings.bodyFont,
      headingFont: settings.headingFont,
      codeFont: settings.codeFont,
      baseFontSize: settings.baseFontSize,
      headingFontSize: settings.headingFontSize,
      pageTitleSize: settings.pageTitleSize,
      lineHeight: settings.lineHeight,
      headingWeight: settings.headingWeight,
    },
    layout: {
      contentMaxWidth: settings.contentMaxWidth,
      sidebarWidth: settings.sidebarWidth,
      sectionSpacing: settings.sectionSpacing,
    },
  };
  files.push({
    path: "theme.json",
    content: JSON.stringify(themeJson, null, 2) + "\n",
  });

  // 5. .nojekyll — tells GitHub Pages to serve as-is
  files.push({ path: ".nojekyll", content: "" });

  return { files };
}
