import { forwardRef, useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ChevronRight, ChevronDown, FileText, Folder, Layers,
  Languages, Box, GitBranch, Plus, Settings as SettingsIcon,
  Trash2, Tag, EyeOff, Globe,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent, DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Page, NavGroup, Tab } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";

/**
 * Mintlify-style **Navigation Tree** — replaces the old BuilderSidebar.
 *
 * Design goals (per user spec):
 *  - "Layers"-style compact tree (28px rows, single chevron + icon + label)
 *  - Hover-only actions (settings + delete) on the right edge
 *  - NO sections in the nav (sections live inside the page settings panel
 *    and the content editor itself)
 *  - Every node type opens the same SettingsSidePanel for its own kind
 *  - Drag-and-drop preserved across pages + groups
 */

export type NavSettingsKind =
  | "page" | "group" | "dropdown"
  | "tab" | "language" | "product" | "version";

export interface NavSettingsTarget {
  kind: NavSettingsKind;
  page?: Page;
  group?: NavGroup;
  tab?: Tab;
}

interface Props {
  settings: DesignSettings;
  pages: Page[];
  activePage: Page | null;
  navGroups: NavGroup[];
  tabs: Tab[];
  onSelectPage: (p: Page) => void;
  onAddPage: (navGroupId?: string) => void;
  onUpdatePage: (id: string, updates: Partial<Page>) => void;
  onDeletePage: (id: string) => void;
  onAddNavGroup: (type?: "label" | "text" | "dropdown", tabId?: string | null) => void;
  onUpdateNavGroup: (id: string, updates: Partial<NavGroup>) => void;
  onDeleteNavGroup: (id: string) => void;
  onAddTab: (label?: string, kind?: "tab" | "language" | "product" | "version") => Promise<void> | void;
  onUpdateTab: (id: string, updates: Partial<Tab>) => void;
  onDeleteTab: (id: string) => Promise<void> | void;
  onReorderPages: (pages: Page[]) => void;
  onReorderNavGroups: (groups: NavGroup[]) => void;
  onOpenSettings: (target: NavSettingsTarget) => void;
  /** Currently-selected settings target (used for highlight). */
  selectedSettingsId?: string | null;
}

/* ─── Sortable wrapper ─── */
const Sortable = ({
  id, children,
}: {
  id: string;
  children: (p: { handleProps: Record<string, any>; isDragging: boolean }) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ handleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  );
};

/* ─── Universal row (28px Mintlify clone) ─── */
const TreeRow = ({
  depth = 0,
  label,
  active,
  selected,
  expandable,
  expanded,
  onToggle,
  onClick,
  onDoubleClick,
  rightActions,
  badges,
  handleProps,
  editing,
  onEditDone,
  onEditChange,
  editValue,
}: {
  depth?: number;
  label: string;
  active?: boolean;
  selected?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  rightActions?: React.ReactNode;
  badges?: React.ReactNode;
  handleProps?: Record<string, any>;
  editing?: boolean;
  onEditChange?: (v: string) => void;
  onEditDone?: () => void;
  editValue?: string;
}) => {
  const paddingLeft = 8 + depth * 14;

  return (
    <div
      {...handleProps}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        // Make the clickable row keyboard-accessible. Enter/Space activates
        // the same handler as click; F2 starts inline rename (if available).
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); }
        else if (e.key === "F2") { e.preventDefault(); onDoubleClick?.(); }
        else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && expandable) {
          e.preventDefault(); onToggle?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active || selected ? true : undefined}
      aria-expanded={expandable ? expanded : undefined}
      className={`group/row relative flex items-center h-7 cursor-pointer select-none rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
        active ? "bg-primary/10" : selected ? "bg-muted/70 ring-1 ring-border/50" : "hover:bg-muted/45"
      }`}
      style={{ paddingLeft, paddingRight: 4 }}
    >
      {(active || selected) && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-primary" />
      )}
      {/* Chevron (or spacer) */}
      {expandable ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className="h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground/70 hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}

      {/* Label — `label` may contain user-controlled HTML from inline rich-text
          editing (bold/italic/links). We sanitize defensively rather than trust
          arbitrary keystrokes; an empty fallback prevents nameless rows. */}
      {editing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => onEditChange?.(e.target.value)}
          onBlur={onEditDone}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent text-[12.5px] outline-none border-b border-border"
          aria-label="Rename"
        />
      ) : (
        <span
          className={`flex-1 min-w-0 truncate text-[12.5px] ${active ? "font-medium text-foreground" : "text-foreground/85"}`}
          // Strip tags for safe display in the nav list — keeps rich-text intent
          // (showing the label) without inviting <script>/<img onerror> XSS.
          title={(label || "Untitled").replace(/<[^>]*>/g, "")}
        >
          {(label || "Untitled").replace(/<[^>]*>/g, "") || "Untitled"}
        </span>
      )}

      {!editing && badges && (
        <div className="ml-1 flex items-center gap-0.5 shrink-0 text-muted-foreground/65">
          {badges}
        </div>
      )}

      {/* Hover-only right actions */}
      {!editing && rightActions && (
        <div className="ml-1 flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
          {rightActions}
        </div>
      )}
    </div>
  );
};

