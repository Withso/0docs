import { useState, useEffect, useRef, type ReactNode, useMemo } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";

export interface SidebarPageBase {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  nav_group_id?: string | null;
  nav_title?: string | null;
}

export interface SidebarSection {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
  nav_title?: string | null;
}

export interface SidebarNavGroup {
  id: string;
  title: string;
  order_index: number;
  type?: "label" | "text" | "dropdown" | string;
  tab_id?: string | null;
  metadata?: Record<string, any>;
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
  activeTabId?: string | null;
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
  activeTabId = null,
}: DocSidebarNavProps<TPage>) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!s.sidebarShowSectionTracker || sections.length === 0) return;

    const visibilityMap = new Map<string, IntersectionObserverEntry>();

    const computeActive = () => {
      if (window.scrollY < 100) {
        setActiveSectionId(sections[0].id);
        return;
      }

      const atBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50);
      if (atBottom) {
        setActiveSectionId(sections[sections.length - 1].id);
        return;
      }

      let bestId: string | null = null;
      let bestTop = Infinity;

      visibilityMap.forEach((entry, elementId) => {
        if (!entry.isIntersecting) return;
        const top = entry.boundingClientRect.top;
        if (top < bestTop) {
          bestTop = top;
          bestId = elementId.replace("section-", "");
        }
      });

      if (!bestId) {
        let lastPastId: string | null = null;
        for (const sec of sections) {
          const entry = visibilityMap.get(`section-${sec.id}`);
          if (entry && entry.boundingClientRect.top < 0) {
            lastPastId = sec.id;
          }
        }
        if (lastPastId) bestId = lastPastId;
      }

      if (bestId) setActiveSectionId(bestId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visibilityMap.set(entry.target.id, entry));
        computeActive();
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );

    const sectionEls = sections
      .map((sec) => document.getElementById(`section-${sec.id}`))
      .filter(Boolean) as HTMLElement[];

    sectionEls.forEach((el) => observer.observe(el));

    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        computeActive();
        rafRef.current = null;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    computeActive();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sections, s.sidebarShowSectionTracker]);

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.order_index - b.order_index),
    [pages],
  );
  const sortedNavGroups = useMemo(
    () => [...navGroups].sort((a, b) => a.order_index - b.order_index),
    [navGroups],
  );

  const ungroupedPages = sortedPages.filter((p) => !p.nav_group_id);
  const hasGroups = sortedNavGroups.length > 0;

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
              onClick={() => {
                onSelectPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
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
              <span dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
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
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(`section-${section.id}`);
                    if (el) {
                      const top =
                        el.getBoundingClientRect().top + window.scrollY - (stickyTop + 24);
                      window.scrollTo({ top, behavior: "smooth" });
                    }
                  }}
                  className="block py-[3px] pl-3 transition-colors relative"
                  style={{
                    color: isSectionActive
                      ? `hsl(${s.sidebarActiveColor})`
                      : `hsl(${s.sidebarSectionColor || s.sidebarTextColor} / 0.65)`,
                    fontSize: `${s.sidebarSectionFontSize || (s.sidebarFontSize - 1)}px`,
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
                  <span
                    dangerouslySetInnerHTML={{ __html: section.nav_title || section.title }}
                  />
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
          className="font-semibold uppercase tracking-widest mb-3 flex items-center justify-between"
          style={{
            color: `hsl(${s.sidebarLabelColor || s.sidebarTextColor})`,
            fontSize: `${s.sidebarLabelFontSize || 10}px`,
          }}
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
          sortedNavGroups.map((group) => {
            const isTextType = group.type === "text";
            const groupPages = sortedPages.filter((p) => p.nav_group_id === group.id);

            if (isTextType) {
              return (
                <div
                  key={group.id}
                  className="mt-1 py-[3px] select-none"
                  style={{
                    fontSize: `${s.sidebarFontSize}px`,
                    color: `hsl(${s.sidebarTextColor} / 0.6)`,
                    fontFamily: `'${s.bodyFont}', sans-serif`,
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: group.title }} />
                </div>
              );
            }

            if (groupPages.length === 0) return null;

            return (
              <div key={group.id} className="mt-3">
                <div
                  className="font-semibold uppercase tracking-widest mb-1.5"
                  style={{
                    color: `hsl(${s.sidebarLabelColor || s.sidebarTextColor} / 0.5)`,
                    fontSize: `${s.sidebarLabelFontSize || 10}px`,
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: group.title }} />
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
