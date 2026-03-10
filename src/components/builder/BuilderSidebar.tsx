import { useState } from "react";
import { Plus, Trash2, Tag, FileText } from "lucide-react";
import type { Page, Section, NavGroup } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import InlineRichText from "./InlineRichText";
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
  onAddNavGroup: () => void;
  onUpdateNavGroup: (groupId: string, updates: Partial<NavGroup>) => void;
  onDeleteNavGroup: (groupId: string) => void;
}

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
}: BuilderSidebarProps) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Pages without a nav group
  const ungroupedPages = pages.filter((p) => !p.nav_group_id);

  const renderPage = (page: Page) => {
    const isActive = activePage?.id === page.id;
    const pageSections = isActive ? sections : [];

    return (
      <div key={page.id}>
        <div className="group flex items-center gap-1">
          {editingPageId === page.id ? (
            <InlineRichText
              value={page.title}
              onChange={(html) => {
                const plainSlug = html.replace(/<[^>]*>/g, "").trim() || "untitled";
                onUpdatePage(page.id, {
                  title: html,
                  slug: plainSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                });
              }}
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
              title="Double-click to edit with formatting"
              dangerouslySetInnerHTML={{ __html: page.title }}
            />
          )}
          <button
            onClick={() => onDeletePage(page.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ color: `hsl(${s.mutedForegroundColor})` }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {isActive && pageSections.length > 0 && (
          <nav
            className="ml-px mt-px mb-1"
            style={{
              borderLeft: `1px solid hsl(${s.borderColor} / 0.5)`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {pageSections.map((section) => {
              const isSectionActive =
                s.sidebarShowSectionTracker && activeSectionId === section.id;

              return (
                <div key={section.id} className="relative">
                  {isSectionActive && (
                    <span
                      className="absolute left-[-1px] top-[5px] bottom-[5px] w-[2px] rounded-full"
                      style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
                    />
                  )}
                  {editingSectionId === section.id ? (
                    <div className="pl-3 py-[3px]">
                      <InlineRichText
                        value={section.title}
                        onChange={(html) => {
                          // Section title updates are handled via the main onUpdateSection
                          // but sidebar doesn't have that prop, so we emit a custom event
                          window.dispatchEvent(
                            new CustomEvent("builder:updateSection", {
                              detail: { id: section.id, updates: { title: html } },
                            })
                          );
                        }}
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
                    <a
                      href={`#section-${section.id}`}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        setEditingSectionId(section.id);
                      }}
                      className="block py-[3px] pl-3 transition-colors"
                      style={{
                        color: isSectionActive
                          ? `hsl(${s.sidebarActiveColor})`
                          : `hsl(${s.sidebarTextColor} / 0.65)`,
                        fontSize: `${s.sidebarFontSize - 1}px`,
                        fontWeight: isSectionActive ? 500 : 400,
                        fontFamily: `'${s.bodyFont}', sans-serif`,
                      }}
                      title="Double-click to edit with formatting"
                      dangerouslySetInnerHTML={{ __html: section.title }}
                    />
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>
    );
  };

  const renderGroupLabel = (group: NavGroup) => {
    if (editingGroupId === group.id) {
      return (
        <InlineRichText
          value={group.title}
          onChange={(html) => {
            onUpdateNavGroup(group.id, { title: html });
          }}
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
        className="cursor-pointer"
        onDoubleClick={() => setEditingGroupId(group.id)}
        title="Double-click to edit with formatting"
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
      className="shrink-0 sticky overflow-y-auto py-8 pr-6 hidden lg:block"
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
            <DropdownMenuItem onClick={onAddNavGroup} className="gap-2 text-[13px]">
              <Tag className="h-3.5 w-3.5" />
              Label
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
        {/* Ungrouped pages first */}
        {ungroupedPages.map(renderPage)}

        {/* Nav groups with their pages */}
        {navGroups.map((group) => {
          const groupPages = pages.filter((p) => p.nav_group_id === group.id);

          return (
            <div key={group.id} className="mt-3">
              <div
                className="group text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center justify-between"
                style={{ color: `hsl(${s.sidebarTextColor} / 0.5)` }}
              >
                {renderGroupLabel(group)}
                <button
                  onClick={() => onDeleteNavGroup(group.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  style={{ color: `hsl(${s.mutedForegroundColor})` }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
              <div style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
                {groupPages.map(renderPage)}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default BuilderSidebar;
