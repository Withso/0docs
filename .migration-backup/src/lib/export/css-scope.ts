/**
 * Wraps a generated CSS string under a parent selector so it only
 * applies inside that scope (e.g. `html[data-theme="light"]`).
 *
 * Designed for our generator's output specifically: simple selectors,
 * `@media` blocks at the top level. Not a general-purpose CSS scoper.
 */
export function scopeCSS(css: string, scope: string): string {
  // Split into top-level blocks: handles { ... } depth.
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  let i = 0;
  while (i < css.length) {
    const ch = css[i];
    buf += ch;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        out.push(processTopLevelBlock(buf, scope));
        buf = "";
      }
    }
    i++;
  }
  if (buf.trim()) out.push(buf); // trailing whitespace / comments
  return out.join("\n");
}

function processTopLevelBlock(block: string, scope: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";

  // @media / @supports / @keyframes — recurse into the body
  if (trimmed.startsWith("@media") || trimmed.startsWith("@supports")) {
    const openIdx = trimmed.indexOf("{");
    const head = trimmed.slice(0, openIdx + 1);
    const body = trimmed.slice(openIdx + 1, trimmed.lastIndexOf("}"));
    return `${head}\n${scopeCSS(body, scope)}\n}`;
  }
  if (trimmed.startsWith("@")) {
    // @keyframes, @font-face — leave as-is (global)
    return trimmed;
  }

  // Standard rule: prefix every selector in the comma list with scope.
  const openIdx = trimmed.indexOf("{");
  if (openIdx === -1) return trimmed;
  const selectorList = trimmed.slice(0, openIdx).trim();
  const body = trimmed.slice(openIdx);

  const scoped = selectorList
    .split(",")
    .map((sel) => prefixSelector(sel.trim(), scope))
    .join(", ");

  return `${scoped} ${body}`;
}

function prefixSelector(sel: string, scope: string): string {
  if (!sel) return sel;
  // Already targets html/body explicitly — replace with scope when html, prepend when body.
  if (sel === "html" || sel === ":root") return scope;
  if (sel.startsWith("html ")) return `${scope}${sel.slice(4)}`;
  if (sel === "body") return `${scope} body`;
  return `${scope} ${sel}`;
}
