import { useState, useEffect, useRef, type ReactNode, useMemo } from "react";
import { Folder, FolderOpen, FileText, ExternalLink } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { SidebarPageBase, SidebarSection, SidebarNavGroup } from "./DocSidebarNav";

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
 * Mintlify-style sidebar variant.
 *  - Folder icons for nav groups (collapsible)
 *  - File icons + indented children with vertical rule
 *  - Tag badges (NEW / Beta / hidden) from page/group metadata
 *  - Honors `hidden=true` (filtered out) and `external_url` (opens new tab)
 */
const DocSidebarNavMintlify = <TPage extends SidebarPageBase = SidebarPageBase>({
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
}: MintlifyProps<TPage>) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Section scroll tracker (shared logic)
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

  // Per-group open state — default open if it contains the active page
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!activePage?.nav_group_id) return;
    setOpenGroups((prev) => prev[activePage.nav_group_id!] === undefined
      ? { ...prev, [activePage.nav_group_id!]: true }
      : prev);
  }, [activePage?.nav_group_id]);

  const isGroupOpen = (g: SidebarNavGroup) => openGroups[g.id] ?? true;
  const toggleGroup = (g: SidebarNavGroup) =>
    setOpenGroups((prev) => ({ ...prev, [g.id]: !isGroupOpen(g) }));

  const renderTag = (tag: string | undefined) => {
    if (!tag) return null;
    const lc = tag.toLowerCase();
    const palette: Record<string, { bg: string; fg: string }> = {
      new: { bg: "142 76% 92%", fg: "142 76% 28%" },
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

  const renderPageRow = (page: TPage, indent = false) => {
    const meta = (page as any).metadata || {};
    const isActive = activePage?.id === page.id;
    const externalUrl = meta.external_url as string | undefined;
    const tag = meta.tag as string | undefined;
    const pageSections = isActive ? sections : [];

    const button = renderPageActions ? (
      renderPageActions(page, isActive)
    ) : externalUrl ? (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center gap-2 truncate py-[5px] px-2 rounded-md transition-colors hover:bg-accent"
        style={{
          fontSize: `${s.sidebarFontSize}px`,
          color: `hsl(${s.sidebarTextColor})`,
          fontFamily: `'${s.bodyFont}', sans-serif`,
        }}
      >
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
        <span className="truncate" dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
        {renderTag(tag)}
      </a>
    ) : (
      <button
        onClick={() => {
          onSelectPage(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="flex-1 flex items-center gap-2 truncate py-[5px] px-2 rounded-md transition-colors w-full text-left"
        style={{
          fontSize: `${s.sidebarFontSize}px`,
          color: isActive ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarTextColor})`,
          backgroundColor: isActive ? `hsl(${s.sidebarActiveColor} / 0.08)` : "transparent",
          fontWeight: isActive ? 500 : 400,
          fontFamily: `'${s.bodyFont}', sans-serif`,
        }}
      >
        <FileText className="h-3 w-3 shrink-0 opacity-60" />
        <span className="truncate" dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
        {renderTag(tag)}
      </button>
    );

    return (
      <div key={page.id} style={indent ? { paddingLeft: 8 } : undefined}>
        <div className="group flex items-center gap-1">{button}</div>

        {isActive && pageSections.length > 0 && (
          <nav
            className="ml-[18px] mt-px mb-1"
            style={{
              borderLeft: `1px solid hsl(${s.borderColor} / 0.5)`,
              display: "flex",
              flexDirection: "column",
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
                  className="block py-[3px] pl-3 transition-colors relative"
                  style={{
                    color: isSA ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarSectionColor || s.sidebarTextColor} / 0.7)`,
                    fontSize: `${s.sidebarSectionFontSize || (s.sidebarFontSize - 1)}px`,
                    fontWeight: isSA ? 500 : 400,
                    fontFamily: `'${s.bodyFont}', sans-serif`,
                  }}
                >
                  {isSA && (
                    <span
                      className="absolute left-[-1px] top-[5px] bottom-[5px] w-[2px] rounded-full"
                      style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
                    />
                  )}
                  <span dangerouslySetInnerHTML={{ __html: section.nav_title || section.title }} />
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
      className="shrink-0 sticky overflow-y-auto py-8 pr-4 hidden lg:block"
    >
      {!hideHeaderLabel && (
        <div
          className="font-semibold uppercase tracking-widest mb-3 px-2 flex items-center justify-between"
          style={{
            color: `hsl(${s.sidebarLabelColor || s.sidebarTextColor})`,
            fontSize: `${s.sidebarLabelFontSize || 10}px`,
          }}
        >
          <span>Documentation</span>
          {headerAction}
        </div>
      )}

      <nav className="flex flex-col" style={{ gap: `${Math.max(s.sidebarPageGap, 1)}px` }}>
        {ungroupedPages.map((p) => renderPageRow(p))}

        {sortedNavGroups.map((group) => {
          const isText = group.type === "text";
          const tag = group.metadata?.tag as string | undefined;
          const groupPages = sortedPages.filter((p) => p.nav_group_id === group.id);

          if (isText) {
            return (
              <div
                key={group.id}
                className="mt-1 py-[4px] px-2 select-none"
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
          const open = isGroupOpen(group);

          return (
            <div key={group.id} className="mt-2">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-2 px-2 py-[5px] rounded-md text-left transition-colors hover:bg-accent"
                style={{
                  fontSize: `${s.sidebarFontSize}px`,
                  color: `hsl(${s.sidebarActiveColor})`,
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                  fontWeight: 600,
                }}
              >
                {open
                  ? <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  : <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                <span className="truncate" dangerouslySetInnerHTML={{ __html: group.title }} />
                {renderTag(tag)}
              </button>
              {open && (
                <div
                  className="ml-[10px] mt-0.5 pl-[10px]"
                  style={{
                    borderLeft: `1px solid hsl(${s.borderColor} / 0.4)`,
                    display: "flex",
                    flexDirection: "column",
                    gap: `${Math.max(s.sidebarPageGap, 1)}px`,
                  }}
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
