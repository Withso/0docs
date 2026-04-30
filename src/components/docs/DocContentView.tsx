import { useState, useEffect, useCallback } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { DocVersion } from "@/hooks/use-versions";
import DesignSettingsWrapper from "./DesignSettingsWrapper";
import DocBlockRenderer from "./DocBlockRenderer";
import DocSidebarNav from "./DocSidebarNav";
import DocSidebarNavMintlify from "./DocSidebarNavMintlify";
import TableOfContents from "./TableOfContents";
import SearchDialog from "./SearchDialog";
import PageFeedback from "./PageFeedback";
import VersionSelector from "./VersionSelector";
import DocMobileNav from "./DocMobileNav";
import { Search, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import { getAppearance } from "@/lib/theme/resolve-doc-theme";

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
  pageId,
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
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const searchOpen = externalSearchOpen !== undefined ? externalSearchOpen : internalSearchOpen;
  const setSearchOpen = onExternalSearchOpenChange || setInternalSearchOpen;
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

  // Search handler (no tracking)
  const handleSearch = useCallback((_query: string, _resultsCount: number) => {
    // Search tracking removed — kept for interface compatibility
  }, []);

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
            className="mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              {/* Mobile nav hamburger */}
              {showMobileNav && (
                <DocMobileNav
                  settings={s}
                  pages={pages}
                  activePage={activePage}
                  sections={allSections || sections}
                  onSelectPage={onSelectPage}
                  onSearchOpen={() => setSearchOpen(true)}
                  navGroups={navGroups as any}
                  projectName={projectName}
                />
              )}
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
            <div className="flex items-center gap-1">
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
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `hsl(${s.borderColor})` }}>
                  ⌘K
                </kbd>
              </button>
              {!getAppearance(s).strict && <ThemeToggleButton settings={s} />}
            </div>
          </div>
          {/* Top-bar tabs + dropdown groups */}
          {(tabs.length > 0 || navGroups.some((g) => g.type === "dropdown")) && (
            <div
              style={{ maxWidth: `${frameMaxWidth}px` }}
              className="mx-auto px-4 sm:px-6 flex items-center gap-1 h-9 border-t"
            >
              {[...tabs]
                .filter((tab) => !tab.metadata?.hidden)
                .sort((a, b) => a.order_index - b.order_index)
                .map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onSelectTab?.(isActive ? null : tab.id)}
                    className="text-[12px] px-2.5 py-1 rounded-md transition-colors"
                    style={{
                      color: isActive
                        ? `hsl(${s.sidebarActiveColor})`
                        : `hsl(${s.mutedForegroundColor})`,
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: `'${s.bodyFont}', sans-serif`,
                      backgroundColor: isActive ? `hsl(${s.borderColor} / 0.3)` : "transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
              {navGroups
                .filter((g) => g.type === "dropdown" && !g.metadata?.hidden)
                .map((g) => (
                  <button
                    key={g.id}
                    className="text-[12px] px-2.5 py-1 rounded-md transition-colors hover:bg-accent flex items-center gap-1"
                    style={{
                      color: `hsl(${s.mutedForegroundColor})`,
                      fontFamily: `'${s.bodyFont}', sans-serif`,
                    }}
                    title={g.title.replace(/<[^>]*>/g, "")}
                  >
                    <span dangerouslySetInnerHTML={{ __html: g.title }} />
                    <span className="text-[10px] opacity-60">▾</span>
                  </button>
                ))}
            </div>
          )}
        </header>
      )}

      <div style={{ maxWidth: `${frameMaxWidth}px` }} className="mx-auto flex px-4 sm:px-6">
        {s.sidebarStyle === "mintlify" ? (
          <DocSidebarNavMintlify
            settings={s}
            pages={pages}
            activePage={activePage}
            sections={sections}
            onSelectPage={onSelectPage}
            stickyTop={sidebarTop}
            navGroups={navGroups}
            hideHeaderLabel={hideHeaderLabel}
            activeTabId={activeTabId}
          />
        ) : (
          <DocSidebarNav
            settings={s}
            pages={pages}
            activePage={activePage}
            sections={sections}
            onSelectPage={onSelectPage}
            stickyTop={sidebarTop}
            navGroups={navGroups}
            hideHeaderLabel={hideHeaderLabel}
            activeTabId={activeTabId}
          />
        )}

        <main className="flex-1 min-w-0 py-10 lg:pl-4" style={{ paddingRight: s.tocVisible ? undefined : undefined }}>
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
                <span dangerouslySetInnerHTML={{ __html: activePage.title }} />
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
                      <span dangerouslySetInnerHTML={{ __html: section.title }} />
                      {s.sectionBorderVisible && (
                        <span
                          className="flex-1"
                          style={{
                            height: `${s.sectionBorderThickness}px`,
                            backgroundColor: `hsl(${s.sectionBorderColor})`,
                            opacity: 0.5,
                          }}
                        />
                      )}
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

        {s.tocVisible && (
          <div style={{ paddingLeft: `${s.tocGap}px` }}>
            <TableOfContents
              sections={sections}
              settings={s}
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

/** Sun/moon toggle synced to the platform theme. */
function ThemeToggleButton({ settings }: { settings: DesignSettings }) {
  const { theme, toggle } = usePlatformTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-accent"
      style={{ color: `hsl(${settings.mutedForegroundColor})` }}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default DocContentView;
