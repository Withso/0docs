import { useState, useEffect, useCallback } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { DocVersion } from "@/hooks/use-versions";
import DesignSettingsWrapper from "./DesignSettingsWrapper";
import DocBlockRenderer from "./DocBlockRenderer";
import DocSidebarNavMintlify from "./DocSidebarNavMintlify";
import TableOfContents from "./TableOfContents";
import SearchDialog from "./SearchDialog";
import PageFeedback from "./PageFeedback";
import DocMobileNav from "./DocMobileNav";
import DocsPreviewHeader from "./DocsPreviewHeader";
import { getAppearance } from "@/lib/theme/resolve-doc-theme";
import { smoothBehavior } from "@/lib/motion";
import { useResolvedDesignSettings } from "./DesignSettingsWrapper";

interface DocPage {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  nav_group_id?: string | null;
  nav_title?: string | null;
  metadata?: Record<string, any>;
}

interface DocNavGroup {
  id: string;
  title: string;
  order_index: number;
  type?: string;
  tab_id?: string | null;
  metadata?: Record<string, any>;
}

interface DocTab {
  id: string;
  label: string;
  order_index: number;
  metadata?: Record<string, any>;
}

interface DocSection {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
  nav_title?: string | null;
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
  externalSearchOpen?: boolean;
  onExternalSearchOpenChange?: (open: boolean) => void;
  navGroups?: DocNavGroup[];
  hideHeaderLabel?: boolean;
  showMobileNav?: boolean;
  tabs?: DocTab[];
  activeTabId?: string | null;
  onSelectTab?: (tabId: string | null) => void;
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
  projectId,
  versions = [],
  activeVersion,
  onSelectVersion,
  externalSearchOpen,
  onExternalSearchOpenChange,
  navGroups = [],
  hideHeaderLabel = false,
  showMobileNav = true,
  tabs = [],
  activeTabId = null,
  onSelectTab,
}: DocContentViewProps) => {
  const { resolved: settings } = useResolvedDesignSettings(s);
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const searchOpen = externalSearchOpen !== undefined ? externalSearchOpen : internalSearchOpen;
  const setSearchOpen = onExternalSearchOpenChange || setInternalSearchOpen;
  const headerHeight = hideHeader ? 0 : 56;
  const sidebarTop = headerStickyTop + headerHeight;
  // Wide outer frame: sidebar + content + TOC + generous padding
  const frameMaxWidth = settings.contentMaxWidth + settings.sidebarWidth + 240 + 96;

  // Eyebrow = active page's group title
  const activeGroup = navGroups.find((g) => g.id === activePage?.nav_group_id);
  const eyebrow = activeGroup ? activeGroup.title.replace(/<[^>]*>/g, "") : null;

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

  // Fire a `search` analytics event on every committed query so the
  // dashboard's "Searches" card and Top-Queries view (Phase 2) reflect
  // real reader intent. SearchDialog already debounces before invoking
  // this, so we don't generate an event per keystroke.
  const handleSearch = useCallback((query: string, resultsCount: number) => {
    if (!projectId || !query) return;
    void import("@/lib/analytics-tracker").then(({ track }) => {
      track({
        projectId,
        eventType: "search",
        query,
        metadata: { resultsCount },
      });
    });
  }, [projectId]);

  return (
    <DesignSettingsWrapper settings={s} className="min-h-full">
      {/* Only render this skip link when DocContentView owns the page chrome
          (i.e., the Builder preview pane). On the public /docs and /p/:slug
          routes, Index renders its own skip link as the first focusable
          element — rendering a second one here would just be redundant. */}
      {!hideHeader && (
        <a
          href="#content-area"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById("content-area");
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: smoothBehavior(), block: "start" });
            }
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-3 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2"
          style={{
            backgroundColor: `hsl(${settings.backgroundColor})`,
            color: `hsl(${settings.foregroundColor})`,
            border: `1px solid hsl(${settings.borderColor})`,
            fontFamily: `'${settings.bodyFont}', sans-serif`,
            fontSize: "13px",
            // Keep ring color aligned with the rest of the doc chrome.
            // Cast via React.CSSProperties so the CSS variable is typed
            // without resorting to `any`.
            ...({ "--tw-ring-color": `hsl(${settings.primaryColor})` } as React.CSSProperties),
          }}
        >
          Skip to content
        </a>
      )}
      {!hideHeader && (
        <DocsPreviewHeader
          settings={settings}
          projectName={projectName}
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          versions={versions}
          activeVersion={activeVersion ?? null}
          onSelectVersion={onSelectVersion}
          onSearchOpen={() => setSearchOpen(true)}
          showThemeToggle={!getAppearance(settings).strict}
          frameMaxWidth={frameMaxWidth}
          stickyTop={headerStickyTop}
          height={headerHeight}
          mobileNav={
            showMobileNav ? (
              <DocMobileNav
                settings={settings}
                pages={pages}
                activePage={activePage}
                sections={allSections || sections}
                onSelectPage={onSelectPage}
                onSearchOpen={() => setSearchOpen(true)}
                navGroups={navGroups as any}
                projectName={projectName}
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={onSelectTab}
              />
            ) : undefined
          }
        />
      )}

      <div
        style={{ maxWidth: `${frameMaxWidth}px` }}
        className="mx-auto flex px-6 lg:px-8 gap-12 xl:gap-16"
      >
        <DocSidebarNavMintlify
          settings={settings}
          pages={pages}
          activePage={activePage}
          sections={sections}
          onSelectPage={onSelectPage}
          stickyTop={sidebarTop}
          navGroups={navGroups}
          hideHeaderLabel={hideHeaderLabel}
          activeTabId={activeTabId}
          projectId={projectId}
        />

        <main id="content-area" tabIndex={-1} className="flex-1 min-w-0 py-12 focus:outline-none">
          {activePage ? (
            <article style={{ maxWidth: `${settings.contentMaxWidth}px` }}>
              {eyebrow && (
                <div
                  className="mb-2 text-[13px]"
                  style={{
                    color: `hsl(${settings.primaryColor})`,
                    fontFamily: `'${settings.bodyFont}', sans-serif`,
                    fontWeight: 500,
                  }}
                >
                  {eyebrow}
                </div>
              )}
              <h1
                style={{
                  fontFamily: `'${settings.headingFont}', sans-serif`,
                  fontWeight: 700,
                  fontSize: `${settings.pageTitleSize}px`,
                  lineHeight: 1.15,
                  letterSpacing: "-0.025em",
                  marginTop: 0,
                  marginBottom: `${settings.sectionSpacing * 0.6}px`,
                  color: `hsl(${settings.foregroundColor})`,
                }}
              >
                <span dangerouslySetInnerHTML={{ __html: activePage.title }} />
              </h1>

              {sections.map((section) => {
                const sectionBlocks = blocks
                  .filter((b) => b.section_id === section.id)
                  .sort((a, b) => a.order_index - b.order_index);

                const anchorId = `section-${section.id}`;
                return (
                  <section
                    key={section.id}
                    id={anchorId}
                    style={{
                      marginBottom: `${settings.sectionSpacing}px`,
                      scrollMarginTop: `${sidebarTop + 24}px`,
                    }}
                  >
                    <h2
                      className="group/h2 mb-5 flex items-baseline gap-2"
                      style={{
                        fontFamily: `'${settings.headingFont}', sans-serif`,
                        fontWeight: settings.headingWeight,
                        fontSize: `${settings.headingFontSize}px`,
                        lineHeight: 1.25,
                        letterSpacing: "-0.015em",
                        color: `hsl(${settings.foregroundColor})`,
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: section.title }} />
                      <a
                        href={`#${anchorId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const url = `${window.location.origin}${window.location.pathname}#${anchorId}`;
                          try {
                            navigator.clipboard?.writeText(url);
                          } catch {}
                          window.history.replaceState(null, "", `#${anchorId}`);
                          const el = document.getElementById(anchorId);
                          if (el) {
                            const top = el.getBoundingClientRect().top + window.scrollY - (sidebarTop + 24);
                            window.scrollTo({ top, behavior: smoothBehavior() });
                          }
                        }}
                        aria-label="Copy link to section"
                        className="opacity-0 group-hover/h2:opacity-60 hover:!opacity-100 focus:!opacity-100 transition-opacity no-underline focus:outline-none"
                        style={{
                          color: `hsl(${settings.mutedForegroundColor})`,
                          fontWeight: 400,
                          fontSize: "0.7em",
                          textDecoration: "none",
                        }}
                      >
                        #
                      </a>
                    </h2>

                    <div>
                      {sectionBlocks.map((block) => (
                        <DocBlockRenderer
                          key={block.id}
                          block={block}
                          settings={settings}
                          highlightType={highlightType}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {sections.length === 0 && (
                <p style={{ color: `hsl(${settings.mutedForegroundColor})` }}>
                  This page has no content yet.
                </p>
              )}

              {showFeedback && activePage?.id && (
                <PageFeedback pageId={activePage.id} settings={settings} />
              )}
            </article>
          ) : (
            <p style={{ color: `hsl(${settings.mutedForegroundColor})` }}>
              No pages in this project yet.
            </p>
          )}
        </main>

        {settings.tocVisible && (
          <div style={{ paddingLeft: `${settings.tocGap}px` }}>
            <TableOfContents
              sections={sections}
              settings={settings}
              stickyTop={sidebarTop}
            />
          </div>
        )}
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
