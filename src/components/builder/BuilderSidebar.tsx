import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Page, Section } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";

interface BuilderSidebarProps {
  settings: DesignSettings;
  pages: Page[];
  activePage: Page | null;
  sections: Section[];
  onSelectPage: (page: Page) => void;
  onAddPage: () => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDeletePage: (pageId: string) => void;
}

const BuilderSidebar = ({
  settings,
  pages,
  activePage,
  sections,
  onSelectPage,
  onAddPage,
  onUpdatePage,
  onDeletePage,
}: BuilderSidebarProps) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.sidebarShowSectionTracker || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "");
            setActiveSectionId(id);
            break;
          }
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    const sectionEls = sections
      .map((sec) => document.getElementById(`section-${sec.id}`))
      .filter(Boolean) as HTMLElement[];

    sectionEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sections, settings.sidebarShowSectionTracker]);

  return (
    <aside
      style={{
        width: `${settings.sidebarWidth}px`,
        backgroundColor: `hsl(${settings.sidebarBg})`,
        top: "48px",
        height: "calc(100vh - 48px)",
      }}
      className="shrink-0 sticky overflow-y-auto py-8 pr-6 hidden lg:block"
    >
      <div
        className="platform-label mb-3 px-0 flex items-center justify-between"
        style={{ color: `hsl(${settings.sidebarTextColor})` }}
      >
        <span>Pages</span>
        <button
          onClick={onAddPage}
          className="transition-colors hover:opacity-80"
          style={{ color: `hsl(${settings.sidebarTextColor})` }}
          title="Add page"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav style={{ gap: `${settings.sidebarPageGap}px` }} className="flex flex-col">
        {pages.map((page) => {
          const isActive = activePage?.id === page.id;
          const pageSections = isActive ? sections : [];

          return (
            <div key={page.id}>
              <div className="group flex items-center gap-1">
                {editingPageId === page.id ? (
                  <input
                    autoFocus
                    className="flex-1 py-[3px] bg-transparent border-b outline-none"
                    style={{
                      fontSize: `${settings.sidebarFontSize}px`,
                      borderColor: `hsl(${settings.borderColor})`,
                      color: `hsl(${settings.sidebarActiveColor})`,
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
                      fontSize: `${settings.sidebarFontSize}px`,
                      color: isActive
                        ? `hsl(${settings.sidebarActiveColor})`
                        : `hsl(${settings.sidebarTextColor})`,
                      fontWeight: isActive ? 500 : 400,
                    }}
                    title="Double-click to rename"
                  >
                    {page.title}
                  </button>
                )}
                <button
                  onClick={() => onDeletePage(page.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  style={{ color: `hsl(${settings.mutedForegroundColor})` }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {isActive && pageSections.length > 0 && (
                <nav
                  className="ml-px mt-px mb-1"
                  style={{
                    borderLeft: `1px solid hsl(${settings.borderColor} / 0.5)`,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {pageSections.map((section) => {
                    const isSectionActive = activeSectionId === section.id;
                    return (
                      <a
                        key={section.id}
                        href={`#section-${section.id}`}
                        className="block py-[3px] pl-3 transition-colors relative"
                        style={{
                          color: isSectionActive
                            ? `hsl(${settings.sidebarActiveColor})`
                            : `hsl(${settings.sidebarTextColor} / 0.7)`,
                          fontSize: `${settings.sidebarFontSize - 1}px`,
                          fontWeight: isSectionActive ? 500 : 400,
                          fontFamily: `'${settings.bodyFont}', sans-serif`,
                        }}
                      >
                        {isSectionActive && settings.sidebarShowSectionTracker && (
                          <span
                            className="absolute left-[-1px] top-[5px] bottom-[5px] w-[2px] rounded-full"
                            style={{ backgroundColor: `hsl(${settings.sidebarIndicatorColor})` }}
                          />
                        )}
                        {section.title}
                      </a>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default BuilderSidebar;
