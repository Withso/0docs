import { useState, useEffect, useRef, type ReactNode, useMemo } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";

export interface SidebarPageBase {
  id: string;
  title: string;
  nav_title?: string | null;
  nav_group_id?: string | null;
  order_index: number;
  metadata?: Record<string, any>;
}

export interface SidebarSection {
  id: string;
  page_id: string;
  title: string;
  nav_title?: string | null;
  order_index: number;
}

export interface SidebarNavGroup {
  id: string;
  title: string;
  type?: string;
  tab_id?: string | null;
  order_index: number;
  metadata?: Record<string, any>;
}

interface MintlifyProps<TPage extends SidebarPageBase = SidebarPageBase> {
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

/**
 * Mintlify-faithful sidebar.
 * - No icons. Plain text labels.
 * - Group label = small bold black uppercase-ish heading
 * - Active page = primary color text + thin primary bar on left
 * - Sections appear nested under active page with vertical guide line
 */
const DocSidebarNavMintlify = <TPage extends SidebarPageBase = SidebarPageBase>({
  settings: s,
  pages,
  activePage,
  sections,
  onSelectPage,
  renderPageActions,
  headerAction,
  stickyTop = 64,
  hideHeaderLabel = false,
  navGroups = [],
  activeTabId = null,
}: MintlifyProps<TPage>) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!s.sidebarShowSectionTracker || sections.length === 0) return;
    const visMap = new Map<string, IntersectionObserverEntry>();
    const compute = () => {
      if (window.scrollY < 100) { setActiveSectionId(sections[0].id); return; }
      const atBot = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50);
      if (atBot) { setActiveSectionId(sections[sections.length - 1].id); return; }
      let bestId: string | null = null, bestTop = Infinity;
      visMap.forEach((entry, elId) => {
        if (!entry.isIntersecting) return;
        const top = entry.boundingClientRect.top;
        if (top < bestTop) { bestTop = top; bestId = elId.replace("section-", ""); }
      });
      if (!bestId) {
        for (const sec of sections) {
          const e = visMap.get(`section-${sec.id}`);
          if (e && e.boundingClientRect.top < 0) bestId = sec.id;
        }
      }
      if (bestId) setActiveSectionId(bestId);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => visMap.set(e.target.id, e));
      compute();
    }, { rootMargin: "-10% 0px -50% 0px", threshold: [0, 0.25, 0.5] });
    const els = sections.map((sec) => document.getElementById(`section-${sec.id}`)).filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => { compute(); rafRef.current = null; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sections, s.sidebarShowSectionTracker]);

  const sortedPages = useMemo(
    () => [...pages]
      .filter((p) => !(p as any).metadata?.hidden)
      .sort((a, b) => a.order_index - b.order_index),
    [pages],
  );

  const sortedNavGroups = useMemo(
    () => [...navGroups]
      .filter((g) => g.type !== "dropdown")
      .filter((g) => !g.metadata?.hidden)
      .filter((g) => activeTabId == null || g.tab_id === activeTabId || !g.tab_id)
      .sort((a, b) => a.order_index - b.order_index),
    [navGroups, activeTabId],
  );

  const ungroupedPages = sortedPages.filter((p) => !p.nav_group_id);

  // Per-group open state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!activePage?.nav_group_id) return;
    setOpenGroups((prev) => prev[activePage.nav_group_id!] === undefined
      ? { ...prev, [activePage.nav_group_id!]: true }
      : prev);
  }, [activePage?.nav_group_id]);

  const isGroupOpen = (g: SidebarNavGroup) => openGroups[g.id] ?? (g.metadata?.expanded !== false);
  const toggleGroup = (g: SidebarNavGroup) =>
    setOpenGroups((prev) => ({ ...prev, [g.id]: !isGroupOpen(g) }));

  const renderTag = (tag: string | undefined) => {
    if (!tag) return null;
    const lc = tag.toLowerCase();
    const palette: Record<string, { bg: string; fg: string }> = {
      new: { bg: "152 76% 92%", fg: "152 76% 28%" },
      beta: { bg: "38 92% 92%", fg: "38 92% 35%" },
      updated: { bg: "214 100% 94%", fg: "214 100% 40%" },
      deprecated: { bg: "0 84% 94%", fg: "0 84% 40%" },
    };
    const p = palette[lc] || { bg: `${s.borderColor}`, fg: `${s.mutedForegroundColor}` };
    return (
      <span
        className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-[1px] rounded"
        style={{ backgroundColor: `hsl(${p.bg})`, color: `hsl(${p.fg})` }}
      >
        {tag}
      </span>
    );
  };

  const renderPageRow = (page: TPage) => {
    const meta = (page as any).metadata || {};
    const isActive = activePage?.id === page.id;
    const externalUrl = (meta.externalUrl || meta.external_url) as string | undefined;
    const tag = meta.tag as string | undefined;
    const pageSections = isActive ? sections : [];

    const baseStyle: React.CSSProperties = {
      fontSize: `${s.sidebarFontSize}px`,
      color: isActive
        ? `hsl(${s.sidebarActiveColor})`
        : `hsl(${s.sidebarTextColor})`,
      fontWeight: isActive ? 500 : 400,
      fontFamily: `'${s.bodyFont}', sans-serif`,
    };

    const rowClasses = "flex-1 flex items-center gap-2 truncate h-8 pl-4 pr-3 rounded-md transition-colors w-full text-left relative";

    const button = renderPageActions ? (
      renderPageActions(page, isActive)
    ) : externalUrl ? (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={rowClasses}
        style={baseStyle}
      >
        <span className="truncate" dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
        {renderTag(tag)}
      </a>
    ) : (
      <button
        onClick={() => {
          onSelectPage(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={rowClasses}
        style={baseStyle}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
            style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
          />
        )}
        <span className="truncate" dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
        {renderTag(tag)}
      </button>
    );

    return (
      <div key={page.id}>
        <div className="group flex items-center">{button}</div>

        {isActive && pageSections.length > 0 && (
          <nav
            className="ml-4 mt-1 mb-2 flex flex-col"
            style={{
              borderLeft: `1px solid hsl(${s.borderColor})`,
            }}
          >
            {pageSections.map((section) => {
              const isSA = s.sidebarShowSectionTracker && activeSectionId === section.id;
              return (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(`section-${section.id}`);
                    if (el) {
                      const top = el.getBoundingClientRect().top + window.scrollY - (stickyTop + 24);
                      window.scrollTo({ top, behavior: "smooth" });
                    }
                  }}
                  className="flex items-center h-7 pl-5 transition-colors relative"
                  style={{
                    color: isSA
                      ? `hsl(${s.sidebarActiveColor})`
                      : `hsl(${s.sidebarSectionColor || s.sidebarTextColor})`,
                    fontSize: `${s.sidebarSectionFontSize || (s.sidebarFontSize - 1)}px`,
                    fontWeight: isSA ? 500 : 400,
                    fontFamily: `'${s.bodyFont}', sans-serif`,
                  }}
                >
                  {isSA && (
                    <span
                      className="absolute left-[-1px] top-1 bottom-1 w-[2px] rounded-full"
                      style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
                    />
                  )}
                  <span className="truncate" dangerouslySetInnerHTML={{ __html: section.nav_title || section.title }} />
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
          className="font-semibold mb-2 px-3 flex items-center justify-between"
          style={{
            color: `hsl(${s.sidebarLabelColor || s.foregroundColor})`,
            fontSize: `${s.sidebarLabelFontSize || 12}px`,
            fontFamily: `'${s.bodyFont}', sans-serif`,
          }}
        >
          <span>Documentation</span>
          {headerAction}
        </div>
      )}

      <nav className="flex flex-col" style={{ gap: `${Math.max(s.sidebarPageGap, 0)}px` }}>
        {ungroupedPages.map((p) => renderPageRow(p))}

        {sortedNavGroups.map((group) => {
          const isText = group.type === "text";
          const tag = group.metadata?.tag as string | undefined;
          const groupPages = sortedPages.filter((p) => p.nav_group_id === group.id);

          if (isText) {
            return (
              <div
                key={group.id}
                className="mt-1 py-[4px] px-3 select-none"
                style={{
                  fontSize: `${s.sidebarFontSize}px`,
                  color: `hsl(${s.sidebarTextColor})`,
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                }}
              >
                <span dangerouslySetInnerHTML={{ __html: group.title }} />
              </div>
            );
          }

          if (groupPages.length === 0) return null;
          const open = isGroupOpen(group);

          return (
            <div key={group.id} className="mt-5">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between gap-2 px-3 mb-1 text-left"
                style={{
                  fontSize: `${s.sidebarLabelFontSize || 12}px`,
                  color: `hsl(${s.sidebarLabelColor || s.foregroundColor})`,
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                  fontWeight: 600,
                }}
              >
                <span className="truncate flex items-center gap-1.5">
                  <span dangerouslySetInnerHTML={{ __html: group.title }} />
                  {renderTag(tag)}
                </span>
                <ChevronRight
                  className="h-3 w-3 shrink-0 opacity-50 transition-transform"
                  style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
                />
              </button>
              {open && (
                <div
                  className="flex flex-col"
                  style={{ gap: `${Math.max(s.sidebarPageGap, 0)}px` }}
                >
                  {groupPages.map((p) => renderPageRow(p))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default DocSidebarNavMintlify;
