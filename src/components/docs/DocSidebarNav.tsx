import { useState, useEffect, type ReactNode } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";

export interface SidebarPageBase {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  nav_group_id?: string | null;
}

export interface SidebarSection {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
}

export interface SidebarNavGroup {
  id: string;
  title: string;
  order_index: number;
}

interface DocSidebarNavProps<TPage extends SidebarPageBase = SidebarPageBase> {
  settings: DesignSettings;
  pages: TPage[];
  activePage: TPage | null;
  sections: SidebarSection[];
  onSelectPage: (page: TPage) => void;
  renderPageActions?: (page: TPage, isActive: boolean) => ReactNode;
  headerAction?: ReactNode;
  stickyTop?: number;
  hideHeaderLabel?: boolean;
  navGroups?: SidebarNavGroup[];
}

const DocSidebarNav = <TPage extends SidebarPageBase = SidebarPageBase>({
  settings: s,
  pages,
  activePage,
  sections,
  onSelectPage,
  renderPageActions,
  headerAction,
  stickyTop = 48,
  hideHeaderLabel = false,
  navGroups = [],
}: DocSidebarNavProps<TPage>) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!s.sidebarShowSectionTracker || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id.replace("section-", "");
          setActiveSectionId(id);
          break;
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    const sectionEls = sections
      .map((sec) => document.getElementById(`section-${sec.id}`))
      .filter(Boolean) as HTMLElement[];

    sectionEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sections, s.sidebarShowSectionTracker]);

  const ungroupedPages = pages.filter((p) => !p.nav_group_id);
  const hasGroups = navGroups.length > 0;

  const renderPage = (page: TPage) => {
    const isActive = activePage?.id === page.id;
    const pageSections = isActive ? sections : [];

    return (
      <div key={page.id}>
        <div className="group flex items-center gap-1">
          {renderPageActions ? (
            renderPageActions(page, isActive)
          ) : (
            <button
              onClick={() => onSelectPage(page)}
              className="flex-1 text-left truncate py-[3px] transition-colors block w-full"
              style={{
                fontSize: `${s.sidebarFontSize}px`,
                color: isActive
                  ? `hsl(${s.sidebarActiveColor})`
                  : `hsl(${s.sidebarTextColor})`,
                fontWeight: isActive ? 500 : 400,
                fontFamily: `'${s.bodyFont}', sans-serif`,
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: page.title }} />
            </button>
          )}
        </div>

        {isActive && pageSections.length > 0 && (
          <nav
            className="ml-px mt-px mb-1"
            style={{
              borderLeft: `1px solid hsl(${s.borderColor} / 0.5)`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {pageSections.map((section) => {
              const isSectionActive =
                s.sidebarShowSectionTracker && activeSectionId === section.id;

              return (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  className="block py-[3px] pl-3 transition-colors relative"
                  style={{
                    color: isSectionActive
                      ? `hsl(${s.sidebarActiveColor})`
                      : `hsl(${s.sidebarTextColor} / 0.65)`,
                    fontSize: `${s.sidebarFontSize - 1}px`,
                    fontWeight: isSectionActive ? 500 : 400,
                    fontFamily: `'${s.bodyFont}', sans-serif`,
                  }}
                >
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
  };

  return (
    <aside
      style={{
        width: `${s.sidebarWidth}px`,
        backgroundColor: `hsl(${s.sidebarBg})`,
        top: `${stickyTop}px`,
        height: `calc(100vh - ${stickyTop}px)`,
      }}
      className="shrink-0 sticky overflow-y-auto py-8 pr-6 hidden lg:block"
    >
      {!hideHeaderLabel && (
        <div
          className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center justify-between"
          style={{ color: `hsl(${s.sidebarTextColor})` }}
        >
          <span>Pages</span>
          {headerAction}
        </div>
      )}

      <nav style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
        {/* Ungrouped pages */}
        {ungroupedPages.map(renderPage)}

        {/* Nav groups with their pages */}
        {hasGroups &&
          navGroups.map((group) => {
            const groupPages = pages.filter((p) => p.nav_group_id === group.id);
            return (
              <div key={group.id} className="mt-3">
                <div
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: `hsl(${s.sidebarTextColor} / 0.5)` }}
                >
                  {group.title}
                </div>
                <div style={{ gap: `${s.sidebarPageGap}px` }} className="flex flex-col">
                  {groupPages.map(renderPage)}
                </div>
              </div>
            );
          })}
      </nav>
    </aside>
  );
};

export default DocSidebarNav;
