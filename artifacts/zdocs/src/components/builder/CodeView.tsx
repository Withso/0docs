import { useEffect, useMemo, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { FileCode2 } from "lucide-react";
import { pageToMdx } from "@/lib/mdx-serializer";
import type { Page, Section, Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";

interface Props {
  page: Page | null;
  sections: Section[];
  blocks: Block[];
  settings: DesignSettings;
  projectSlug?: string;
}

/** Resolve "dark" | "light" by reading [data-theme] on <html>. */
function readPlatformTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Define Monaco themes that match the 0docs token system (warm-tinted bg + emerald accent). */
function defineZdocsThemes(monaco: Monaco) {
  monaco.editor.defineTheme("zdocs-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",    foreground: "6b7280", fontStyle: "italic" },
      { token: "keyword",    foreground: "10b981" },
      { token: "string",     foreground: "fbbf24" },
      { token: "number",     foreground: "f472b6" },
      { token: "type",       foreground: "60a5fa" },
      { token: "tag",        foreground: "10b981" },
      { token: "attribute.name", foreground: "60a5fa" },
    ],
    colors: {
      "editor.background":         "#0a0a09",
      "editor.foreground":         "#f5f5f4",
      "editorLineNumber.foreground": "#52525b",
      "editorLineNumber.activeForeground": "#a1a1aa",
      "editor.selectionBackground": "#10b9812e",
      "editor.lineHighlightBackground": "#1a1a18",
      "editorCursor.foreground":   "#10b981",
      "editorIndentGuide.background":       "#1f1e1c",
      "editorIndentGuide.activeBackground": "#2a2a27",
      "editorWidget.background":   "#161614",
      "editorWidget.border":       "#232220",
      "scrollbarSlider.background":       "#26252299",
      "scrollbarSlider.hoverBackground":  "#33322ecc",
      "scrollbarSlider.activeBackground": "#10b98166",
    },
  });

  monaco.editor.defineTheme("zdocs-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment",    foreground: "6b7280", fontStyle: "italic" },
      { token: "keyword",    foreground: "059669" },
      { token: "string",     foreground: "b45309" },
      { token: "number",     foreground: "be185d" },
      { token: "type",       foreground: "1d4ed8" },
      { token: "tag",        foreground: "059669" },
      { token: "attribute.name", foreground: "1d4ed8" },
    ],
    colors: {
      "editor.background":         "#ffffff",
      "editor.foreground":         "#0a0a0a",
      "editorLineNumber.foreground": "#a1a1aa",
      "editorLineNumber.activeForeground": "#52525b",
      "editor.selectionBackground": "#10b98126",
      "editor.lineHighlightBackground": "#fafaf9",
      "editorCursor.foreground":   "#059669",
      "editorIndentGuide.background":       "#ececea",
      "editorIndentGuide.activeBackground": "#d6d6d3",
    },
  });
}

/** Read-only Monaco editor showing the active page as MDX with frontmatter. */
const CodeView = ({ page, sections, blocks, projectSlug }: Props) => {
  const [theme, setTheme] = useState<"dark" | "light">(() => readPlatformTheme());

  // React to platform theme changes (data-theme attribute on <html>)
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(readPlatformTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const mdx = useMemo(
    () => (page ? pageToMdx(page, sections, blocks) : ""),
    [page, sections, blocks],
  );

  if (!page) {
    return (
      <div className="flex flex-1 h-full min-h-0 items-center justify-center text-muted-foreground text-[13px]">
        No page selected.
      </div>
    );
  }

  const filePath = `${projectSlug || "docs"}/${page.slug || "untitled"}.mdx`;
  const monacoTheme = theme === "light" ? "zdocs-light" : "zdocs-dark";

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 bg-background">
      <div className="flex items-center justify-between px-4 h-9 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <FileCode2 className="h-3.5 w-3.5" />
          <span className="font-mono">{filePath}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          Read-only preview
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={mdx}
          theme={monacoTheme}
          beforeMount={defineZdocsThemes}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            renderWhitespace: "none",
            fontFamily: "JetBrains Mono, Menlo, monospace",
            padding: { top: 14, bottom: 14 },
          }}
        />
      </div>
    </div>
  );
};

export default CodeView;
