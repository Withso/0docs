import { useState, useEffect, useCallback } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { DocVersion } from "@/hooks/use-versions";
import DesignSettingsWrapper from "./DesignSettingsWrapper";
import DocBlockRenderer from "./DocBlockRenderer";
import DocSidebarNavMintlify from "./DocSidebarNavMintlify";
import TableOfContents from "./TableOfContents";
import SearchDialog from "./SearchDialog";
import PageFeedback from "./PageFeedback";
import VersionSelector from "./VersionSelector";
import DocMobileNav from "./DocMobileNav";
import { Search, Sun, Moon } from "lucide-react";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import { getAppearance } from "@/lib/theme/resolve-doc-theme";
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
  const headerHeight = hideHeader ? 0 : 64;
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

  const handleSearch = useCallback((_query: string, _resultsCount: number) => {}, []);

  return (
    <DesignSettingsWrapper settings={s} className="min-h-full">
      {!hideHeader && (
        <header
          className="sticky z-40 border-b"
          style={{
            top: headerStickyTop,
            height: `${headerHeight}px`,
            backgroundColor: `hsl(${settings.backgroundColor})`,
            borderColor: `hsl(${settings.borderColor})`,
          }}
        >
          <div
            style={{ maxWidth: `${frameMaxWidth}px` }}
            className="mx-auto h-full px-6 lg:px-8 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              {showMobileNav && (
                <DocMobileNav
                  settings={settings}
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
                className="font-semibold truncate"
                style={{
                  fontFamily: `'${settings.bodyFont}', sans-serif`,
                  fontSize: "17px",
                  color: `hsl(${settings.foregroundColor})`,
                }}
              >
                {projectName}
              </span>
              {versions.length > 1 && activeVersion && onSelectVersion && (
                <VersionSelector
                  versions={versions}
                  activeVersion={activeVersion}
                  onSelect={onSelectVersion}
                  settings={settings}
                />
              )}
            </div>

            {tabs.length > 0 && (
              <div className="hidden md:flex items-center gap-1">
                {[...tabs]
                  .filter((tab) => !tab.metadata?.hidden)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((tab) => {
                    const isActive = activeTabId === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => onSelectTab?.(isActive ? null : tab.id)}
                        className="px-3.5 py-1.5 rounded-full transition-colors text-[14px]"
                        style={{
                          color: isActive
                            ? `hsl(${settings.foregroundColor})`
                            : `hsl(${settings.mutedForegroundColor})`,
                          fontWeight: isActive ? 500 : 400,
                          fontFamily: `'${settings.bodyFont}', sans-serif`,
                          backgroundColor: isActive ? `hsl(${settings.mutedColor})` : "transparent",
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-3 pl-3.5 pr-2 py-1.5 rounded-full border transition-colors hover:bg-accent w-[180px] sm:w-[260px]"
                style={{
                  borderColor: `hsl(${settings.borderColor})`,
                  color: `hsl(${settings.mutedForegroundColor})`,
                  fontSize: "13px",
                  fontFamily: `'${settings.bodyFont}', sans-serif`,
                }}
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline flex-1 text-left">Search...</span>
                <kbd
                  className="hidden sm:inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono"
                  style={{
                    borderColor: `hsl(${settings.borderColor})`,
                    color: `hsl(${settings.mutedForegroundColor})`,
                  }}
                >
                  ⌘K
                </kbd>
              </button>
              {!getAppearance(settings).strict && <ThemeToggleButton settings={settings} />}
            </div>
          </div>
        </header>
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
        />

        <main className="flex-1 min-w-0 py-12">
          {activePage ? (
            <article style={{ maxWidth: `${settings.contentMaxWidth}px` }}>
              {eyebrow && (
                <div
                  className="mb-3 text-[14px] font-medium"
                  style={{
                    color: `hsl(${settings.primaryColor})`,
                    fontFamily: `'${settings.bodyFont}', sans-serif`,
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
                  letterSpacing: "-0.02em",
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

                return (
                  <section
                    key={section.id}
                    id={`section-${section.id}`}
                    style={{ marginBottom: `${settings.sectionSpacing}px` }}
                  >
                    <h2
                      className="flex items-center gap-3 mb-5"
                      style={{
                        fontFamily: `'${settings.headingFont}', sans-serif`,
                        fontWeight: settings.headingWeight,
                        fontSize: `${settings.headingFontSize}px`,
                        letterSpacing: "-0.015em",
                        color: `hsl(${settings.foregroundColor})`,
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: section.title }} />
                      {settings.sectionBorderVisible && (
                        <span
                          className="flex-1"
                          style={{
                            height: `${settings.sectionBorderThickness}px`,
                            backgroundColor: `hsl(${settings.sectionBorderColor})`,
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

function ThemeToggleButton({ settings }: { settings: DesignSettings }) {
  const { theme, toggle } = usePlatformTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-accent"
      style={{ color: `hsl(${settings.mutedForegroundColor})` }}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default DocContentView;
