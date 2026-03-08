import { useState } from "react";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import type { Page, Section } from "@/hooks/use-builder";

interface BuilderSidebarProps {
  projectName: string;
  pages: Page[];
  activePage: Page | null;
  sections: Section[];
  onSelectPage: (page: Page) => void;
  onAddPage: () => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDeletePage: (pageId: string) => void;
}

const BuilderSidebar = ({
  projectName,
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
    <aside className="w-[240px] shrink-0 sticky top-12 h-[calc(100vh-48px)] overflow-y-auto py-10 pr-6 hidden lg:block">
      <span className="text-foreground font-semibold text-sm mb-6 block">
        /{projectName.toLowerCase().replace(/\s+/g, "-")}
      </span>

      <div className="doc-sidebar-group-label flex items-center justify-between">
        <span>Pages</span>
        <button
          onClick={onAddPage}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Add page"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav className="space-y-0.5">
        {pages.map((page) => {
          const isActive = activePage?.id === page.id;
          const pageSections = isActive ? sections : [];

          return (
            <div key={page.id}>
              <div className="group flex items-center gap-1">
                <ChevronRight
                  className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${
                    isActive ? "rotate-90" : ""
                  }`}
                />
                {editingPageId === page.id ? (
                  <input
                    autoFocus
                    className="flex-1 py-1 text-sm bg-transparent border-b border-foreground/20 outline-none text-foreground"
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
                    className={`doc-sidebar-link flex-1 text-left truncate ${isActive ? "active" : ""}`}
                    title="Double-click to rename"
                  >
                    {page.title}
                  </button>
                )}
                <button
                  onClick={() => onDeletePage(page.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Nested sections under active page */}
              {isActive && pageSections.length > 0 && (
                <nav className="ml-4 mt-0.5 mb-1 space-y-0.5">
                  {pageSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#section-${section.id}`}
                      className="doc-sidebar-sub-link text-xs"
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
