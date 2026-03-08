import { useState, useEffect, useRef, useCallback } from "react";
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
  highlightType?: string | null;
  headerStickyTop?: number;
  hideHeader?: boolean;
}

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
  hideHeader = false,
}: DocContentViewProps) => {
  const headerHeight = hideHeader ? 0 : 48;
  const sidebarTop = headerStickyTop + headerHeight;
  const frameMaxWidth = s.contentMaxWidth + s.sidebarWidth + 48;

  // Scroll-tracking: track which section is currently in view
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!s.sidebarShowSectionTracker || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first section that is intersecting
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

    // Observe all section elements
    const sectionEls = sections
      .map((sec) => document.getElementById(`section-${sec.id}`))
      .filter(Boolean) as HTMLElement[];

    sectionEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sections, s.sidebarShowSectionTracker]);

  return (
    <DesignSettingsWrapper settings={s} className="min-h-full">
      {/* Doc header */}
      {!hideHeader && (
        <header
          className="border-b sticky z-40"
          style={{
            top: headerStickyTop,
            backgroundColor: `hsl(${s.backgroundColor})`,
            borderColor: `hsl(${s.borderColor})`,
          }}
        >
          <div
            style={{ maxWidth: `${frameMaxWidth}px` }}
            className="mx-auto px-6 h-12 flex items-center justify-between"
          >
            <span
              className="font-semibold text-sm"
              style={{ fontFamily: `'${s.bodyFont}', sans-serif` }}
            >
              {projectName}
            </span>
          </div>
        </header>
      )}

      <div
        style={{ maxWidth: `${frameMaxWidth}px` }}
        className="mx-auto flex px-6"
        ref={mainRef}
      >
        {/* Sidebar — agentation.dev style */}
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
            className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-0"
            style={{ color: `hsl(${s.sidebarTextColor})` }}
          >
            Pages
          </div>
          <nav style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
            {pages.map((page) => {
              const isActive = activePage?.id === page.id;
              const pageSections = isActive ? sections : [];
              return (
                <div key={page.id}>
                  <button
                    onClick={() => onSelectPage(page)}
                    className="text-left truncate py-[3px] transition-colors block w-full"
                    style={{
                      fontSize: `${s.sidebarFontSize}px`,
                      color: isActive
                        ? `hsl(${s.sidebarActiveColor})`
                        : `hsl(${s.sidebarTextColor})`,
                      fontWeight: isActive ? 500 : 400,
                      fontFamily: `'${s.bodyFont}', sans-serif`,
                    }}
                  >
                    {page.title}
                  </button>
                  {/* Section links with scroll-tracking left border indicator */}
                  {isActive && pageSections.length > 0 && (
                    <nav
                      className="ml-px mt-px mb-1"
                      style={{
                        borderLeft: `1px solid hsl(${s.borderColor} / 0.5)`,
                        gap: `0px`,
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
                                ? `hsl(${s.sidebarActiveColor})`
                                : `hsl(${s.sidebarTextColor} / 0.6)`,
                              fontSize: `${s.sidebarFontSize - 1}px`,
                              fontWeight: isSectionActive ? 500 : 400,
                              fontFamily: `'${s.bodyFont}', sans-serif`,
                            }}
                          >
                            {/* Active indicator line */}
                            {isSectionActive && (
                              <span
                                className="absolute left-[-1px] top-[5px] bottom-[5px] w-[2px] rounded-full"
                                style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
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

        {/* Main content */}
        <main className="flex-1 min-w-0 py-10 lg:pl-4">
          {activePage ? (
            <article style={{ maxWidth: `${s.contentMaxWidth}px` }}>
              <h1
                style={{
                  fontFamily: `'${s.headingFont}', sans-serif`,
                  fontWeight: s.headingWeight,
                  fontSize: `${s.pageTitleSize}px`,
                  marginBottom: `${s.sectionSpacing * 0.6}px`,
                }}
              >
                {activePage.title}
              </h1>

              {sections.map((section) => {
                const sectionBlocks = blocks
                  .filter((b) => b.section_id === section.id)
                  .sort((a, b) => a.order_index - b.order_index);
                return (
                  <section
                    key={section.id}
                    id={`section-${section.id}`}
                    style={{ marginBottom: `${s.sectionSpacing}px` }}
                  >
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
