import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Plus, Trash2, Tag, FileText, Pencil, Type, GripVertical,
  Settings as SettingsIcon, ChevronDown, ChevronRight,
  Folder, FolderOpen, Layers, Languages, Box, GitBranch,
} from "lucide-react";
// GroupSettingsDialog removed — settings now open in a side panel managed by Builder.tsx
// Note: TabsManager is no longer rendered here — tabs render inline as collapsible group headers.
import type { Page, Section, NavGroup, Tab } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import InlineRichText from "./InlineRichText";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BuilderSidebarProps {
  settings: DesignSettings;
  pages: Page[];
  activePage: Page | null;
  sections: Section[];
  navGroups: NavGroup[];
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string | null) => void;
  onAddTab: (label?: string, kind?: "tab" | "language" | "product" | "version") => Promise<void> | void;
  onUpdateTab: (tabId: string, updates: Partial<Tab>) => Promise<void> | void;
  onDeleteTab: (tabId: string) => Promise<void> | void;
  onReorderTabs: (reordered: Tab[]) => Promise<void> | void;
  onSelectPage: (page: Page) => void;
  onAddPage: (navGroupId?: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDeletePage: (pageId: string) => void;
  onAddNavGroup: (type?: "label" | "text" | "dropdown", tabId?: string | null) => void;
  onUpdateNavGroup: (groupId: string, updates: Partial<NavGroup>) => void;
  onDeleteNavGroup: (groupId: string) => void;
  onReorderPages: (pages: Page[]) => void;
  onReorderNavGroups: (groups: NavGroup[]) => void;
  onReorderSections: (sections: Section[]) => void;
  /** Open the per-page settings side panel (Mintlify-style). */
  onOpenPageSettings?: (page: Page) => void;
  /** Open the per-group settings side panel. */
  onOpenGroupSettings?: (group: NavGroup) => void;
}

/* ─── Unified flat item types ─── */
type FlatItemType = "page" | "label" | "text" | "dropdown";

interface FlatItem {
  sortId: string;         // unique id for dnd-kit
  type: FlatItemType;
  pageData?: Page;
  groupData?: NavGroup;
}

const PAGE_PREFIX = "page::";
const GROUP_PREFIX = "group::";

const toSortId = (type: "page" | "group", id: string) =>
  type === "page" ? `${PAGE_PREFIX}${id}` : `${GROUP_PREFIX}${id}`;
const isPageSortId = (id: string) => id.startsWith(PAGE_PREFIX);
const isGroupSortId = (id: string) => id.startsWith(GROUP_PREFIX);
const extractId = (sortId: string) =>
  sortId.startsWith(PAGE_PREFIX)
    ? sortId.slice(PAGE_PREFIX.length)
    : sortId.slice(GROUP_PREFIX.length);

/* ─── Sortable wrapper with drag handle ─── */
const SortableItem = ({
  id,
  children,
  dragHandleOnly,
}: {
  id: string;
  children: (props: { handleProps: Record<string, any>; isDragging: boolean }) => React.ReactNode;
  dragHandleOnly?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: "relative" as const,
  };

  const handleProps = dragHandleOnly ? { ...attributes, ...listeners } : {};
  const wrapperProps = dragHandleOnly ? {} : { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style} {...wrapperProps}>
      {children({ handleProps, isDragging })}
    </div>
  );
};

/* ─── Reusable Add menu (Page / Group / Dropdown) ───
 * Used in two places:
 *   1. Top of the navigation panel (adds to General/root).
 *   2. Inside each Tab header (adds Group/Dropdown directly into that tab).
 * Pass `compact` to hide the "Page" entry — used inside Tab headers where
 * pages live within a group (matches Mintlify's mental model).
 */
