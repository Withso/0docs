/**
 * Export Engine — converts the internal data model (pages, sections, blocks)
 * into a flat map of file paths → content strings, ready to push to GitHub.
 *
 * Output structure:
 *   docs/{page-slug}.mdx   — one file per page
 *   docs.json               — navigation / metadata
 *   theme.json              — design tokens
 */

import type { DesignSettings } from "@/hooks/use-design-settings";

// ── Types ──────────────────────────────────────────────
interface ExportPage {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  meta_description?: string | null;
  nav_group_id?: string | null;
  nav_title?: string | null;
}

interface ExportSection {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
  nav_title?: string | null;
}

interface ExportBlock {
  id: string;
  section_id: string;
  type: string;
  content: any;
  order_index: number;
}

interface ExportNavGroup {
  id: string;
  title: string;
  order_index: number;
  type?: string;
}

export interface ExportResult {
  files: { path: string; content: string }[];
}

// ── Block → Markdown ────────────────────────────────────
function blockToMarkdown(block: ExportBlock): string {
  const c = block.content || {};

  switch (block.type) {
    case "paragraph":
      return (c.text || c.html || "") + "\n";

    case "heading":
      return `### ${c.text || ""}\n`;

    case "code_block": {
      const lang = c.language || "";
      const code = c.code || c.text || "";
      return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
    }

    case "code_tabs": {
      const tabs = c.tabs || [];
      return tabs
        .map((tab: any) => {
          const label = tab.label || tab.language || "";
          const code = tab.code || tab.content || "";
          const lang = tab.language || "";
          return `#### ${label}\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
        })
        .join("\n");
    }

    case "image":
      return `![${c.alt || ""}](${c.url || c.src || ""})\n`;

    case "video":
      return `<video src="${c.url || ""}" controls />\n`;

    case "youtube":
      return `<iframe src="https://www.youtube.com/embed/${c.videoId || ""}" frameborder="0" allowfullscreen></iframe>\n`;

    case "ordered_list": {
      const items = c.items || [];
      return items.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n") + "\n";
    }

    case "unordered_list": {
      const items = c.items || [];
      return items.map((item: string) => `- ${item}`).join("\n") + "\n";
    }

    case "note":
      return `> **${c.type || "Note"}**: ${c.text || c.content || ""}\n`;

    case "callout":
      return `> **${c.title || ""}**\n> ${c.text || c.content || ""}\n`;

    case "quote":
      return `> ${c.text || c.content || ""}\n`;

    case "divider":
      return "---\n";

    case "table": {
      const headers = c.headers || [];
      const rows = c.rows || [];
      if (headers.length === 0) return "";
      const headerLine = `| ${headers.join(" | ")} |`;
      const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
      const dataLines = rows
        .map((row: string[]) => `| ${row.join(" | ")} |`)
        .join("\n");
      return `${headerLine}\n${separatorLine}\n${dataLines}\n`;
    }

    case "api_endpoint": {
      const method = (c.method || "GET").toUpperCase();
      const path = c.path || "";
      const desc = c.description || "";
      let md = `#### \`${method} ${path}\`\n\n${desc}\n`;
      if (c.parameters && c.parameters.length > 0) {
        md += "\n**Parameters:**\n\n";
        md += "| Name | Type | Description |\n| --- | --- | --- |\n";
        for (const p of c.parameters) {
          md += `| \`${p.name || ""}\` | ${p.type || ""} | ${p.description || ""} |\n`;
        }
      }
      if (c.response) {
        md += `\n**Response:**\n\n\`\`\`json\n${typeof c.response === "string" ? c.response : JSON.stringify(c.response, null, 2)}\n\`\`\`\n`;
      }
      return md;
    }

    case "tabs": {
      const tabs = c.tabs || [];
      return tabs
        .map((tab: any) => `#### ${tab.label || ""}\n\n${tab.content || ""}\n`)
        .join("\n");
    }

    case "accordion": {
      const items = c.items || [];
      return items
        .map((item: any) => `<details>\n<summary>${item.title || ""}</summary>\n\n${item.content || ""}\n\n</details>\n`)
        .join("\n");
    }

    case "card":
      return `> **${c.title || ""}**\n>\n> ${c.description || c.content || ""}\n`;

    case "steps": {
      const steps = c.steps || [];
      return steps
        .map((step: any, i: number) => `${i + 1}. **${step.title || ""}**\n   ${step.content || ""}`)
        .join("\n\n") + "\n";
    }

    case "inline_editor":
      return (c.html || c.text || c.content || "") + "\n";

    default:
      return c.text || c.content || c.html || "";
  }
}

// ── Frontmatter ────────────────────────────────────────
function buildFrontmatter(page: ExportPage): string {
  const lines = ["---"];
  lines.push(`title: "${page.title.replace(/"/g, '\\"')}"`);
  if (page.meta_description) {
    lines.push(`description: "${page.meta_description.replace(/"/g, '\\"')}"`);
  }
  lines.push(`slug: "${page.slug}"`);
  lines.push(`order: ${page.order_index}`);
  if (page.nav_title) lines.push(`sidebar_label: "${page.nav_title.replace(/"/g, '\\"')}"`);
  lines.push("---");
  return lines.join("\n");
}

// ── Main export function ────────────────────────────────
export function exportProject(
  pages: ExportPage[],
  sections: ExportSection[],
  blocks: ExportBlock[],
  settings: DesignSettings,
  navGroups: ExportNavGroup[],
): ExportResult {
  const files: { path: string; content: string }[] = [];

  // Sort pages
  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);

  for (const page of sortedPages) {
    const pageSections = sections
      .filter((s) => s.page_id === page.id)
      .sort((a, b) => a.order_index - b.order_index);

    let content = buildFrontmatter(page) + "\n\n";

    for (const section of pageSections) {
      // Strip HTML tags from section title for markdown heading
      const sectionTitle = section.title.replace(/<[^>]*>/g, "");
      if (sectionTitle.trim()) {
        content += `## ${sectionTitle}\n\n`;
      }

      const sectionBlocks = blocks
        .filter((b) => b.section_id === section.id)
        .sort((a, b) => a.order_index - b.order_index);

      for (const block of sectionBlocks) {
        content += blockToMarkdown(block) + "\n";
      }
    }

    files.push({
      path: `docs/${page.slug}.mdx`,
      content: content.trimEnd() + "\n",
    });
  }

  // docs.json — navigation metadata
  const sortedGroups = [...navGroups].sort((a, b) => a.order_index - b.order_index);

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

  // theme.json — design tokens
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

  return { files };
}
