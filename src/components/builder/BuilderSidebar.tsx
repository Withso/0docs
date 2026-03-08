import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { Page, Section } from "@/pages/Builder";

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
    <aside className="w-[220px] shrink-0 sticky top-12 h-[calc(100vh-48px)] overflow-y-auto py-10 pr-8 hidden lg:block">
      <span className="text-foreground font-semibold text-sm mb-8 block">
        /{projectName.toLowerCase().replace(/\s+/g, "-")}
      </span>

      <div className="doc-sidebar-group-label flex items-center justify-between">
        <span>Pages</span>
        <button
          onClick={onAddPage}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav className="space-y-0.5">
        {pages.map((page) => (
          <div key={page.id} className="group flex items-center gap-1">
            {editingPageId === page.id ? (
              <input
                autoFocus
                className="flex-1 py-1 text-sm bg-transparent border-b border-foreground/20 outline-none text-foreground"
                defaultValue={page.title}
                onBlur={(e) => {
                  onUpdatePage(page.id, {
                    title: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                  });
                  setEditingPageId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            ) : (
              <button
                onClick={() => onSelectPage(page)}
                onDoubleClick={() => setEditingPageId(page.id)}
                className={`doc-sidebar-link flex-1 text-left ${
                  activePage?.id === page.id ? "active" : ""
                }`}
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
        ))}
      </nav>

      {/* Section nav for active page */}
      {activePage && sections.length > 0 && (
        <>
          <div className="doc-sidebar-group-label mt-6">Sections</div>
          <nav className="space-y-0.5">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className="doc-sidebar-sub-link"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
};

export default BuilderSidebar;
