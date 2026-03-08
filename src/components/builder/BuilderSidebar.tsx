import { useState } from "react";
import { Plus, Trash2, ChevronRight } from "lucide-react";
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

  return (
    <aside
      style={{
        width: `${settings.sidebarWidth}px`,
        backgroundColor: `hsl(${settings.sidebarBg})`,
        top: "48px",
        height: "calc(100vh - 48px)",
      }}
      className="shrink-0 sticky overflow-y-auto py-10 pr-6 hidden lg:block"
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2 flex items-center justify-between"
        style={{ color: `hsl(${settings.sidebarTextColor})` }}
      >
        <span>Pages</span>
        <button
          onClick={onAddPage}
          className="transition-colors"
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
                <ChevronRight
                  className={`h-3 w-3 shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`}
                  style={{ color: `hsl(${settings.mutedForegroundColor})` }}
                />
                {editingPageId === page.id ? (
                  <input
                    autoFocus
                    className="flex-1 px-2 py-1 rounded bg-transparent border-b outline-none"
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
                    className="flex-1 text-left truncate px-2 py-1 rounded transition-colors"
                    style={{
                      fontSize: `${settings.sidebarFontSize}px`,
                      color: isActive
                        ? `hsl(${settings.sidebarActiveColor})`
                        : `hsl(${settings.sidebarTextColor})`,
                      fontWeight: isActive ? 500 : 400,
                      backgroundColor: isActive ? `hsl(${settings.accentColor})` : "transparent",
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
                <nav className="ml-4 mt-0.5 mb-1 space-y-0.5">
                  {pageSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#section-${section.id}`}
                      className="block px-2 py-0.5 text-xs rounded transition-colors"
                      style={{
                        color: `hsl(${settings.sidebarTextColor})`,
                        fontSize: `${settings.sidebarFontSize - 2}px`,
                      }}
                    >
                      {section.title}
                    </a>
                  ))}
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
