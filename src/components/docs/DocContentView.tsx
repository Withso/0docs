import { useState, useEffect, useCallback } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { DocVersion } from "@/hooks/use-versions";
import DesignSettingsWrapper from "./DesignSettingsWrapper";
import DocBlockRenderer from "./DocBlockRenderer";
import DocSidebarNav from "./DocSidebarNav";
import TableOfContents from "./TableOfContents";
import SearchDialog from "./SearchDialog";
import PageFeedback from "./PageFeedback";
import VersionSelector from "./VersionSelector";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  allSections?: DocSection[];
  allBlocks?: DocBlock[];
  showFeedback?: boolean;
  pageId?: string;
  projectId?: string;
  versions?: DocVersion[];
  activeVersion?: DocVersion | null;
  onSelectVersion?: (version: DocVersion) => void;
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
  allSections,
  allBlocks,
  showFeedback = false,
  pageId,
  projectId,
  versions = [],
  activeVersion,
  onSelectVersion,
}: DocContentViewProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const headerHeight = hideHeader ? 0 : 48;
  const sidebarTop = headerStickyTop + headerHeight;
  const frameMaxWidth = s.contentMaxWidth + s.sidebarWidth + 200 + 48;

  // Cmd+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Track search queries
  const handleSearch = useCallback((query: string, resultsCount: number) => {
    if (!projectId || !query.trim()) return;
    supabase.from("search_queries").insert({
      project_id: projectId,
      query: query.trim(),
      results_count: resultsCount,
    }).then(() => {});
  }, [projectId]);

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
            <div className="flex items-center gap-3">
              <span
                className="font-semibold text-sm"
                style={{ fontFamily: `'${s.bodyFont}', sans-serif` }}
              >
                {projectName}
              </span>
              {versions.length > 1 && activeVersion && onSelectVersion && (
                <VersionSelector
                  versions={versions}
                  activeVersion={activeVersion}
                  onSelect={onSelectVersion}
                  settings={s}
                />
              )}
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors hover:bg-accent"
              style={{
                borderColor: `hsl(${s.borderColor})`,
                color: `hsl(${s.mutedForegroundColor})`,
                fontSize: "13px",
                fontFamily: `'${s.bodyFont}', sans-serif`,
              }}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `hsl(${s.borderColor})` }}>
                ⌘K
              </kbd>
            </button>
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

              {showFeedback && activePage?.id && (
                <PageFeedback pageId={activePage.id} settings={s} />
              )}
            </article>
          ) : (
            <p style={{ color: `hsl(${s.mutedForegroundColor})` }}>
              No pages in this project yet.
            </p>
          )}
        </main>

        <TableOfContents
          sections={sections}
          settings={s}
          stickyTop={sidebarTop}
        />
      </div>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        pages={pages}
        sections={allSections || sections}
        blocks={allBlocks || blocks}
        onSelectPage={onSelectPage}
        onSearch={handleSearch}
      />
    </DesignSettingsWrapper>
  );
};

export default DocContentView;
