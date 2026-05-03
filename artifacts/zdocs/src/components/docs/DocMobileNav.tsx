import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Menu, X, Search, ChevronRight } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { smoothBehavior } from "@/lib/motion";

interface MobileNavPage {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  nav_group_id?: string | null;
  nav_title?: string | null;
}

interface MobileNavSection {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
  nav_title?: string | null;
}

interface MobileNavGroup {
  id: string;
  title: string;
  order_index: number;
  type?: string;
}

interface MobileNavTab {
  id: string;
  label: string;
  order_index: number;
  metadata?: Record<string, any>;
}

interface DocMobileNavProps {
  settings: DesignSettings;
  pages: MobileNavPage[];
  activePage: MobileNavPage | null;
  sections: MobileNavSection[];
  onSelectPage: (page: MobileNavPage) => void;
  onSearchOpen?: () => void;
  navGroups?: MobileNavGroup[];
  projectName?: string;
  tabs?: MobileNavTab[];
  activeTabId?: string | null;
  onSelectTab?: (id: string | null) => void;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const DocMobileNav = forwardRef<HTMLDivElement, DocMobileNavProps>(({
  settings: s,
  pages,
  activePage,
  sections,
  onSelectPage,
  onSearchOpen,
  navGroups = [],
  projectName,
  tabs = [],
  activeTabId = null,
  onSelectTab,
}, ref) => {
  const [open, setOpen] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);
  const sortedNavGroups = [...navGroups].sort((a, b) => a.order_index - b.order_index);
  const ungroupedPages = sortedPages.filter((p) => !p.nav_group_id);
  const activeSections = sections.filter((sec) => sec.page_id === activePage?.id);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Move focus into the drawer on open.
    requestAnimationFrame(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Restore focus to whatever opened the drawer.
      previouslyFocused?.focus?.();
    };
  }, [open]);

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

  const handleSelectPage = (page: MobileNavPage) => {
    onSelectPage(page);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: smoothBehavior() });
  };

  const handleSectionClick = (sectionId: string) => {
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top, behavior: smoothBehavior() });
      }
    }, 100);
  };

  return (
    <div ref={ref} className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
        style={{ color: `hsl(${s.foregroundColor})` }}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="doc-mobile-drawer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-label="Documentation navigation"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            id="doc-mobile-drawer"
            ref={drawerRef}
            className="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] overflow-y-auto"
            style={{
              backgroundColor: `hsl(${s.sidebarBg})`,
              borderRight: `1px solid hsl(${s.borderColor})`,
              animation: "slideInLeft 0.2s ease-out",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
              style={{
                backgroundColor: `hsl(${s.sidebarBg})`,
                borderColor: `hsl(${s.borderColor})`,
              }}
            >
              <span
                className="font-semibold text-sm truncate"
                style={{ fontFamily: `'${s.bodyFont}', sans-serif`, color: `hsl(${s.foregroundColor})` }}
              >
                {projectName || "Navigation"}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                style={{ color: `hsl(${s.mutedForegroundColor})` }}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tabs.length > 0 && (
              <div
                className="flex flex-wrap gap-1 px-3 pt-3"
                role="tablist"
                aria-label="Documentation sections"
              >
                {[...tabs]
                  .filter((t) => !t.metadata?.hidden)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((tab) => {
                    const isActive = activeTabId === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        data-sidebar-item
                        onClick={() => {
                          onSelectTab?.(isActive ? null : tab.id);
                        }}
                        className="px-3 py-1.5 rounded-full text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                        style={{
                          backgroundColor: isActive
                            ? `hsl(${s.mutedColor})`
                            : "transparent",
                          color: isActive
                            ? `hsl(${s.foregroundColor})`
                            : `hsl(${s.mutedForegroundColor})`,
                          fontWeight: isActive ? 500 : 400,
                          fontFamily: `'${s.bodyFont}', sans-serif`,
                          border: `1px solid hsl(${s.borderColor})`,
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
              </div>
            )}

            {onSearchOpen && (
              <div className="px-3 py-2">
                <button
                  onClick={() => { setOpen(false); onSearchOpen(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-[hsl(var(--docs-muted)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                  style={{
                    borderColor: `hsl(${s.borderColor})`,
                    color: `hsl(${s.mutedForegroundColor})`,
                    fontSize: "13px",
                    fontFamily: `'${s.bodyFont}', sans-serif`,
                  }}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search</span>
                </button>
              </div>
            )}

            {activeSections.length > 0 && (
              <div
                className="flex mx-3 mt-1 mb-2 rounded-lg p-0.5"
                style={{ backgroundColor: `hsl(${s.mutedColor})` }}
                role="tablist"
              >
                <button
                  onClick={() => setShowTOC(false)}
                  role="tab"
                  aria-selected={!showTOC}
                  className="flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                  style={{
                    backgroundColor: !showTOC ? `hsl(${s.backgroundColor})` : "transparent",
                    color: !showTOC ? `hsl(${s.foregroundColor})` : `hsl(${s.mutedForegroundColor})`,
                  }}
                >
                  Pages
                </button>
                <button
                  onClick={() => setShowTOC(true)}
                  role="tab"
                  aria-selected={showTOC}
                  className="flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                  style={{
                    backgroundColor: showTOC ? `hsl(${s.backgroundColor})` : "transparent",
                    color: showTOC ? `hsl(${s.foregroundColor})` : `hsl(${s.mutedForegroundColor})`,
                  }}
                >
                  On This Page
                </button>
              </div>
            )}

            <div className="px-3 py-2 pb-8">
              {showTOC ? (
                <nav onKeyDown={onNavKeyDown} className="flex flex-col gap-0.5" aria-label="Page sections">
                  {activeSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section.id)}
                      data-sidebar-item
                      className="text-left px-3 py-2 rounded-lg transition-colors hover:bg-[hsl(var(--docs-muted)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                      style={{
                        fontSize: "13px",
                        color: `hsl(${s.foregroundColor})`,
                        fontFamily: `'${s.bodyFont}', sans-serif`,
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: section.nav_title || section.title }} />
                    </button>
                  ))}
                </nav>
              ) : (
                <nav onKeyDown={onNavKeyDown} className="flex flex-col gap-0.5" aria-label="Pages">
                  {ungroupedPages.map((page) => {
                    const isActive = activePage?.id === page.id;
                    return (
                      <button
                        key={page.id}
                        onClick={() => handleSelectPage(page)}
                        aria-current={isActive ? "page" : undefined}
                        data-sidebar-item
                        className="flex items-center justify-between text-left px-3 py-2 rounded-lg transition-colors hover:bg-[hsl(var(--docs-muted)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                        style={{
                          backgroundColor: isActive ? `hsl(${s.mutedColor})` : undefined,
                          fontSize: `${s.sidebarFontSize}px`,
                          color: isActive ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarTextColor})`,
                          fontWeight: isActive ? 500 : 400,
                          fontFamily: `'${s.bodyFont}', sans-serif`,
                        }}
                      >
                        <span dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
                        {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
                      </button>
                    );
                  })}

                  {sortedNavGroups.map((group) => {
                    const isTextType = group.type === "text";
                    const groupPages = sortedPages.filter((p) => p.nav_group_id === group.id);

                    if (isTextType) {
                      return (
                        <div
                          key={group.id}
                          className="px-3 py-1 mt-1"
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
                          className="font-semibold uppercase tracking-widest px-3 mb-1"
                          style={{
                            color: `hsl(${s.sidebarLabelColor || s.sidebarTextColor})`,
                            fontSize: `${(s.sidebarLabelFontSize || 12) - 1}px`,
                            letterSpacing: "0.06em",
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: group.title }} />
                        </div>
                        {groupPages.map((page) => {
                          const isActive = activePage?.id === page.id;
                          return (
                            <button
                              key={page.id}
                              onClick={() => handleSelectPage(page)}
                              aria-current={isActive ? "page" : undefined}
                              data-sidebar-item
                              className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg transition-colors hover:bg-[hsl(var(--docs-muted)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
                              style={{
                                backgroundColor: isActive ? `hsl(${s.mutedColor})` : undefined,
                                fontSize: `${s.sidebarFontSize}px`,
                                color: isActive ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarTextColor})`,
                                fontWeight: isActive ? 500 : 400,
                                fontFamily: `'${s.bodyFont}', sans-serif`,
                              }}
                            >
                              <span dangerouslySetInnerHTML={{ __html: page.nav_title || page.title }} />
                              {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </nav>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DocMobileNav.displayName = "DocMobileNav";

export default DocMobileNav;