/* ─── Action button (icon-only, hover row) ─── */
const RowAction = ({
  icon: Icon, title, onClick, danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    title={title}
    className={`h-5 w-5 rounded flex items-center justify-center hover:bg-background/80 transition-colors ${
      danger ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"
    }`}
  >
    <Icon className="h-3 w-3" />
  </button>
);

/* ─── Add menu (compact tree-style) ─── */
const RowAddMenu = forwardRef<HTMLDivElement, {
  onPage?: () => void;
  onGroup?: () => void;
  onDropdown?: () => void;
}>(({
  onPage, onGroup, onDropdown,
}, ref) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = (action?: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen(false);
    action?.();
  };

  return (
    <div ref={(node) => { menuRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((value) => !value); }}
        title="Add"
        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80"
      >
        <Plus className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 min-w-[160px] overflow-hidden rounded-lg border border-border/40 bg-popover p-1 text-popover-foreground shadow-md">
          {onPage && (
            <button onClick={run(onPage)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent hover:text-accent-foreground">
              <FileText className="h-3.5 w-3.5" /> Page
            </button>
          )}
          {onGroup && (
            <button onClick={run(onGroup)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent hover:text-accent-foreground">
              <Folder className="h-3.5 w-3.5" /> Group
            </button>
          )}
          {onDropdown && (
            <button onClick={run(onDropdown)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent hover:text-accent-foreground">
              <ChevronDown className="h-3.5 w-3.5" /> Dropdown
            </button>
          )}
        </div>
      )}
    </div>
  );
});

RowAddMenu.displayName = "RowAddMenu";

const MetadataBadges = ({ meta }: { meta?: Record<string, any> | null }) => {
  if (!meta) return null;
  return (
    <>
      {meta.externalUrl || meta.link ? <Globe className="h-3 w-3" /> : null}
      {meta.tag || meta.badge ? (
        <span className="inline-flex max-w-[54px] items-center gap-0.5 truncate rounded-sm bg-primary/10 px-1 text-[9px] font-medium text-primary">
          <Tag className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{meta.tag || meta.badge}</span>
        </span>
      ) : null}
      {meta.hidden ? <EyeOff className="h-3 w-3" /> : null}
    </>
  );
};

/* ─── Main component ─── */
const tabKind = (t: Tab): NavSettingsKind => {
  const k = t.metadata?.kind;
  if (k === "language" || k === "product" || k === "version") return k;
  return "tab";
};

const NavigationTree = forwardRef<HTMLDivElement, Props>(({
  pages,
  activePage,
  navGroups,
  tabs,
  onSelectPage,
  onAddPage,
  onUpdatePage,
  onDeletePage,
  onAddNavGroup,
  onUpdateNavGroup,
  onDeleteNavGroup,
  onAddTab,
  onUpdateTab,
  onDeleteTab,
  onReorderPages,
  onReorderNavGroups,
  onOpenSettings,
  selectedSettingsId,
}, ref) => {
  const storageKey = `zdocs-nav-tree:${pages[0]?.project_id || navGroups[0]?.project_id || tabs[0]?.project_id || "empty"}`;
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ kind: "page" | "group" | "tab"; id: string; value: string } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { tabs?: Record<string, boolean>; groups?: Record<string, boolean> };
      setExpandedTabs(parsed.tabs || {});
      setExpandedGroups(parsed.groups || {});
    } catch {
      setExpandedTabs({});
      setExpandedGroups({});
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ tabs: expandedTabs, groups: expandedGroups }));
  }, [storageKey, expandedTabs, expandedGroups]);

  const isTabOpen = (id: string) => expandedTabs[id] ?? true;
  const isGroupOpen = (group: NavGroup) => expandedGroups[group.id] ?? (group.metadata?.expanded !== false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedTabs = useMemo(
    () => [...tabs].sort((a, b) => a.order_index - b.order_index),
    [tabs],
  );

  const groupsForTab = useCallback(
    (tabId: string | null) =>
      navGroups
        .filter((g) => (tabId ? g.tab_id === tabId : !g.tab_id))
        .sort((a, b) => a.order_index - b.order_index),
    [navGroups],
  );

  const pagesForGroup = useCallback(
    (groupId: string | null) =>
      pages
        .filter((p) => (groupId ? p.nav_group_id === groupId : !p.nav_group_id))
        .sort((a, b) => a.order_index - b.order_index),
    [pages],
  );

  const commitEdit = () => {
    if (!editing) return;
    const value = editing.value.trim();
    if (value) {
      if (editing.kind === "page") onUpdatePage(editing.id, { nav_title: value });
      else if (editing.kind === "group") onUpdateNavGroup(editing.id, { title: value });
      else onUpdateTab(editing.id, { label: value });
    }
    setEditing(null);
  };

  /* ─── DnD: pages within their group only (simpler & matches Mintlify) ─── */
  const handlePageDragEnd = useCallback(
    (groupId: string | null) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const list = pagesForGroup(groupId);
      const oldI = list.findIndex((p) => p.id === active.id);
      const newI = list.findIndex((p) => p.id === over.id);
      if (oldI < 0 || newI < 0) return;
      const next = [...list];
      const [m] = next.splice(oldI, 1);
      next.splice(newI, 0, m);
      onReorderPages(next.map((p, i) => ({ ...p, order_index: i })));
    },
    [pagesForGroup, onReorderPages],
  );

  /* ─── Renderers ─── */
  const renderPage = (page: Page, depth: number, handleProps: Record<string, any>) => {
    const active = activePage?.id === page.id;
    const selected = selectedSettingsId === page.id;
    const isEditing = editing?.kind === "page" && editing.id === page.id;
    return (
      <TreeRow
        depth={depth}
        label={page.nav_title || page.title}
        active={active}
        selected={selected}
        badges={<MetadataBadges meta={page.metadata} />}
        handleProps={handleProps}
        editing={isEditing}
        editValue={editing?.value ?? ""}
        onEditChange={(v) => setEditing({ kind: "page", id: page.id, value: v })}
        onEditDone={commitEdit}
        onClick={() => onSelectPage(page)}
        onDoubleClick={() => setEditing({ kind: "page", id: page.id, value: page.nav_title || page.title })}
        rightActions={
          <>
            <RowAction icon={SettingsIcon} title="Settings" onClick={() => onOpenSettings({ kind: "page", page })} />
            <RowAction icon={Trash2} title="Delete" danger onClick={() => onDeletePage(page.id)} />
          </>
        }
      />
    );
  };

  const renderGroup = (g: NavGroup, depth: number, handleProps: Record<string, any>) => {
    const open = isGroupOpen(g);
    const selected = selectedSettingsId === g.id;
    const groupPages = pagesForGroup(g.id);
    const isEditing = editing?.kind === "group" && editing.id === g.id;
    const kind: NavSettingsKind = g.type === "dropdown" ? "dropdown" : "group";
    return (
      <div>
        <TreeRow
          depth={depth}
          label={g.title}
          selected={selected}
          badges={<MetadataBadges meta={g.metadata} />}
          expandable
          expanded={open}
          onToggle={() => setExpandedGroups((p) => ({ ...p, [g.id]: !open }))}
          handleProps={handleProps}
          editing={isEditing}
          editValue={editing?.value ?? ""}
          onEditChange={(v) => setEditing({ kind: "group", id: g.id, value: v })}
          onEditDone={commitEdit}
          onDoubleClick={() => setEditing({ kind: "group", id: g.id, value: g.title })}
          rightActions={
            <>
              <RowAddMenu onPage={() => onAddPage(g.id)} />
              <RowAction icon={SettingsIcon} title="Settings" onClick={() => onOpenSettings({ kind, group: g })} />
              <RowAction icon={Trash2} title="Delete" danger onClick={() => onDeleteNavGroup(g.id)} />
            </>
          }
        />
        {open && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageDragEnd(g.id)}>
            <SortableContext items={groupPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {groupPages.length === 0 ? (
                <button
                  onClick={() => onAddPage(g.id)}
                  className="flex items-center h-7 text-[11.5px] text-muted-foreground/70 hover:text-foreground italic"
                  style={{ paddingLeft: 8 + (depth + 1) * 14 + 22 }}
                >
                  + Add page
                </button>
              ) : (
                groupPages.map((p) => (
                  <Sortable key={p.id} id={p.id}>
                    {({ handleProps: hp }) => renderPage(p, depth + 1, hp)}
                  </Sortable>
                ))
              )}
            </SortableContext>
          </DndContext>
        )}
      </div>
    );
  };

  const renderTab = (tab: Tab) => {
    const open = isTabOpen(tab.id);
    const kind = tabKind(tab);
    const selected = selectedSettingsId === tab.id;
    const groups = groupsForTab(tab.id);
    const isEditing = editing?.kind === "tab" && editing.id === tab.id;
    return (
      <div key={tab.id}>
        <TreeRow
          depth={0}
          label={tab.label}
          selected={selected}
          badges={<MetadataBadges meta={tab.metadata} />}
          expandable
          expanded={open}
          onToggle={() => setExpandedTabs((p) => ({ ...p, [tab.id]: !open }))}
          editing={isEditing}
          editValue={editing?.value ?? ""}
          onEditChange={(v) => setEditing({ kind: "tab", id: tab.id, value: v })}
          onEditDone={commitEdit}
          onDoubleClick={() => setEditing({ kind: "tab", id: tab.id, value: tab.label })}
          rightActions={
            <>
              <RowAddMenu
                onGroup={() => onAddNavGroup("label", tab.id)}
                onDropdown={() => onAddNavGroup("dropdown", tab.id)}
              />
              <RowAction icon={SettingsIcon} title="Settings" onClick={() => onOpenSettings({ kind, tab })} />
              <RowAction icon={Trash2} title="Delete" danger onClick={() => onDeleteTab(tab.id)} />
            </>
          }
        />
        {open && (
          <>
            {groups.length === 0 ? (
              <button
                onClick={() => onAddNavGroup("label", tab.id)}
                className="flex items-center h-7 text-[11.5px] text-muted-foreground/70 hover:text-foreground italic"
                style={{ paddingLeft: 8 + 1 * 14 + 22 }}
              >
                + Add a group
              </button>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => {
                  const { active, over } = e;
                  if (!over || active.id === over.id) return;
                  const oldI = groups.findIndex((g) => g.id === active.id);
                  const newI = groups.findIndex((g) => g.id === over.id);
                  if (oldI < 0 || newI < 0) return;
                  const next = [...groups];
                  const [m] = next.splice(oldI, 1);
                  next.splice(newI, 0, m);
                  onReorderNavGroups(next.map((g, i) => ({ ...g, order_index: i })));
                }}
              >
                <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                  {groups.map((g) => (
                    <Sortable key={g.id} id={g.id}>
                      {({ handleProps: hp }) => renderGroup(g, 1, hp)}
                    </Sortable>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </div>
    );
  };

  /* ─── Top level render ─── */
  const rootGroups = groupsForTab(null);
  const rootPages = pagesForGroup(null);

  return (
    <div ref={ref} className="flex flex-col gap-px px-1 py-1.5 select-none">
      {/* Compact header row */}
      <div className="flex items-center justify-between px-1.5 h-7 mb-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Navigation</span>
        <div className="flex items-center gap-0.5">
          <RowAddMenu
            onPage={() => onAddPage()}
            onGroup={() => onAddNavGroup("label")}
            onDropdown={() => onAddNavGroup("dropdown")}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Wrap with"
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                <Layers className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px] p-1">
              <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Wrap with
              </div>
              <DropdownMenuItem onClick={() => onAddTab("New Tab", "tab")} className="gap-2 text-[12px]">
                <Layers className="h-3.5 w-3.5" /> Tab
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddNavGroup("dropdown")} className="gap-2 text-[12px]">
                <ChevronDown className="h-3.5 w-3.5" /> Dropdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTab("English", "language")} className="gap-2 text-[12px]">
                <Languages className="h-3.5 w-3.5" /> Language
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTab("New Product", "product")} className="gap-2 text-[12px]">
                <Box className="h-3.5 w-3.5" /> Product
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTab("v1.0", "version")} className="gap-2 text-[12px]">
                <GitBranch className="h-3.5 w-3.5" /> Version
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Root pages (no group, no tab) */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageDragEnd(null)}>
        <SortableContext items={rootPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {rootPages.map((p) => (
            <Sortable key={p.id} id={p.id}>
              {({ handleProps: hp }) => renderPage(p, 0, hp)}
            </Sortable>
          ))}
        </SortableContext>
      </DndContext>

      {/* Root groups */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          const { active, over } = e;
          if (!over || active.id === over.id) return;
          const oldI = rootGroups.findIndex((g) => g.id === active.id);
          const newI = rootGroups.findIndex((g) => g.id === over.id);
          if (oldI < 0 || newI < 0) return;
          const next = [...rootGroups];
          const [m] = next.splice(oldI, 1);
          next.splice(newI, 0, m);
          onReorderNavGroups(next.map((g, i) => ({ ...g, order_index: i })));
        }}
      >
        <SortableContext items={rootGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          {rootGroups.map((g) => (
            <Sortable key={g.id} id={g.id}>
              {({ handleProps: hp }) => renderGroup(g, 0, hp)}
            </Sortable>
          ))}
        </SortableContext>
      </DndContext>

      {/* Tabs (after root content, like layered stacks in Mintlify) */}
      {sortedTabs.map(renderTab)}

      {/* Empty state */}
      {pages.length === 0 && navGroups.length === 0 && tabs.length === 0 && (
        <div className="px-3 py-4 text-[11.5px] text-muted-foreground/70 italic">
          No content yet. Use the + button to create a page or group.
        </div>
      )}
    </div>
  );
});

NavigationTree.displayName = "NavigationTree";

export default NavigationTree;
