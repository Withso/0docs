// Server-safe MDX → blocks parser. We deliberately keep this dependency-free
// (no remark/rehype) — esbuild bundles cleanly and the parser is fast enough
// for full-page replaces. The supported MDX dialect mirrors what
// mdx-serializer.ts on the client produces, with sensible coverage of the
// most common content blocks.
//
// Output shape matches the editor's in-memory structure:
//   { sections: [{ title, blocks: [{ type, content }] }], frontmatter }
//
// Heading handling: H1 is treated as the page title (consumed at the call
// site), H2 starts a new section, deeper headings become heading blocks
// inside the current section. Content before the first H2 lands in an
// implicit untitled section so nothing gets dropped.

export interface ParsedBlock {
  type: string;
  content: Record<string, unknown>;
}

export interface ParsedSection {
  title: string;
  navTitle?: string | null;
  blocks: ParsedBlock[];
}

export interface ParsedMdx {
  frontmatter: Record<string, unknown>;
  pageTitle?: string;
  sections: ParsedSection[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseFrontmatter(src: string): { frontmatter: Record<string, unknown>; rest: string } {
  const m = src.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: {}, rest: src };
  const body = m[1];
  const fm: Record<string, unknown> = {};
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: string = line.slice(idx + 1).trim();
    // Strip wrapping quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      try { val = JSON.parse(val.replace(/^'/, '"').replace(/'$/, '"')); } catch { val = val.slice(1, -1); }
    }
    if (val === "true") fm[key] = true;
    else if (val === "false") fm[key] = false;
    else if (val === "null") fm[key] = null;
    else fm[key] = val;
  }
  return { frontmatter: fm, rest: src.slice(m[0].length) };
}

interface JsxParse {
  tag: string;
  attrs: Record<string, string>;
  inner: string;
  end: number; // index in src after closing tag
}

// Extract a top-level JSX-like component starting at src[pos]. Handles
// self-closing and balanced same-tag nesting (good enough for our component
// vocabulary — Tabs/Steps/Card/etc.).
function readJsxComponent(src: string, pos: number): JsxParse | null {
  if (src[pos] !== "<") return null;
  const openMatch = src.slice(pos).match(/^<([A-Z][A-Za-z0-9]*)((?:\s+[A-Za-z][A-Za-z0-9]*\s*=\s*"[^"]*")*)\s*(\/?)>/);
  if (!openMatch) return null;
  const tag = openMatch[1];
  const attrStr = openMatch[2] || "";
  const selfClosing = openMatch[3] === "/";
  const attrs: Record<string, string> = {};
  for (const a of attrStr.matchAll(/([A-Za-z][A-Za-z0-9]*)\s*=\s*"([^"]*)"/g)) {
    attrs[a[1]] = a[2];
  }
  if (selfClosing) {
    return { tag, attrs, inner: "", end: pos + openMatch[0].length };
  }
  // Find matching closing tag, allowing nesting of same tag.
  let depth = 1;
  let i = pos + openMatch[0].length;
  const innerStart = i;
  const openRe = new RegExp(`<${tag}(?:\\s|/?>)`, "g");
  const closeRe = new RegExp(`</${tag}\\s*>`, "g");
  while (i < src.length && depth > 0) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const open = openRe.exec(src);
    const close = closeRe.exec(src);
    if (!close) return null;
    if (open && open.index < close.index) {
      depth += 1;
      i = open.index + open[0].length;
    } else {
      depth -= 1;
      if (depth === 0) {
        const inner = src.slice(innerStart, close.index);
        return { tag, attrs, inner, end: close.index + close[0].length };
      }
      i = close.index + close[0].length;
    }
  }
  return null;
}