const AddItemMenu = ({
  onAddPage,
  onAddGroup,
  onAddDropdown,
  textColor,
  title = "Add",
  compact,
  size = "sm",
}: {
  onAddPage?: () => void;
  onAddGroup: () => void;
  onAddDropdown: () => void;
  textColor: string;
  title?: string;
  compact?: boolean;
  size?: "sm" | "xs";
}) => {
  const dim = size === "xs" ? "h-5 w-5" : "h-6 w-6";
  const ic  = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`${dim} rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors`}
          style={{ color: `hsl(${textColor})` }}
          title={title}
          onClick={(e) => e.stopPropagation()}
        >
          <Plus className={ic} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] p-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Add
        </div>
        {!compact && onAddPage && (
          <DropdownMenuItem onClick={onAddPage} className="gap-2 text-[12.5px]">
            <FileText className="h-3.5 w-3.5" /> Page
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onAddGroup} className="gap-2 text-[12.5px]">
          <Tag className="h-3.5 w-3.5" /> Group
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddDropdown} className="gap-2 text-[12.5px]">
          <ChevronDown className="h-3.5 w-3.5" /> Dropdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const BuilderSidebar = ({
  settings: s,
  pages,
  activePage,
  sections,
  navGroups,
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onUpdateTab,
  onDeleteTab,
  onReorderTabs,
  onSelectPage,
  onAddPage,
  onUpdatePage,
  onDeletePage,
  onAddNavGroup,
  onUpdateNavGroup,
  onDeleteNavGroup,
  onReorderPages,
  onReorderNavGroups,
  onReorderSections,
  onOpenPageSettings,
  onOpenGroupSettings,
}: BuilderSidebarProps) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const stopEditing = useCallback(() => {
    setEditingPageId(null);
    setEditingGroupId(null);
    setEditingSectionId(null);
  }, []);

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order_index - b.order_index),
    [sections]
  );

  // IntersectionObserver for section highlighting in editor sidebar
  useEffect(() => {
    if (!activePage || sortedSections.length === 0) {
      setActiveSectionId(null);
      return;
    }

    const timer = setTimeout(() => {
      const visibilityMap = new Map<string, IntersectionObserverEntry>();

      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => visibilityMap.set(entry.target.id, entry));

          let bestId: string | null = null;
          let bestTop = Infinity;

          visibilityMap.forEach((entry, elementId) => {
            if (!entry.isIntersecting) return;
            const top = entry.boundingClientRect.top;
            if (top < bestTop) {
              bestTop = top;
              bestId = elementId.replace("section-", "");
            }
          });

          if (!bestId) {
            let lastPastId: string | null = null;
            for (const sec of sortedSections) {
              const entry = visibilityMap.get(`section-${sec.id}`);
              if (entry && entry.boundingClientRect.top < 0) {
                lastPastId = sec.id;
              }
            }
            if (lastPastId) bestId = lastPastId;
          }

          if (bestId) setActiveSectionId(bestId);
        },
        { rootMargin: "-10% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
      );

      const els = sortedSections
        .map((sec) => document.getElementById(`section-${sec.id}`))
        .filter(Boolean) as HTMLElement[];

      els.forEach((el) => observerRef.current!.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [activePage?.id, sortedSections]);

  /* ─── Build unified flat list ───
   * We merge nav groups and pages into one flat list ordered by a global position.
   * The global position is derived from nav_group order and page order within groups.
   * Structure: [ungrouped pages..., group1, group1-pages..., group2, group2-pages..., ...]
   */
  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    // Filter groups by activeTabId: null = show all; otherwise only matching groups (and ones with no tab)
    const sortedGroups = [...navGroups]
      .filter((g) => activeTabId === null || g.tab_id === activeTabId || !g.tab_id)
      .sort((a, b) => a.order_index - b.order_index);

    const visibleGroupIds = new Set(sortedGroups.map((g) => g.id));

    // Ungrouped pages first (always visible)
    const ungrouped = pages
      .filter((p) => !p.nav_group_id)
      .sort((a, b) => a.order_index - b.order_index);
    ungrouped.forEach((p) => {
      items.push({ sortId: toSortId("page", p.id), type: "page", pageData: p });
    });

    // Then each visible nav group + its pages
    sortedGroups.forEach((g) => {
      const itemType: FlatItemType =
        g.type === "text" ? "text" : g.type === "dropdown" ? "dropdown" : "label";
      items.push({
        sortId: toSortId("group", g.id),
        type: itemType,
        groupData: g,
      });
      const groupPages = pages
        .filter((p) => p.nav_group_id === g.id)
        .sort((a, b) => a.order_index - b.order_index);
      groupPages.forEach((p) => {
        items.push({ sortId: toSortId("page", p.id), type: "page", pageData: p });
      });
    });

    return items;
  }, [pages, navGroups, activeTabId]);

  const flatSortIds = useMemo(() => flatItems.map((i) => i.sortId), [flatItems]);

  /* ─── After drag end: derive group membership from position ─── */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeIdx = flatItems.findIndex((i) => i.sortId === active.id);
      const overIdx = flatItems.findIndex((i) => i.sortId === over.id);
      if (activeIdx === -1 || overIdx === -1) return;

      // Reorder the flat list
      const reordered = [...flatItems];
      const [moved] = reordered.splice(activeIdx, 1);
      reordered.splice(overIdx, 0, moved);

      // Derive group membership: scan top-to-bottom, track current group
      let currentGroupId: string | null = null;
      const updatedPages: Page[] = [];
      const updatedGroups: NavGroup[] = [];
      let pageIndexInGroup = 0;
      let groupGlobalIndex = 0;

      for (const item of reordered) {
        if (item.type === "label" || item.type === "text") {
          // Reset page counter for new group
          currentGroupId = item.groupData!.id;
          pageIndexInGroup = 0;
          updatedGroups.push({
            ...item.groupData!,
            order_index: groupGlobalIndex++,
          });
        } else if (item.type === "page") {
          updatedPages.push({
            ...item.pageData!,
            nav_group_id: currentGroupId,
            order_index: pageIndexInGroup++,
          });
        }
      }

      // Also include pages not in reordered (shouldn't happen but safety)
      const reorderedPageIds = new Set(updatedPages.map((p) => p.id));
      pages.forEach((p) => {
        if (!reorderedPageIds.has(p.id)) updatedPages.push(p);
      });

      onReorderPages(updatedPages);
      if (updatedGroups.length > 0) onReorderNavGroups(updatedGroups);
    },
    [flatItems, pages, onReorderPages, onReorderNavGroups]
  );

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = sortedSections.findIndex((sec) => sec.id === active.id);
      const newIndex = sortedSections.findIndex((sec) => sec.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = [...sortedSections];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      onReorderSections(reordered.map((sec, i) => ({ ...sec, order_index: i })));
    },
    [sortedSections, onReorderSections]
  );

  /* ─── Render: page item ─── */
  const renderPageItem = (page: Page, handleProps: Record<string, any>) => {
    const isActive = activePage?.id === page.id;
    const isEditing = editingPageId === page.id;

    return (
      <>
        <div className="group flex items-center gap-1">
          <span
            className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity"
            style={{ color: `hsl(${s.sidebarTextColor})` }}
            {...handleProps}
          >
            <GripVertical className="h-3 w-3" />
          </span>
          {isEditing ? (
            <InlineRichText
              value={page.nav_title || page.title}
              onChange={(html) => {
                onUpdatePage(page.id, { nav_title: html });
              }}
              onDone={() => setEditingPageId(null)}
              settings={s}
              singleLine
              placeholder="Nav title..."
              className="flex-1 py-[3px] min-w-0"
              style={{
                fontSize: `${s.sidebarFontSize}px`,
                color: `hsl(${s.sidebarActiveColor})`,
                fontFamily: `'${s.bodyFont}', sans-serif`,
              }}
            />
          ) : (
            <button
              onClick={() => onSelectPage(page)}
              onDoubleClick={() => {
                stopEditing();
                setEditingPageId(page.id);
              }}
              className="flex-1 text-left truncate py-[3px] transition-colors cursor-pointer select-none"
              style={{
                fontSize: `${s.sidebarFontSize}px`,
                color: isActive ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarTextColor})`,
                fontWeight: isActive ? 500 : 400,
                fontFamily: `'${s.bodyFont}', sans-serif`,
              }}
              dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }}
            />
          )}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => { stopEditing(); setEditingPageId(page.id); }}
                style={{ color: `hsl(${s.mutedForegroundColor})` }}
                title="Rename"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              {onOpenPageSettings && (
                <button
                  onClick={() => onOpenPageSettings(page)}
                  style={{ color: `hsl(${s.mutedForegroundColor})` }}
                  title="Page settings"
                  className="ml-0.5"
                >
                  <SettingsIcon className="h-2.5 w-2.5" />
                </button>
              )}
              <button
                onClick={() => onDeletePage(page.id)}
                style={{ color: `hsl(${s.mutedForegroundColor})` }}
                title="Delete"
                className="ml-0.5"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Sections under active page */}
        {isActive && sortedSections.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
            <SortableContext items={sortedSections.map((sec) => sec.id)} strategy={verticalListSortingStrategy}>
              <nav
                className="ml-4 mt-px mb-1"
                style={{
                  borderLeft: `1px solid hsl(${s.borderColor} / 0.5)`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {sortedSections.map((section) => {
                  const isSectionActive = s.sidebarShowSectionTracker && activeSectionId === section.id;
                  const isSectionEditing = editingSectionId === section.id;

                  return (
                    <SortableItemSimple key={section.id} id={section.id}>
                      <div className="relative group/section">
                        {isSectionActive && (
                          <span
                            className="absolute left-[-1px] top-[5px] bottom-[5px] w-[2px] rounded-full"
                            style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
                          />
                        )}
                        {isSectionEditing ? (
                          <div className="pl-3 py-[3px]">
                            <InlineRichText
                              value={section.nav_title || section.title}
                              onChange={(html) => {
                                window.dispatchEvent(
                                  new CustomEvent("builder:updateSection", {
                                    detail: { id: section.id, updates: { nav_title: html } },
                                  })
                                );
                              }}
                              onDone={() => setEditingSectionId(null)}
                              settings={s}
                              singleLine
                              placeholder="Nav title..."
                              className="min-w-0"
                              style={{
                                color: `hsl(${s.sidebarActiveColor})`,
                                fontSize: `${s.sidebarFontSize - 1}px`,
                                fontFamily: `'${s.bodyFont}', sans-serif`,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <a
                              href={`#section-${section.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                const el = document.getElementById(`section-${section.id}`);
                                if (el) {
                                  const top = el.getBoundingClientRect().top + window.scrollY - 72;
                                  window.scrollTo({ top, behavior: "smooth" });
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                stopEditing();
                                setEditingSectionId(section.id);
                              }}
                              className="flex-1 block py-[3px] pl-3 transition-colors select-none"
                              style={{
                                color: isSectionActive
                                  ? `hsl(${s.sidebarActiveColor})`
                                  : `hsl(${s.sidebarTextColor} / 0.65)`,
                                fontSize: `${s.sidebarFontSize - 1}px`,
                                fontWeight: isSectionActive ? 500 : 400,
                                fontFamily: `'${s.bodyFont}', sans-serif`,
                              }}
                              dangerouslySetInnerHTML={{ __html: section.nav_title || section.title }}
                            />
                            <button
                              onClick={() => { stopEditing(); setEditingSectionId(section.id); }}
                              className="opacity-0 group-hover/section:opacity-100 transition-opacity shrink-0 mr-1"
                              style={{ color: `hsl(${s.mutedForegroundColor})` }}
                              title="Rename"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </SortableItemSimple>
                  );
                })}
              </nav>
            </SortableContext>
          </DndContext>
        )}
      </>
    );
  };

  /* ─── Render: label group header ─── */
  const renderLabelItem = (group: NavGroup, handleProps: Record<string, any>) => (
    <div
      className="group text-[10px] font-semibold uppercase tracking-widest flex items-center justify-between mt-3 mb-0.5"
      style={{ color: `hsl(${s.sidebarTextColor} / 0.5)` }}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span
          className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity"
          style={{ color: `hsl(${s.sidebarTextColor})` }}
          {...handleProps}
        >
          <GripVertical className="h-3 w-3" />
        </span>
        {editingGroupId === group.id ? (
          <InlineRichText
            value={group.title}
            onChange={(html) => onUpdateNavGroup(group.id, { title: html })}
            onDone={() => setEditingGroupId(null)}
            settings={s}
            singleLine
            placeholder="Label..."
            className="flex-1 uppercase tracking-widest"
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: `hsl(${s.sidebarTextColor})`,
            }}
          />
        ) : (
          <span
            className="cursor-default select-none flex-1 truncate"
            onDoubleClick={() => { stopEditing(); setEditingGroupId(group.id); }}
            dangerouslySetInnerHTML={{ __html: group.title }}
          />
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => { stopEditing(); setEditingGroupId(group.id); }}
          style={{ color: `hsl(${s.mutedForegroundColor})` }}
          title="Rename"
        >
          <Pencil className="h-2 w-2" />
        </button>
        <button
          onClick={() => setSettingsGroup(group)}
          style={{ color: `hsl(${s.mutedForegroundColor})` }}
          title="Group settings"
        >
          <SettingsIcon className="h-2.5 w-2.5" />
        </button>
        <button
          onClick={() => onDeleteNavGroup(group.id)}
          style={{ color: `hsl(${s.mutedForegroundColor})` }}
          title="Delete"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );

  /* ─── Render: text item ─── */
  const renderTextItem = (group: NavGroup, handleProps: Record<string, any>) => (
    <div className="group flex items-center gap-1 mt-1">
      <span
        className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity"
        style={{ color: `hsl(${s.sidebarTextColor})` }}
        {...handleProps}
      >
        <GripVertical className="h-3 w-3" />
      </span>
      {editingGroupId === group.id ? (
        <InlineRichText
          value={group.title}
          onChange={(html) => onUpdateNavGroup(group.id, { title: html })}
          onDone={() => setEditingGroupId(null)}
          settings={s}
          singleLine
          placeholder="Text..."
          className="flex-1 min-w-0"
          style={{
            fontSize: `${s.sidebarFontSize}px`,
            color: `hsl(${s.sidebarTextColor} / 0.6)`,
            fontFamily: `'${s.bodyFont}', sans-serif`,
          }}
        />
      ) : (
        <span
          className="flex-1 py-[3px] select-none cursor-default truncate"
          onDoubleClick={() => { stopEditing(); setEditingGroupId(group.id); }}
          style={{
            fontSize: `${s.sidebarFontSize}px`,
            color: `hsl(${s.sidebarTextColor} / 0.6)`,
            fontFamily: `'${s.bodyFont}', sans-serif`,
          }}
          dangerouslySetInnerHTML={{ __html: group.title }}
        />
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => { stopEditing(); setEditingGroupId(group.id); }}
          style={{ color: `hsl(${s.mutedForegroundColor})` }}
          title="Edit"
        >
          <Pencil className="h-2 w-2" />
        </button>
        <button
          onClick={() => setSettingsGroup(group)}
          style={{ color: `hsl(${s.mutedForegroundColor})` }}
          title="Group settings"
        >
          <SettingsIcon className="h-2.5 w-2.5" />
        </button>
        <button
          onClick={() => onDeleteNavGroup(group.id)}
          style={{ color: `hsl(${s.mutedForegroundColor})` }}
          title="Delete"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );

  /* ─── Drag overlay ─── */
  const dragOverlayContent = useMemo(() => {
    if (!dragActiveId) return null;
    const item = flatItems.find((i) => i.sortId === dragActiveId);
    if (!item) return null;

    if (item.type === "label" || item.type === "dropdown") {
      return (
        <div
          className="rounded-xl px-2 py-1 shadow-xl text-[10px] font-semibold uppercase tracking-widest"
          style={{
            backgroundColor: `hsl(${s.sidebarBg})`,
            border: `none`,
            color: `hsl(${s.sidebarTextColor})`,
          }}
          dangerouslySetInnerHTML={{ __html: item.groupData!.title }}
        />
      );
    }
    if (item.type === "text") {
      return (
        <div
          className="rounded-xl px-2 py-1 shadow-xl"
          style={{
            backgroundColor: `hsl(${s.sidebarBg})`,
            border: `none`,
            fontSize: `${s.sidebarFontSize}px`,
            color: `hsl(${s.sidebarTextColor} / 0.6)`,
          }}
          dangerouslySetInnerHTML={{ __html: item.groupData!.title }}
        />
      );
    }
    return (
      <div
        className="rounded-xl px-2 py-1 shadow-xl"
        style={{
          backgroundColor: `hsl(${s.sidebarBg})`,
          border: `none`,
          fontSize: `${s.sidebarFontSize}px`,
          fontFamily: `'${s.bodyFont}', sans-serif`,
          color: `hsl(${s.sidebarTextColor})`,
        }}
        dangerouslySetInnerHTML={{ __html: item.pageData!.title }}
      />
    );
  }, [dragActiveId, flatItems, s]);

  /* ─── Tab sections (Mintlify-style) ───
   * Render each Tab as a collapsible top-level section containing its
   * nav_groups + their pages. Plus a "General" pseudo-tab for items
   * with no tab assignment.
   */
  const sortedTabs = useMemo(
    () => [...tabs].sort((a, b) => a.order_index - b.order_index),
    [tabs],
  );

  const [openTabs, setOpenTabs] = useState<Record<string, boolean>>({});
  const isTabOpen = (id: string) => openTabs[id] ?? true;
  const toggleTab = (id: string) =>
    setOpenTabs((p) => ({ ...p, [id]: !isTabOpen(id) }));

  const tabIcon = (kind?: string) => {
    switch (kind) {
      case "language": return Languages;
      case "product":  return Box;
      case "version":  return GitBranch;
      default:         return Layers;
    }
  };

  // Items belonging to a specific tab (or null = no tab)
  const itemsForTab = useCallback(
    (tabId: string | null): FlatItem[] => {
      const items: FlatItem[] = [];
      const groupsForTab = navGroups
        .filter((g) => (tabId ? g.tab_id === tabId : !g.tab_id))
        .sort((a, b) => a.order_index - b.order_index);

      // Ungrouped pages only show in the "General" pseudo-tab (tabId === null)
      if (tabId === null) {
        const ungrouped = pages
          .filter((p) => !p.nav_group_id)
          .sort((a, b) => a.order_index - b.order_index);
        ungrouped.forEach((p) =>
          items.push({ sortId: toSortId("page", p.id), type: "page", pageData: p }),
        );
      }

      groupsForTab.forEach((g) => {
        const itemType: FlatItemType =
          g.type === "text" ? "text" : g.type === "dropdown" ? "dropdown" : "label";
        items.push({ sortId: toSortId("group", g.id), type: itemType, groupData: g });
        const groupPages = pages
          .filter((p) => p.nav_group_id === g.id)
          .sort((a, b) => a.order_index - b.order_index);
        groupPages.forEach((p) =>
          items.push({ sortId: toSortId("page", p.id), type: "page", pageData: p }),
        );
      });

      return items;
    },
    [navGroups, pages],
  );

  return (
    <aside
      style={{
        width: `${s.sidebarWidth}px`,
        backgroundColor: `hsl(${s.sidebarBg})`,
      }}
      className="shrink-0 overflow-y-auto py-5 pr-4 pl-1"
    >
      {/* ─── Top bar: Title + (Add to General) + (Wrap-with structural menu) ───
       *  Simplified UX:
       *    - The "+" button = add a page/group/dropdown to the General (root) section.
       *    - The Layers (▤) button = wrap the navigation with a structural container
       *      (Tab / Language / Product / Version). Tabs/Languages/etc. then have
       *      their OWN inline "+ Add" inside their header — see below.
       */}
      <div
        className="mb-3 flex items-center justify-between px-2"
        style={{ color: `hsl(${s.sidebarTextColor} / 0.6)` }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest">Navigation</span>
        <div className="flex items-center gap-0.5">
          <AddItemMenu
            onAddPage={() => onAddPage()}
            onAddGroup={() => onAddNavGroup("label")}
            onAddDropdown={() => onAddNavGroup("dropdown")}
            textColor={s.sidebarTextColor}
            title="Add page, group, or dropdown"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors"
                style={{ color: `hsl(${s.sidebarTextColor})` }}
                title="Wrap with a structural container"
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px] p-1.5">
              <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Wrap with
              </div>
              <DropdownMenuItem onClick={() => onAddTab("New Tab", "tab")} className="gap-2 text-[12.5px]">
                <Layers className="h-3.5 w-3.5" />
                <div className="flex flex-col">
                  <span>Tab</span>
                  <span className="text-[10.5px] text-muted-foreground/70">Group sections under top-level tabs</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTab("English", "language")} className="gap-2 text-[12.5px]">
                <Languages className="h-3.5 w-3.5" />
                <div className="flex flex-col">
                  <span>Language</span>
                  <span className="text-[10.5px] text-muted-foreground/70">Localize docs per language</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTab("New Product", "product")} className="gap-2 text-[12.5px]">
                <Box className="h-3.5 w-3.5" />
                <div className="flex flex-col">
                  <span>Product</span>
                  <span className="text-[10.5px] text-muted-foreground/70">Split docs across products</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTab("v1.0", "version")} className="gap-2 text-[12.5px]">
                <GitBranch className="h-3.5 w-3.5" />
                <div className="flex flex-col">
                  <span>Version</span>
                  <span className="text-[10.5px] text-muted-foreground/70">Maintain multiple doc versions</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Single DnD context across all items in the visible tab ─── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setDragActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={flatSortIds} strategy={verticalListSortingStrategy}>
          {/* General (no-tab) section: always rendered, no header chrome */}
          <nav style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col px-1">
            {itemsForTab(null).map((item) => (
              <SortableItem key={item.sortId} id={item.sortId} dragHandleOnly>
                {({ handleProps }) => {
                  if (item.type === "page") return renderPageItem(item.pageData!, handleProps);
                  if (item.type === "label") return renderLabelItem(item.groupData!, handleProps);
                  if (item.type === "dropdown") return renderLabelItem(item.groupData!, handleProps);
                  return renderTextItem(item.groupData!, handleProps);
                }}
              </SortableItem>
            ))}
          </nav>

          {/* One collapsible section per Tab */}
          {sortedTabs.map((tab) => {
            const TabIcon = tabIcon((tab.metadata as any)?.kind);
            const open = isTabOpen(tab.id);
            const tabItems = itemsForTab(tab.id);
            return (
              <div key={tab.id} className="mt-3 px-1 group/tab">
                <div
                  className="flex items-center gap-1 px-2 py-[5px] rounded-md hover:bg-muted/40"
                >
                  <button
                    onClick={() => toggleTab(tab.id)}
                    className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                    style={{
                      fontSize: `${s.sidebarFontSize}px`,
                      color: `hsl(${s.sidebarActiveColor})`,
                      fontWeight: 600,
                    }}
                  >
                    {open ? <ChevronDown className="h-3 w-3 opacity-60 shrink-0" /> : <ChevronRight className="h-3 w-3 opacity-60 shrink-0" />}
                    <TabIcon className="h-3.5 w-3.5 opacity-70 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity shrink-0">
                    <AddItemMenu
                      onAddGroup={() => onAddNavGroup("label", tab.id)}
                      onAddDropdown={() => onAddNavGroup("dropdown", tab.id)}
                      textColor={s.mutedForegroundColor}
                      title={`Add to ${tab.label}`}
                      compact
                      size="xs"
                    />
                    <button
                      onClick={() => onDeleteTab(tab.id)}
                      className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60"
                      title="Delete tab"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {open && (
                  <nav
                    style={{
                      gap: `${s.sidebarPageGap}px`,
                      borderLeft: `1px solid hsl(${s.borderColor} / 0.4)`,
                    }}
                    className="flex flex-col ml-[14px] pl-2 mt-1"
                  >
                    {tabItems.length === 0 && (
                      <button
                        onClick={() => onAddNavGroup("label", tab.id)}
                        className="text-[11px] italic text-muted-foreground/60 hover:text-foreground py-1.5 pl-2 text-left transition-colors"
                      >
                        + Add a group to get started
                      </button>
                    )}
                    {tabItems.map((item) => (
                      <SortableItem key={item.sortId} id={item.sortId} dragHandleOnly>
                        {({ handleProps }) => {
                          if (item.type === "page") return renderPageItem(item.pageData!, handleProps);
                          if (item.type === "label") return renderLabelItem(item.groupData!, handleProps);
                          if (item.type === "dropdown") return renderLabelItem(item.groupData!, handleProps);
                          return renderTextItem(item.groupData!, handleProps);
                        }}
                      </SortableItem>
                    ))}
                  </nav>
                )}
              </div>
            );
          })}
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {dragOverlayContent}
        </DragOverlay>
      </DndContext>

      <GroupSettingsDialog
        group={settingsGroup}
        tabs={tabs}
        open={!!settingsGroup}
        onOpenChange={(open) => !open && setSettingsGroup(null)}
        onSaved={(updated) => {
          // Sync the freshly-saved row into the parent useBuilder state so
          // tab filtering, dropdown rendering, etc. reflect the change immediately.
          if (updated && settingsGroup) {
            onUpdateNavGroup(settingsGroup.id, {
              title: updated.title,
              type: updated.type,
              tab_id: updated.tab_id,
              metadata: updated.metadata,
            });
          }
        }}
      />
    </aside>
  );
};

/* ─── Simple sortable (for sections, no drag handle) ─── */
const SortableItemSimple = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export default BuilderSidebar;
