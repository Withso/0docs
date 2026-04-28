import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight, ChevronDown, FileText, FileJson, Folder, FolderOpen,
  Image as ImageIcon, Plus, FilePlus2, FolderPlus,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Page, NavGroup } from "@/hooks/use-builder";

interface FilesPanelProps {
  pages: Page[];
  navGroups: NavGroup[];
  activePage: Page | null;
  onSelectPage: (page: Page) => void;
  projectSlug?: string;
  onAddPage?: (navGroupId?: string) => void;
  onAddNavGroup?: (type?: "label" | "text" | "dropdown") => void;
}

interface FileNode {
  id: string;
  name: string;
  kind: "folder" | "file";
  path: string;
  ext?: "mdx" | "json" | "svg" | "md";
  page?: Page;
  navGroupId?: string;
  children?: FileNode[];
}

const slugToFile = (slug: string) => `${slug || "untitled"}.mdx`;

const FilesPanel = ({
  pages,
  navGroups,
  activePage,
  onSelectPage,
  onAddPage,
  onAddNavGroup,
}: FilesPanelProps) => {
  const storageKey = `zdocs-files-tree:${pages[0]?.project_id || navGroups[0]?.project_id || "empty"}`;
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setOpenFolders(JSON.parse(saved));
    } catch {
      setOpenFolders({});
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(openFolders));
  }, [storageKey, openFolders]);

  const tree = useMemo<FileNode[]>(() => {
    const nodes: FileNode[] = [];

    nodes.push({ id: "docs.json", name: "docs.json", kind: "file", path: "docs.json", ext: "json" });
    nodes.push({ id: "AGENTS.md", name: "AGENTS.md", kind: "file", path: "AGENTS.md", ext: "md" });

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
        navGroupId: g.id,
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

    nodes.push({ id: "images", name: "images", kind: "folder", path: "images", children: [] });
    nodes.push({ id: "snippets", name: "snippets", kind: "folder", path: "snippets", children: [] });

    return nodes;
  }, [pages, navGroups]);

  return (
    <div className="px-1 py-1.5 select-none">
      {/* Header with Mintlify-style + menu */}
      <div className="flex items-center justify-between px-1.5 h-7 mb-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          File Explorer
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
              title="New"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem
              onClick={() => onAddPage?.()}
              className="gap-2 text-[12.5px]"
              disabled={!onAddPage}
            >
              <FilePlus2 className="h-3.5 w-3.5" /> Create a page
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAddNavGroup?.("label")}
              className="gap-2 text-[12.5px]"
              disabled={!onAddNavGroup}
            >
              <FolderPlus className="h-3.5 w-3.5" /> New folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pb-2 text-[12.5px]">
        {tree.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
            activePageId={activePage?.id}
            onSelectPage={onSelectPage}
            onAddPage={onAddPage}
            openFolders={openFolders}
            setOpenFolders={setOpenFolders}
          />
        ))}
      </div>
    </div>
  );
};

const FileTreeNode = ({
  node,
  depth,
  activePageId,
  onSelectPage,
  onAddPage,
  openFolders,
  setOpenFolders,
}: {
  node: FileNode;
  depth: number;
  activePageId?: string;
  onSelectPage: (page: Page) => void;
  onAddPage?: (navGroupId?: string) => void;
  openFolders: Record<string, boolean>;
  setOpenFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => {
  const open = openFolders[node.id] ?? true;
  const padLeft = 6 + depth * 12;

  if (node.kind === "folder") {
    const Icon = open ? FolderOpen : Folder;
    const Chevron = open ? ChevronDown : ChevronRight;
    return (
      <div className="group/folder">
        <div
          className="w-full flex items-center gap-1 h-7 rounded-sm hover:bg-muted/45 text-muted-foreground hover:text-foreground transition-colors"
          style={{ paddingLeft: padLeft }}
        >
          <button
            onClick={() => setOpenFolders((p) => ({ ...p, [node.id]: !open }))}
            className="flex items-center gap-1 flex-1 min-w-0 text-left"
          >
            <Chevron className="h-3 w-3 shrink-0" />
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{node.name}</span>
          </button>
          {node.navGroupId && onAddPage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddPage(node.navGroupId);
                setOpenFolders((p) => ({ ...p, [node.id]: true }));
              }}
              className="opacity-0 group-hover/folder:opacity-100 transition-opacity h-5 w-5 mr-1 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Create page in this folder"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
        {open && node.children && node.children.length > 0 && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activePageId={activePageId}
                onSelectPage={onSelectPage}
                onAddPage={onAddPage}
                openFolders={openFolders}
                setOpenFolders={setOpenFolders}
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

  const isActive = node.page && activePageId === node.page.id;
  const Icon = node.ext === "json" ? FileJson : node.ext === "svg" ? ImageIcon : FileText;

  return (
    <button
      onClick={() => node.page && onSelectPage(node.page)}
      disabled={!node.page}
      className={`w-full flex items-center gap-1.5 py-1 rounded transition-colors text-left ${
        isActive
          ? "bg-primary/10 text-foreground font-medium"
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
