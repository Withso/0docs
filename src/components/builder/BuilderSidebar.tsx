import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Tag, FileText, Pencil, Type } from "lucide-react";
import type { Page, Section, NavGroup } from "@/hooks/use-builder";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  onSelectPage: (page: Page) => void;
  onAddPage: (navGroupId?: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDeletePage: (pageId: string) => void;
  onAddNavGroup: (type?: "label" | "text") => void;
  onUpdateNavGroup: (groupId: string, updates: Partial<NavGroup>) => void;
  onDeleteNavGroup: (groupId: string) => void;
  onReorderPages: (pages: Page[]) => void;
  onReorderNavGroups: (groups: NavGroup[]) => void;
  onReorderSections: (sections: Section[]) => void;
}

/* ─── Sortable wrapper ─── */
const DragDots = () => (
  <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor" className="shrink-0">
    <circle cx="1" cy="1" r="0.8" />
    <circle cx="5" cy="1" r="0.8" />
    <circle cx="1" cy="5" r="0.8" />
    <circle cx="5" cy="5" r="0.8" />
    <circle cx="1" cy="9" r="0.8" />
    <circle cx="5" cy="9" r="0.8" />
  </svg>
);

const SortableItem = ({
  id,
  children,
  handle = false,
}: {
  id: string;
  children: React.ReactNode;
  handle?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto" as any,
  };

  if (!handle) {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {children}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group/drag flex items-start gap-0">
      <div
        className="shrink-0 w-[14px] pt-[7px] cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-30 hover:!opacity-70 transition-opacity"
        {...attributes}
        {...listeners}
      >
        <DragDots />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

const BuilderSidebar = ({
  settings: s,
  pages,
  activePage,
  sections,
  navGroups,
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
}: BuilderSidebarProps) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const stopEditing = useCallback(() => {
    setEditingPageId(null);
    setEditingGroupId(null);
    setEditingSectionId(null);
  }, []);

  const ungroupedPages = useMemo(
    () => pages.filter((p) => !p.nav_group_id).sort((a, b) => a.order_index - b.order_index),
    [pages]
  );

  const sortedNavGroups = useMemo(
    () => [...navGroups].sort((a, b) => a.order_index - b.order_index),
    [navGroups]
  );

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order_index - b.order_index),
    [sections]
  );

  /* ─── Drag handlers ─── */
  const handlePageDragEnd = useCallback(
    (event: DragEndEvent, groupId?: string) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const sourcePages = groupId
        ? pages.filter((p) => p.nav_group_id === groupId).sort((a, b) => a.order_index - b.order_index)
        : ungroupedPages;

      const oldIndex = sourcePages.findIndex((p) => p.id === active.id);
      const newIndex = sourcePages.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sourcePages];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updatedAll = pages.map((p) => {
        const idx = reordered.findIndex((r) => r.id === p.id);
        if (idx !== -1) return { ...p, order_index: idx };
        return p;
      });

      onReorderPages(updatedAll);
    },
    [pages, ungroupedPages, onReorderPages]
  );

  const handleNavGroupDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedNavGroups.findIndex((g) => g.id === active.id);
      const newIndex = sortedNavGroups.findIndex((g) => g.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sortedNavGroups];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      onReorderNavGroups(reordered.map((g, i) => ({ ...g, order_index: i })));
    },
    [sortedNavGroups, onReorderNavGroups]
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

  /* ─── Render helpers ─── */
  const renderPageContent = (page: Page) => {
    const isActive = activePage?.id === page.id;
    const isEditing = editingPageId === page.id;

    return (
      <>
        <div className="group flex items-center gap-1">
          {isEditing ? (
            <InlineRichText
              value={page.title}
              onChange={(html) => {
                const plainSlug = html.replace(/<[^>]*>/g, "").trim() || "untitled";
                onUpdatePage(page.id, {
                  title: html,
                  slug: plainSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                });
              }}
              onDone={() => setEditingPageId(null)}
              settings={s}
              singleLine
              placeholder="Page title..."
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
              dangerouslySetInnerHTML={{ __html: page.title }}
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
              <button
                onClick={() => onDeletePage(page.id)}
                style={{ color: `hsl(${s.mutedForegroundColor})` }}
                title="Delete"
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
                className="ml-px mt-px mb-1"
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
                    <SortableItem key={section.id} id={section.id} handle>
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
                              value={section.title}
                              onChange={(html) => {
                                window.dispatchEvent(
                                  new CustomEvent("builder:updateSection", {
                                    detail: { id: section.id, updates: { title: html } },
                                  })
                                );
                              }}
                              onDone={() => setEditingSectionId(null)}
                              settings={s}
                              singleLine
                              placeholder="Section title..."
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
                              dangerouslySetInnerHTML={{ __html: section.title }}
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
                    </SortableItem>
                  );
                })}
              </nav>
            </SortableContext>
          </DndContext>
        )}
      </>
    );
  };

  const renderGroupLabel = (group: NavGroup) => {
    if (editingGroupId === group.id) {
      return (
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
      );
    }

    return (
      <span
        className="cursor-default select-none"
        onDoubleClick={() => { stopEditing(); setEditingGroupId(group.id); }}
        dangerouslySetInnerHTML={{ __html: group.title }}
      />
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
      className="shrink-0 sticky overflow-y-auto py-8 pl-5 pr-6 hidden lg:block"
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center justify-between"
        style={{ color: `hsl(${s.sidebarTextColor})` }}
      >
        <span>Pages</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="transition-colors hover:opacity-80"
              style={{ color: `hsl(${s.sidebarTextColor})` }}
              title="Add page or label"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem onClick={() => onAddPage()} className="gap-2 text-[13px]">
              <FileText className="h-3.5 w-3.5" />
              Page
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNavGroup("label")} className="gap-2 text-[13px]">
              <Tag className="h-3.5 w-3.5" />
              Label
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNavGroup("text")} className="gap-2 text-[13px]">
              <Type className="h-3.5 w-3.5" />
              Text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
        {/* Ungrouped pages — sortable */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handlePageDragEnd(e)}>
          <SortableContext items={ungroupedPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {ungroupedPages.map((page) => (
              <SortableItem key={page.id} id={page.id} handle>
                {renderPageContent(page)}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>

        {/* Nav groups (labels + text) — sortable */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleNavGroupDragEnd}>
          <SortableContext items={sortedNavGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {sortedNavGroups.map((group) => {
              const isTextType = group.type === "text";
              const groupPages = pages
                .filter((p) => p.nav_group_id === group.id)
                .sort((a, b) => a.order_index - b.order_index);

              if (isTextType) {
                return (
                  <SortableItem key={group.id} id={group.id} handle>
                    <div className="group mt-1">
                      <div className="flex items-center gap-1">
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
                            className="flex-1 py-[3px] select-none cursor-default"
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
                            onClick={() => onDeleteNavGroup(group.id)}
                            style={{ color: `hsl(${s.mutedForegroundColor})` }}
                            title="Delete"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SortableItem>
                );
              }

              // Label type
              return (
                <SortableItem key={group.id} id={group.id} handle>
                  <div className="mt-3">
                    <div
                      className="group text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center justify-between"
                      style={{ color: `hsl(${s.sidebarTextColor} / 0.5)` }}
                    >
                      {renderGroupLabel(group)}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => { stopEditing(); setEditingGroupId(group.id); }}
                          style={{ color: `hsl(${s.mutedForegroundColor})` }}
                          title="Rename"
                        >
                          <Pencil className="h-2 w-2" />
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

                    {/* Pages within this group — sortable */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handlePageDragEnd(e, group.id)}>
                      <SortableContext items={groupPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                        <div style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
                          {groupPages.map((page) => (
                            <SortableItem key={page.id} id={page.id} handle>
                              {renderPageContent(page)}
                            </SortableItem>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>
      </nav>
    </aside>
  );
};

export default BuilderSidebar;