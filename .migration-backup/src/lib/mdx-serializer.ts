/**
 * Serialize a page (sections + blocks + metadata) into MDX with YAML frontmatter.
 * Used by the Code view in the editor for read-only "what gets pushed to Git" preview.
 */
import type { Page, Section, Block } from "@/hooks/use-builder";

const stripHtml = (html: string): string => {
  if (!html) return "";
  const tmp = typeof document !== "undefined" ? document.createElement("div") : null;
  if (tmp) {
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html.replace(/<[^>]+>/g, "");
};

const yamlValue = (v: unknown): string => {
  if (v === null || v === undefined) return '""';
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  const s = String(v);
  if (/[:#\n"']/.test(s)) return JSON.stringify(s);
  return s;
};

const buildFrontmatter = (page: Page): string => {
  const meta = (page as any).metadata || {};
  const lines: string[] = ["---"];
  lines.push(`title: ${yamlValue(page.title)}`);
  if (page.slug) lines.push(`slug: ${yamlValue(page.slug)}`);
  if (page.meta_description) lines.push(`description: ${yamlValue(page.meta_description)}`);
  if (meta.sidebarTitle) lines.push(`sidebarTitle: ${yamlValue(meta.sidebarTitle)}`);
  if (meta.icon) lines.push(`icon: ${yamlValue(meta.icon)}`);
  if (meta.tag) lines.push(`tag: ${yamlValue(meta.tag)}`);
  if (meta.mode && meta.mode !== "default") lines.push(`mode: ${yamlValue(meta.mode)}`);
  if (meta.externalUrl) lines.push(`externalUrl: ${yamlValue(meta.externalUrl)}`);
  if (meta.ogImage) lines.push(`ogImage: ${yamlValue(meta.ogImage)}`);
  if (meta.keywords) lines.push(`keywords: ${yamlValue(meta.keywords)}`);
  if (meta.hidden === true) lines.push(`hidden: true`);
  lines.push("---", "");
  return lines.join("\n");
};

const blockToMdx = (block: Block): string => {
  const c = block.content || {};
  switch (block.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(c.level) || 2, 1), 6);
      return `${"#".repeat(level)} ${stripHtml(c.text || "")}`;
    }
    case "paragraph":
      return stripHtml(c.text || c.html || "");
    case "code_block":
      return `\`\`\`${c.language || ""}\n${c.code || ""}\n\`\`\``;
    case "image":
      return `![${c.alt || ""}](${c.url || ""})`;
    case "video":
      return `<video src="${c.url || ""}" controls={${c.showControls !== false}} />`;
    case "youtube":
      return `<YouTube id="${c.videoId || c.url || ""}" />`;
    case "ordered_list": {
      const items: string[] = c.items || [];
      return items.map((it, i) => `${i + 1}. ${stripHtml(it)}`).join("\n");
    }
    case "unordered_list": {
      const items: string[] = c.items || [];
      return items.map((it) => `- ${stripHtml(it)}`).join("\n");
    }
    case "note":
    case "callout": {
      const variant = c.variant || "info";
      return `<Callout type="${variant}">\n${stripHtml(c.text || "")}\n</Callout>`;
    }
    case "quote":
      return `> ${stripHtml(c.text || "")}`;
    case "divider":
      return `---`;
    case "tabs": {
      const tabs: any[] = c.tabs || [];
      const inner = tabs
        .map((t) => `  <Tab title="${t.title || ""}">\n    ${stripHtml(t.content || "")}\n  </Tab>`)
        .join("\n");
      return `<Tabs>\n${inner}\n</Tabs>`;
    }
    case "accordion": {
      const items: any[] = c.items || [];
      const inner = items
        .map((it) => `  <Accordion title="${it.title || ""}">\n    ${stripHtml(it.content || "")}\n  </Accordion>`)
        .join("\n");
      return `<AccordionGroup>\n${inner}\n</AccordionGroup>`;
    }
    case "card":
      return `<Card title="${c.title || ""}" icon="${c.icon || ""}" href="${c.href || ""}">\n${stripHtml(c.description || "")}\n</Card>`;
    case "steps": {
      const steps: any[] = c.steps || [];
      const inner = steps
        .map((s) => `  <Step title="${s.title || ""}">\n    ${stripHtml(s.content || "")}\n  </Step>`)
        .join("\n");
      return `<Steps>\n${inner}\n</Steps>`;
    }
    case "table": {
      const headers: string[] = c.headers || [];
      const rows: string[][] = c.rows || [];
      if (!headers.length) return "";
      const head = `| ${headers.join(" | ")} |`;
      const sep = `| ${headers.map(() => "---").join(" | ")} |`;
      const body = rows.map((r) => `| ${r.map((cell) => stripHtml(cell || "")).join(" | ")} |`).join("\n");
      return [head, sep, body].filter(Boolean).join("\n");
    }
    case "api_endpoint":
      return `<APIEndpoint method="${c.method || "GET"}" path="${c.path || ""}">\n${stripHtml(c.description || "")}\n</APIEndpoint>`;
    case "code_tabs": {
      const tabs: any[] = c.tabs || [];
      const inner = tabs
        .map(
          (t) =>
            `  <CodeTab title="${t.title || ""}" lang="${t.language || ""}">\n\`\`\`${t.language || ""}\n${t.code || ""}\n\`\`\`\n  </CodeTab>`
        )
        .join("\n");
      return `<CodeTabs>\n${inner}\n</CodeTabs>`;
    }
    case "inline_editor":
      return stripHtml(c.html || c.text || "");
    default:
      return `{/* unsupported block: ${block.type} */}`;
  }
};

const sectionToMdx = (section: Section, blocks: Block[]): string => {
  const sectionBlocks = blocks
    .filter((b) => b.section_id === section.id)
    .sort((a, b) => a.order_index - b.order_index);
  const parts: string[] = [];
  if (section.title && section.title !== "New Section") {
    parts.push(`## ${section.title}`);
  }
  for (const b of sectionBlocks) {
    const md = blockToMdx(b);
    if (md.trim()) parts.push(md);
  }
  return parts.join("\n\n");
};

export const pageToMdx = (
  page: Page,
  sections: Section[],
  blocks: Block[],
): string => {
  const pageSections = sections
    .filter((s) => s.page_id === page.id)
    .sort((a, b) => a.order_index - b.order_index);

  const fm = buildFrontmatter(page);
  const body = pageSections
    .map((s) => sectionToMdx(s, blocks))
    .filter(Boolean)
    .join("\n\n");

  return `${fm}# ${page.title}\n\n${body}\n`;
};
