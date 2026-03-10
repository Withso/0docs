import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, FolderPlus, FilePlus } from "lucide-react";
import type { Page, NavGroup, Section } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BuilderSidebarProps {
  settings: DesignSettings;
  navGroups: NavGroup[];
  pages: Page[];
  activePage: Page | null;
  sections: Section[];
  onSelectPage: (page: Page) => void;
  onAddNavGroup: () => void;
  onUpdateNavGroup: (groupId: string, updates: Partial<NavGroup>) => void;
  onDeleteNavGroup: (groupId: string) => void;
  onAddPage: (navGroupId?: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDeletePage: (pageId: string) => void;
}

const BuilderSidebar = ({
  settings: s,
  navGroups,
  pages,
  activePage,
  sections,
  onSelectPage,
  onAddNavGroup,
  onUpdateNavGroup,
  onDeleteNavGroup,
  onAddPage,
  onUpdatePage,
  onDeletePage,
}: BuilderSidebarProps) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Pages not in any group
  const ungroupedPages = pages.filter((p) => !p.nav_group_id);

  const renderPage = (page: Page) => {
    const isActive = activePage?.id === page.id;

    return (
      <div key={page.id} className="group flex items-center gap-1 pl-1">
        {editingPageId === page.id ? (
          <input
            autoFocus
            className="flex-1 py-[3px] bg-transparent border-b outline-none"
            style={{
              fontSize: `${s.sidebarFontSize}px`,
              borderColor: `hsl(${s.borderColor})`,
              color: `hsl(${s.sidebarActiveColor})`,
              fontFamily: `'${s.bodyFont}', sans-serif`,
            }}
            defaultValue={page.title}
            onBlur={(e) => {
              const val = e.target.value.trim() || "Untitled";
              onUpdatePage(page.id, {
                title: val,
                slug: val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              });
              setEditingPageId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingPageId(null);
            }}
          />
        ) : (
          <button
            onClick={() => onSelectPage(page)}
            onDoubleClick={() => setEditingPageId(page.id)}
            className="flex-1 text-left truncate py-[3px] transition-colors"
            style={{
              fontSize: `${s.sidebarFontSize}px`,
              color: isActive
                ? `hsl(${s.sidebarActiveColor})`
                : `hsl(${s.sidebarTextColor})`,
              fontWeight: isActive ? 500 : 400,
              fontFamily: `'${s.bodyFont}', sans-serif`,
            }}
            title="Double-click to rename"
          >
            {page.title}
          </button>
        )}
        <button
          onClick={() => onDeletePage(page.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          style={{ color: `hsl(${s.mutedForegroundColor})` }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isCollapsed = collapsedGroups.has(group.id);
    const groupPages = pages
      .filter((p) => p.nav_group_id === group.id)
      .sort((a, b) => a.order_index - b.order_index);

    return (
      <div key={group.id} className="mb-1">
        {/* Group header */}
        <div className="group/grp flex items-center gap-1">
          <button
            onClick={() => toggleCollapse(group.id)}
            className="shrink-0 p-0.5 transition-colors"
            style={{ color: `hsl(${s.sidebarTextColor})` }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {editingGroupId === group.id ? (
            <input
              autoFocus
              className="flex-1 py-[2px] bg-transparent border-b outline-none text-[11px] font-semibold uppercase tracking-wider"
              style={{
                borderColor: `hsl(${s.borderColor})`,
                color: `hsl(${s.sidebarTextColor})`,
                fontFamily: `'${s.bodyFont}', sans-serif`,
              }}
              defaultValue={group.title}
              onBlur={(e) => {
                const val = e.target.value.trim() || "Untitled";
                onUpdateNavGroup(group.id, { title: val });
                setEditingGroupId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingGroupId(null);
              }}
            />
          ) : (
            <span
              className="flex-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer py-[2px]"
              style={{ color: `hsl(${s.sidebarTextColor} / 0.6)` }}
              onDoubleClick={() => setEditingGroupId(group.id)}
              title="Double-click to rename"
            >
              {group.title}
            </span>
          )}

          <button
            onClick={() => onAddPage(group.id)}
            className="opacity-0 group-hover/grp:opacity-100 transition-opacity shrink-0"
            style={{ color: `hsl(${s.sidebarTextColor})` }}
            title="Add page to section"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDeleteNavGroup(group.id)}
            className="opacity-0 group-hover/grp:opacity-100 transition-opacity shrink-0"
            style={{ color: `hsl(${s.mutedForegroundColor})` }}
            title="Delete section"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Group pages */}
        {!isCollapsed && (
          <div className="ml-3 mt-0.5" style={{ gap: `${s.sidebarPageGap}px`, display: "flex", flexDirection: "column" }}>
            {groupPages.map(renderPage)}
            {groupPages.length === 0 && (
              <span
                className="text-[11px] italic pl-1 py-1"
                style={{ color: `hsl(${s.mutedForegroundColor})` }}
              >
                No pages
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      style={{
        width: `${s.sidebarWidth}px`,
        backgroundColor: `hsl(${s.sidebarBg})`,
        top: "48px",
        height: "calc(100vh - 48px)",
      }}
      className="shrink-0 sticky overflow-y-auto py-8 pr-6 hidden lg:block"
    >
      {/* Header */}
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center justify-between"
        style={{ color: `hsl(${s.sidebarTextColor})` }}
      >
        <span>Side Nav</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="transition-colors hover:opacity-80"
              style={{ color: `hsl(${s.sidebarTextColor})` }}
              title="Add section or page"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={onAddNavGroup} className="gap-2 text-xs">
              <FolderPlus className="h-3.5 w-3.5" />
              Add Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddPage()} className="gap-2 text-xs">
              <FilePlus className="h-3.5 w-3.5" />
              Add Page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav content */}
      <nav style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
        {/* Nav groups */}
        {navGroups
          .sort((a, b) => a.order_index - b.order_index)
          .map(renderNavGroup)}

        {/* Ungrouped pages */}
        {ungroupedPages
          .sort((a, b) => a.order_index - b.order_index)
          .map(renderPage)}
      </nav>
    </aside>
  );
};

export default BuilderSidebar;
