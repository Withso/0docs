import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import type { Page, Section, NavGroup } from "@/hooks/use-builder";
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
  onAddPage: (navGroupId?: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDeletePage: (pageId: string) => void;
  onAddNavGroup: () => void;
  onUpdateNavGroup: (groupId: string, updates: Partial<NavGroup>) => void;
  onDeleteNavGroup: (groupId: string) => void;
}

const BuilderSidebar = ({
  settings: s,
  navGroups,
  pages,
  activePage,
  sections,
  onSelectPage,
  onAddPage,
  onUpdatePage,
  onDeletePage,
  onAddNavGroup,
  onUpdateNavGroup,
  onDeleteNavGroup,
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

  // Pages not assigned to any group
  const ungroupedPages = pages.filter((p) => !p.nav_group_id);

  const activeSections = activePage ? sections : [];

  const renderPage = (page: Page) => {
    const isActive = activePage?.id === page.id;
    return (
      <div key={page.id}>
        <div className="group flex items-center gap-1">
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
                color: isActive ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarTextColor})`,
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

        {/* Show sections under active page */}
        {isActive && activeSections.length > 0 && (
          <nav
            className="ml-px mt-px mb-1"
            style={{
              borderLeft: `1px solid hsl(${s.borderColor} / 0.5)`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeSections.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className="block py-[3px] pl-3 transition-colors"
                style={{
                  color: `hsl(${s.sidebarTextColor} / 0.65)`,
                  fontSize: `${s.sidebarFontSize - 1}px`,
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                }}
              >
                {section.title}
              </a>
            ))}
          </nav>
        )}
      </div>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isCollapsed = collapsedGroups.has(group.id);
    const groupPages = pages.filter((p) => p.nav_group_id === group.id);

    return (
      <div key={group.id} className="mb-1">
        {/* Group header */}
        <div className="group flex items-center gap-1">
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
              className="flex-1 py-[2px] bg-transparent border-b outline-none text-[10px] font-semibold uppercase tracking-widest"
              style={{
                borderColor: `hsl(${s.borderColor})`,
                color: `hsl(${s.sidebarTextColor})`,
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
              onDoubleClick={() => setEditingGroupId(group.id)}
              className="flex-1 text-[10px] font-semibold uppercase tracking-widest cursor-default select-none"
              style={{ color: `hsl(${s.sidebarTextColor})` }}
              title="Double-click to rename"
            >
              {group.title}
            </span>
          )}

          <button
            onClick={() => onAddPage(group.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ color: `hsl(${s.sidebarTextColor})` }}
            title="Add page to this group"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDeleteNavGroup(group.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ color: `hsl(${s.mutedForegroundColor})` }}
            title="Delete group"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Group pages */}
        {!isCollapsed && (
          <div className="ml-4 mt-0.5" style={{ gap: `${s.sidebarPageGap}px`, display: "flex", flexDirection: "column" }}>
            {groupPages.length > 0 ? (
              groupPages.map(renderPage)
            ) : (
              <span
                className="text-[11px] italic py-1"
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
      {/* Header with add group button */}
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
              title="Add"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={onAddNavGroup} className="gap-2 text-[12px]">
              <Plus className="h-3.5 w-3.5" />
              Add Label
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddPage()} className="gap-2 text-[12px]">
              <Plus className="h-3.5 w-3.5" />
              Add Page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav groups */}
      <nav className="flex flex-col gap-1">
        {navGroups.map(renderNavGroup)}

        {/* Ungrouped pages */}
        {ungroupedPages.length > 0 && (
          <div style={{ gap: `${s.sidebarPageGap}px`, display: "flex", flexDirection: "column" }}>
            {navGroups.length > 0 && (
              <div
                className="text-[10px] font-semibold uppercase tracking-widest mt-2 mb-1"
                style={{ color: `hsl(${s.mutedForegroundColor})` }}
              >
                Ungrouped
              </div>
            )}
            {ungroupedPages.map(renderPage)}
          </div>
        )}
      </nav>
    </aside>
  );
};

export default BuilderSidebar;
