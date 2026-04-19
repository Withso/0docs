import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, FileText, FileJson, Folder, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { Page, NavGroup } from "@/hooks/use-builder";

interface FilesPanelProps {
  pages: Page[];
  navGroups: NavGroup[];
  activePage: Page | null;
  onSelectPage: (page: Page) => void;
  projectSlug?: string;
}

interface FileNode {
  id: string;
  name: string;
  kind: "folder" | "file";
  path: string;
  ext?: "mdx" | "json" | "svg" | "md";
  page?: Page;
  children?: FileNode[];
}

const slugToFile = (slug: string) => `${slug || "untitled"}.mdx`;

const FilesPanel = ({ pages, navGroups, activePage, onSelectPage }: FilesPanelProps) => {
  const tree = useMemo<FileNode[]>(() => {
    const nodes: FileNode[] = [];

    // Top-level config files
    nodes.push({
      id: "docs.json",
      name: "docs.json",
      kind: "file",
      path: "docs.json",
      ext: "json",
    });
    nodes.push({
      id: "AGENTS.md",
      name: "AGENTS.md",
      kind: "file",
      path: "AGENTS.md",
      ext: "md",
    });

    // Ungrouped pages → root .mdx
    const ungrouped = pages
      .filter((p) => !p.nav_group_id)
      .sort((a, b) => a.order_index - b.order_index);

    ungrouped.forEach((p) => {
      nodes.push({
        id: `page-${p.id}`,
        name: slugToFile(p.slug),
        kind: "file",
        path: slugToFile(p.slug),
        ext: "mdx",
        page: p,
      });
    });

    // Each nav group → folder containing its pages
    const sortedGroups = [...navGroups].sort((a, b) => a.order_index - b.order_index);
    sortedGroups.forEach((g) => {
      const folderName = (g.title || "untitled")
        .toLowerCase()
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const groupPages = pages
        .filter((p) => p.nav_group_id === g.id)
        .sort((a, b) => a.order_index - b.order_index);
      nodes.push({
        id: `group-${g.id}`,
        name: folderName || "group",
        kind: "folder",
        path: folderName,
        children: groupPages.map((p) => ({
          id: `page-${p.id}`,
          name: slugToFile(p.slug),
          kind: "file" as const,
          path: `${folderName}/${slugToFile(p.slug)}`,
          ext: "mdx" as const,
          page: p,
        })),
      });
    });

    // Common asset folders (placeholders)
    nodes.push({
      id: "images",
      name: "images",
      kind: "folder",
      path: "images",
      children: [],
    });
    nodes.push({
      id: "snippets",
      name: "snippets",
      kind: "folder",
      path: "snippets",
      children: [],
    });

    return nodes;
  }, [pages, navGroups]);

  return (
    <div className="px-1 py-2 text-[12.5px]">
      {tree.map((node) => (
        <FileTreeNode
          key={node.id}
          node={node}
          depth={0}
          activePageId={activePage?.id}
          onSelectPage={onSelectPage}
        />
      ))}
    </div>
  );
};

const FileTreeNode = ({
  node,
  depth,
  activePageId,
  onSelectPage,
}: {
  node: FileNode;
  depth: number;
  activePageId?: string;
  onSelectPage: (page: Page) => void;
}) => {
  const [open, setOpen] = useState(true);
  const padLeft = 6 + depth * 12;

  if (node.kind === "folder") {
    const Icon = open ? FolderOpen : Folder;
    const Chevron = open ? ChevronDown : ChevronRight;
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-1 py-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          style={{ paddingLeft: padLeft }}
        >
          <Chevron className="h-3 w-3 shrink-0" />
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && node.children.length > 0 && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activePageId={activePageId}
                onSelectPage={onSelectPage}
              />
            ))}
          </div>
        )}
        {open && node.children && node.children.length === 0 && (
          <div
            className="text-[11px] text-muted-foreground/60 italic py-1"
            style={{ paddingLeft: padLeft + 16 }}
          >
            empty
          </div>
        )}
      </div>
    );
  }

  // file
  const isActive = node.page && activePageId === node.page.id;
  const Icon = node.ext === "json" ? FileJson : node.ext === "svg" ? ImageIcon : FileText;

  return (
    <button
      onClick={() => node.page && onSelectPage(node.page)}
      disabled={!node.page}
      className={`w-full flex items-center gap-1.5 py-1 rounded transition-colors text-left ${
        isActive
          ? "bg-muted text-foreground font-medium"
          : node.page
            ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            : "text-muted-foreground/60 cursor-default"
      }`}
      style={{ paddingLeft: padLeft + 14 }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

export default FilesPanel;
