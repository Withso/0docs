import type { DesignSettings } from "@/hooks/use-design-settings";
import DesignSettingsWrapper from "./DesignSettingsWrapper";
import DocBlockRenderer from "./DocBlockRenderer";
import DocSidebarNav from "./DocSidebarNav";

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

  return (
    <DesignSettingsWrapper settings={s} className="min-h-full">
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

      <div style={{ maxWidth: `${frameMaxWidth}px` }} className="mx-auto flex px-6">
        <DocSidebarNav
          settings={s}
          pages={pages}
          activePage={activePage}
          sections={sections}
          onSelectPage={onSelectPage}
          stickyTop={sidebarTop}
        />

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