function jsxToBlock(parse: JsxParse): ParsedBlock | null {
  const { tag, attrs, inner } = parse;
  switch (tag) {
    case "Callout":
    case "Note":
    case "Tip":
    case "Warning":
    case "Info":
      return {
        type: "callout",
        content: {
          variant: (attrs.type || tag.toLowerCase()).toLowerCase(),
          text: inner.trim(),
        },
      };
    case "YouTube":
      return { type: "youtube", content: { videoId: attrs.id || "", url: attrs.id || "" } };
    case "Card":
      return {
        type: "card",
        content: {
          title: attrs.title || "",
          icon: attrs.icon || "",
          href: attrs.href || "",
          description: inner.trim(),
        },
      };
    case "APIEndpoint":
      return {
        type: "api_endpoint",
        content: {
          method: attrs.method || "GET",
          path: attrs.path || "",
          description: inner.trim(),
        },
      };
    case "Tabs": {
      const tabs: Array<{ title: string; content: string }> = [];
      let i = 0;
      while (i < inner.length) {
        const sub = readJsxComponent(inner, inner.indexOf("<Tab", i));
        if (!sub || sub.tag !== "Tab") break;
        tabs.push({ title: sub.attrs.title || "", content: sub.inner.trim() });
        i = sub.end;
      }
      return { type: "tabs", content: { tabs } };
    }
    case "AccordionGroup": {
      const items: Array<{ title: string; content: string }> = [];
      let i = 0;
      while (i < inner.length) {
        const idx = inner.indexOf("<Accordion", i);
        if (idx === -1) break;
        const sub = readJsxComponent(inner, idx);
        if (!sub || sub.tag !== "Accordion") break;
        items.push({ title: sub.attrs.title || "", content: sub.inner.trim() });
        i = sub.end;
      }
      return { type: "accordion", content: { items } };
    }
    case "Steps": {
      const steps: Array<{ title: string; content: string }> = [];
      let i = 0;
      while (i < inner.length) {
        const idx = inner.indexOf("<Step", i);
        if (idx === -1) break;
        const sub = readJsxComponent(inner, idx);
        if (!sub || sub.tag !== "Step") break;
        steps.push({ title: sub.attrs.title || "", content: sub.inner.trim() });
        i = sub.end;
      }
      return { type: "steps", content: { steps } };
    }
    case "CodeTabs": {
      const tabs: Array<{ title: string; language: string; code: string }> = [];
      let i = 0;
      while (i < inner.length) {
        const idx = inner.indexOf("<CodeTab", i);
        if (idx === -1) break;
        const sub = readJsxComponent(inner, idx);
        if (!sub || sub.tag !== "CodeTab") break;
        const codeMatch = sub.inner.match(/```(\w+)?\s*\n([\s\S]*?)\n```/);
        tabs.push({
          title: sub.attrs.title || "",
          language: sub.attrs.lang || codeMatch?.[1] || "",
          code: codeMatch?.[2] ?? "",
        });
        i = sub.end;
      }
      return { type: "code_tabs", content: { tabs } };
    }
    default:
      return { type: "paragraph", content: { text: inner.trim() || `<${tag} />` } };
  }
}

function parseBlocks(body: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let i = 0;
  const lines = body.split(/\r?\n/);

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip.
    if (!line.trim()) { i++; continue; }

    // Code fence: ```lang ... ```
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing fence
      blocks.push({ type: "code_block", content: { language: lang, code: codeLines.join("\n") } });
      continue;
    }

    // Heading (h2+ becomes a heading block; h1 was consumed earlier as page title)
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push({ type: "heading", content: { level, text: heading[2].trim() } });
      i++;
      continue;
    }

    // Horizontal rule — but only standalone "---" not the frontmatter delimiter.
    if (/^-{3,}\s*$/.test(line)) {
      blocks.push({ type: "divider", content: {} });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", content: { text: buf.join("\n") } });
      continue;
    }

    // Image: ![alt](url)
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      blocks.push({ type: "image", content: { alt: img[1], url: img[2] } });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "unordered_list", content: { items } });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ordered_list", content: { items } });
      continue;
    }

    // Markdown table
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[-:\s|]+\|\s*$/.test(lines[i + 1])) {
      const headers = line.split("|").slice(1, -1).map(s => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map(s => s.trim()));
        i++;
      }
      blocks.push({ type: "table", content: { headers, rows } });
      continue;
    }

    // JSX component
    if (/^<[A-Z]/.test(line)) {
      // Reassemble starting from this line for the multi-line reader.
      const remainder = lines.slice(i).join("\n");
      const parsed = readJsxComponent(remainder, 0);
      if (parsed) {
        const block = jsxToBlock(parsed);
        if (block) blocks.push(block);
        // Advance lines counter by however many lines we consumed.
        const consumed = remainder.slice(0, parsed.end).split(/\r?\n/).length;
        i += consumed;
        continue;
      }
    }

    // Default: paragraph (collect consecutive non-blank, non-special lines).
    const paraBuf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^!\[/.test(lines[i]) &&
      !/^<[A-Z]/.test(lines[i]) &&
      !/^-{3,}\s*$/.test(lines[i])
    ) {
      paraBuf.push(lines[i]);
      i++;
    }
    if (paraBuf.length) {
      blocks.push({ type: "paragraph", content: { text: paraBuf.join(" ") } });
    }
  }

  return blocks;
}

export function parseMdxDocument(src: string): ParsedMdx {
  const { frontmatter, rest } = parseFrontmatter(src);

  // Pull out the first H1 as the page title (mintlify convention).
  let pageTitle: string | undefined = typeof frontmatter.title === "string" ? frontmatter.title as string : undefined;
  let body = rest;
  const h1 = body.match(/^#\s+(.*)$/m);
  if (h1) {
    if (!pageTitle) pageTitle = h1[1].trim();
    body = body.replace(h1[0], "").trimStart();
  }

  // Split by H2 — each chunk becomes a section.
  const sections: ParsedSection[] = [];
  const parts = body.split(/^##\s+/m);
  // First part = content before the first H2 → implicit section.
  const lead = parts.shift() || "";
  if (lead.trim()) {
    sections.push({ title: "", blocks: parseBlocks(lead) });
  }
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const title = (nl === -1 ? part : part.slice(0, nl)).trim();
    const rest = nl === -1 ? "" : part.slice(nl + 1);
    sections.push({ title, blocks: parseBlocks(rest) });
  }

  // Empty doc → at least one empty section so callers always have something.
  if (sections.length === 0) {
    sections.push({ title: "", blocks: [] });
  }

  return { frontmatter, pageTitle, sections };
}
