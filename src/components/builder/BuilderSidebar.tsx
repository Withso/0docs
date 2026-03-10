import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Page, Section } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import DocSidebarNav from "@/components/docs/DocSidebarNav";

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
    <DocSidebarNav
      settings={settings}
      pages={pages}
      activePage={activePage}
      sections={sections}
      onSelectPage={onSelectPage}
      stickyTop={48}
      headerAction={
        <button
          onClick={onAddPage}
          className="transition-colors hover:opacity-80"
          style={{ color: `hsl(${settings.sidebarTextColor})` }}
          title="Add page"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      }
      renderPageActions={(page, isActive) => (
        <>
          {editingPageId === page.id ? (
            <input
              autoFocus
              className="flex-1 py-[3px] bg-transparent border-b outline-none"
              style={{
                fontSize: `${settings.sidebarFontSize}px`,
                borderColor: `hsl(${settings.borderColor})`,
                color: `hsl(${settings.sidebarActiveColor})`,
                fontFamily: `'${settings.bodyFont}', sans-serif`,
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
                fontFamily: `'${settings.bodyFont}', sans-serif`,
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
        </>
      )}
    />
  );
};

export default BuilderSidebar;
