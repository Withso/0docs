import { ChevronRight } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import DesignSettingsWrapper from "./DesignSettingsWrapper";
import DocBlockRenderer from "./DocBlockRenderer";

interface DocPage {
  id: string;
  title: string;
  slug: string;
  order_index: number;
}

interface DocSection {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
}

interface DocBlock {
  id: string;
  section_id: string;
  type: string;
  content: any;
  order_index: number;
}

interface DocContentViewProps {
  settings: DesignSettings;
  projectName: string;
  pages: DocPage[];
  activePage: DocPage | null;
  sections: DocSection[];
  blocks: DocBlock[];
  onSelectPage: (page: DocPage) => void;
  /** If set, blocks of this type get a highlight outline */
  highlightType?: string | null;
  /** Extra sticky offset for the doc header (e.g. when design settings header is above) */
  headerStickyTop?: number;
}

/**
 * Shared documentation view used by PublicDocs, DesignSettings, and potentially Builder.
 * Renders the exact same layout/structure everywhere for WYSIWYG consistency.
 */
const DocContentView = ({
  settings: s,
  projectName,
  pages,
  activePage,
  sections,
  blocks,
  onSelectPage,
  highlightType,
  headerStickyTop = 0,
}: DocContentViewProps) => {
  const sidebarTop = headerStickyTop + 48; // 48px = doc header height

  return (
    <DesignSettingsWrapper settings={s} className="min-h-full">
      {/* Doc header */}
      <header
        className="border-b sticky z-40"
        style={{
          top: headerStickyTop,
          backgroundColor: `hsl(${s.backgroundColor})`,
          borderColor: `hsl(${s.borderColor})`,
        }}
      >
        <div
          style={{ maxWidth: `${s.contentMaxWidth + s.sidebarWidth + 48}px` }}
          className="mx-auto px-6 h-12 flex items-center"
        >
          <span className="font-semibold text-sm">{projectName}</span>
        </div>
      </header>

      <div
        style={{ maxWidth: `${s.contentMaxWidth + s.sidebarWidth + 48}px` }}
        className="mx-auto flex px-6"
      >
        {/* Sidebar */}
        <aside
          style={{
            width: `${s.sidebarWidth}px`,
            backgroundColor: `hsl(${s.sidebarBg})`,
            top: `${sidebarTop}px`,
            height: `calc(100vh - ${sidebarTop}px)`,
          }}
          className="shrink-0 sticky overflow-y-auto py-10 pr-6 hidden lg:block"
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
            style={{ color: `hsl(${s.sidebarTextColor})` }}
          >
            Pages
          </div>
          <nav className="space-y-0.5">
            {pages.map((page) => {
              const isActive = activePage?.id === page.id;
              const pageSections = isActive ? sections : [];
              return (
                <div key={page.id}>
                  <div className="flex items-center gap-1">
                    <ChevronRight
                      className={`h-3 w-3 shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`}
                      style={{ color: `hsl(${s.mutedForegroundColor})` }}
                    />
                    <button
                      onClick={() => onSelectPage(page)}
                      className="flex-1 text-left truncate px-2 py-1 rounded text-sm transition-colors"
                      style={{
                        fontSize: `${s.sidebarFontSize}px`,
                        color: isActive ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarTextColor})`,
                        fontWeight: isActive ? 500 : 400,
                        backgroundColor: isActive ? `hsl(${s.accentColor})` : "transparent",
                      }}
                    >
                      {page.title}
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
                            color: `hsl(${s.sidebarTextColor})`,
                            fontSize: `${s.sidebarFontSize - 2}px`,
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

        {/* Main content */}
        <main className="flex-1 min-w-0 py-10 lg:pl-4">
          {activePage ? (
            <article style={{ maxWidth: `${s.contentMaxWidth}px` }}>
              <h1
                className="mb-6"
                style={{
                  fontFamily: `'${s.headingFont}', sans-serif`,
                  fontWeight: s.headingWeight,
                  fontSize: `${s.headingFontSize + 6}px`,
                }}
              >
                {activePage.title}
              </h1>

              {sections.map((section) => {
                const sectionBlocks = blocks
                  .filter((b) => b.section_id === section.id)
                  .sort((a, b) => a.order_index - b.order_index);
                return (
                  <section key={section.id} className="mb-10" id={`section-${section.id}`}>
                    <h2
                      className="flex items-center gap-3 mb-4"
                      style={{
                        fontFamily: `'${s.headingFont}', sans-serif`,
                        fontWeight: s.headingWeight,
                        fontSize: `${s.headingFontSize}px`,
                      }}
                    >
                      {section.title}
                      <span
                        className="flex-1 h-px opacity-50"
                        style={{ backgroundColor: `hsl(${s.sectionLineColor})` }}
                      />
                    </h2>
                    <div>
                      {sectionBlocks.map((block) => (
                        <DocBlockRenderer
                          key={block.id}
                          block={block}
                          settings={s}
                          highlightType={highlightType}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {sections.length === 0 && (
                <p style={{ color: `hsl(${s.mutedForegroundColor})` }}>
                  This page has no content yet.
                </p>
              )}
            </article>
          ) : (
            <p style={{ color: `hsl(${s.mutedForegroundColor})` }}>
              No pages in this project yet.
            </p>
          )}
        </main>
      </div>
    </DesignSettingsWrapper>
  );
};

export default DocContentView;
