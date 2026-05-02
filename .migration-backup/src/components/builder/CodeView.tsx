import { useMemo } from "react";
import Editor from "@monaco-editor/react";
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

/** Read-only Monaco editor showing the active page as MDX with frontmatter. */
const CodeView = ({ page, sections, blocks, projectSlug }: Props) => {
  const mdx = useMemo(
    () => (page ? pageToMdx(page, sections, blocks) : ""),
    [page, sections, blocks],
  );

  if (!page) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center text-muted-foreground text-[13px]">
        No page selected.
      </div>
    );
  }

  const filePath = `${projectSlug || "docs"}/${page.slug || "untitled"}.mdx`;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      <div className="flex items-center justify-between px-4 h-9 border-b border-border/40 bg-muted/30">
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
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            renderWhitespace: "none",
            fontFamily: "JetBrains Mono, Menlo, monospace",
          }}
        />
      </div>
    </div>
  );
};

export default CodeView;
