import { useState, useEffect, useRef, type ReactNode, useMemo, useCallback } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
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
  /** Used to namespace per-project collapse state in localStorage. */
  projectId?: string;
}

const COLLAPSE_KEY_PREFIX = "zdocs.sidebar.collapsed.";

function loadCollapse(projectId?: string): Record<string, boolean> {
  if (!projectId || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY_PREFIX + projectId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistCollapse(projectId: string | undefined, state: Record<string, boolean>) {
  if (!projectId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSE_KEY_PREFIX + projectId, JSON.stringify(state));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/**
 * Mintlify-faithful sidebar.
 * - Layered surface (uses settings.sidebarBg, which the resolver patches
 *   to a distinct surface from page background).
 * - Right divider against content. Internal scrolling, sticky under header.
 * - Group headers: small, semibold, uppercase tracking. Collapsible with
 *   per-project persistence via localStorage.
 * - Items: hover tint, focus-visible ring, active state with 2px accent
 *   bar + inset surface tint.
 * - Active item is auto-scrolled into view within the sidebar.
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
  projectId,
}: MintlifyProps<TPage>) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  /* ─── Section scroll-spy ────────────────────────────────────────── */
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

  /* ─── Per-group collapse state, persisted per project ───────────── */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadCollapse(projectId));

  // Reload collapse state when the project changes (e.g. SPA navigation
  // between /p/:slug routes without a remount).
  useEffect(() => {
    setOpenGroups(loadCollapse(projectId));
  }, [projectId]);

  // When the active page lives in a group, make sure that group is open —
  // whether it was closed by user action OR by `metadata.expanded === false`
  // default. Find the group to check its metadata default.
  useEffect(() => {
    const gid = activePage?.nav_group_id;
    if (!gid) return;
    const group = navGroups.find((g) => g.id === gid);
    setOpenGroups((prev) => {
      const explicit = prev[gid];
      const effectivelyOpen = explicit ?? (group?.metadata?.expanded !== false);
      if (effectivelyOpen) return prev;
      return { ...prev, [gid]: true };
    });
  }, [activePage?.nav_group_id, navGroups]);

  const isGroupOpen = useCallback(
    (g: SidebarNavGroup) => openGroups[g.id] ?? (g.metadata?.expanded !== false),
    [openGroups],
  );
  const toggleGroup = useCallback((g: SidebarNavGroup) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [g.id]: !(prev[g.id] ?? (g.metadata?.expanded !== false)) };
      persistCollapse(projectId, next);
      return next;
    });
  }, [projectId]);

  /* ─── Scroll active row into view inside the sidebar ────────────── */
  useEffect(() => {
    const aside = asideRef.current;
    const row = activeRowRef.current;
    if (!aside || !row) return;
    const aTop = aside.scrollTop;
    const aBot = aTop + aside.clientHeight;
    const rTop = row.offsetTop;
    const rBot = rTop + row.offsetHeight;
    if (rTop < aTop + 16) {
      aside.scrollTo({ top: Math.max(0, rTop - 24), behavior: "smooth" });
    } else if (rBot > aBot - 16) {
      aside.scrollTo({ top: rBot - aside.clientHeight + 24, behavior: "smooth" });
    }
    // Re-run after openGroups changes so a row that was hidden inside a
    // collapsed group still scrolls into view once its group auto-opens.
  }, [activePage?.id, openGroups]);

  /* ─── Arrow-key roving navigation ────────────────────────────────
   * Treat all rendered rows + group toggles + section links as a flat
   * vertical list. ArrowDown/Up moves focus, Home/End jump to ends.
   * Tab still works (everything is in the natural tab order). */
  const onNavKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const root = e.currentTarget as HTMLElement;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-sidebar-item]")
    ).filter((el) => !el.hasAttribute("disabled"));
    if (items.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? items.indexOf(current) : -1;
    let nextIdx = idx;
    if (e.key === "ArrowDown") nextIdx = idx < 0 ? 0 : Math.min(items.length - 1, idx + 1);
    else if (e.key === "ArrowUp") nextIdx = idx <= 0 ? items.length - 1 : idx - 1;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = items.length - 1;
    if (nextIdx !== idx) {
      e.preventDefault();
      items[nextIdx]?.focus();
    }
  }, []);

  /* ─── Tag pill ──────────────────────────────────────────────────── */
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

  /* ─── Single page row ───────────────────────────────────────────── */
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
      backgroundColor: isActive ? `hsl(${s.mutedColor})` : undefined,
    };

    const rowClasses = [
      "doc-sidebar-row group/row relative flex-1 flex items-center gap-2 truncate w-full text-left",
      "h-[30px] pl-4 pr-3 rounded-md transition-colors",
      "hover:bg-[hsl(var(--docs-muted)/0.7)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--docs-sidebar-bg))]",
    ].join(" ");

    const innerLabel = (
      <>
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
            style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
          />
        )}
        <span className="truncate" dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
        {renderTag(tag)}
      </>
    );

    const button = renderPageActions ? (
      renderPageActions(page, isActive)
    ) : externalUrl ? (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={rowClasses}
        style={baseStyle}
        data-sidebar-item
      >
        <span className="truncate" dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
        {renderTag(tag)}
      </a>
    ) : (
      <button
        type="button"
        onClick={() => {
          onSelectPage(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        aria-current={isActive ? "page" : undefined}
        className={rowClasses}
        style={baseStyle}
        data-sidebar-item
      >
        {innerLabel}
      </button>
    );

    return (
      <div key={page.id} ref={isActive ? activeRowRef : undefined}>
        <div className="group flex items-center">{button}</div>

        {isActive && pageSections.length > 0 && (
          <nav
            className="ml-4 mt-1 mb-2 flex flex-col"
            aria-label="Page sections"
            style={{ borderLeft: `1px solid hsl(${s.borderColor})` }}
          >
            {pageSections.map((section) => {
              const isSA = s.sidebarShowSectionTracker && activeSectionId === section.id;
              return (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  data-sidebar-item
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(`section-${section.id}`);
                    if (el) {
                      const top = el.getBoundingClientRect().top + window.scrollY - (stickyTop + 24);
                      window.scrollTo({ top, behavior: "smooth" });
                    }
                  }}
                  className={[
                    "flex items-center h-7 pl-5 transition-colors relative rounded-md",
                    "hover:bg-[hsl(var(--docs-muted)/0.6)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--docs-sidebar-bg))]",
                  ].join(" ")}
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
                      aria-hidden
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
      ref={asideRef}
      style={{
        width: `${s.sidebarWidth}px`,
        backgroundColor: `hsl(${s.sidebarBg})`,
        borderRight: `1px solid hsl(${s.borderColor})`,
        top: `${stickyTop}px`,
        height: `calc(100vh - ${stickyTop}px)`,
      }}
      className="shrink-0 sticky overflow-y-auto py-8 pr-4 pl-2 hidden lg:block"
      aria-label="Documentation navigation"
    >
      {!hideHeaderLabel && (
        <div
          className="font-semibold mb-2 pl-4 pr-3 flex items-center justify-between"
          style={{
            color: `hsl(${s.sidebarLabelColor || s.foregroundColor})`,
            fontSize: `${s.sidebarLabelFontSize || 12}px`,
            fontFamily: `'${s.bodyFont}', sans-serif`,
            letterSpacing: "0.01em",
          }}
        >
          <span>Documentation</span>
          {headerAction}
        </div>
      )}

      <nav onKeyDown={onNavKeyDown} className="flex flex-col" style={{ gap: `${Math.max(s.sidebarPageGap, 0)}px` }}>
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
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={open}
                aria-controls={`sidebar-group-${group.id}`}
                data-sidebar-item
                className={[
                  "w-full flex items-center justify-between gap-2 pl-4 pr-3 mb-1.5 text-left select-none rounded-md py-1",
                  "hover:bg-[hsl(var(--docs-muted)/0.5)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--docs-sidebar-bg))]",
                ].join(" ")}
                style={{
                  fontSize: `${(s.sidebarLabelFontSize || 12) - 1}px`,
                  color: `hsl(${s.sidebarLabelColor || s.foregroundColor})`,
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <span className="truncate flex items-center gap-1.5">
                  <span dangerouslySetInnerHTML={{ __html: group.title }} />
                  {renderTag(tag)}
                </span>
                <ChevronDown
                  aria-hidden
                  className="h-3 w-3 shrink-0 opacity-60 transition-transform"
                  style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
                />
              </button>
              {open && (
                <div
                  id={`sidebar-group-${group.id}`}
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
