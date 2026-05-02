import { forwardRef, useState } from "react";
import { Menu, X, Search, ChevronRight } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";

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

interface DocMobileNavProps {
  settings: DesignSettings;
  pages: MobileNavPage[];
  activePage: MobileNavPage | null;
  sections: MobileNavSection[];
  onSelectPage: (page: MobileNavPage) => void;
  onSearchOpen?: () => void;
  navGroups?: MobileNavGroup[];
  projectName?: string;
}

const DocMobileNav = forwardRef<HTMLDivElement, DocMobileNavProps>(({
  settings: s,
  pages,
  activePage,
  sections,
  onSelectPage,
  onSearchOpen,
  navGroups = [],
  projectName,
}, ref) => {
  const [open, setOpen] = useState(false);
  const [showTOC, setShowTOC] = useState(false);

  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);
  const sortedNavGroups = [...navGroups].sort((a, b) => a.order_index - b.order_index);
  const ungroupedPages = sortedPages.filter((p) => !p.nav_group_id);
  const activeSections = sections.filter((sec) => sec.page_id === activePage?.id);

  const handleSelectPage = (page: MobileNavPage) => {
    onSelectPage(page);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSectionClick = (sectionId: string) => {
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <div ref={ref} className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
        style={{ color: `hsl(${s.foregroundColor})` }}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div
            className="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] overflow-y-auto"
            style={{
              backgroundColor: `hsl(${s.backgroundColor})`,
              borderRight: `1px solid hsl(${s.borderColor})`,
              animation: "slideInLeft 0.2s ease-out",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `hsl(${s.borderColor})` }}>
              <span
                className="font-semibold text-sm"
                style={{ fontFamily: `'${s.bodyFont}', sans-serif`, color: `hsl(${s.foregroundColor})` }}
              >
                {projectName || "Navigation"}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                style={{ color: `hsl(${s.mutedForegroundColor})` }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {onSearchOpen && (
              <div className="px-3 py-2">
                <button
                  onClick={() => { setOpen(false); onSearchOpen(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-accent"
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
              <div className="flex mx-3 mt-1 mb-2 rounded-lg p-0.5" style={{ backgroundColor: `hsl(${s.accentColor})` }}>
                <button
                  onClick={() => setShowTOC(false)}
                  className="flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: !showTOC ? `hsl(${s.backgroundColor})` : "transparent",
                    color: !showTOC ? `hsl(${s.foregroundColor})` : `hsl(${s.mutedForegroundColor})`,
                  }}
                >
                  Pages
                </button>
                <button
                  onClick={() => setShowTOC(true)}
                  className="flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: showTOC ? `hsl(${s.backgroundColor})` : "transparent",
                    color: showTOC ? `hsl(${s.foregroundColor})` : `hsl(${s.mutedForegroundColor})`,
                  }}
                >
                  On This Page
                </button>
              </div>
            )}

            <div className="px-3 py-2">
              {showTOC ? (
                <nav className="flex flex-col gap-0.5">
                  {activeSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section.id)}
                      className="text-left px-3 py-2 rounded-lg transition-colors hover:bg-accent"
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
                <nav className="flex flex-col gap-0.5">
                  {ungroupedPages.map((page) => {
                    const isActive = activePage?.id === page.id;
                    return (
                      <button
                        key={page.id}
                        onClick={() => handleSelectPage(page)}
                        className="flex items-center justify-between text-left px-3 py-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: isActive ? `hsl(${s.accentColor})` : undefined,
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
                            color: `hsl(${s.sidebarLabelColor || s.sidebarTextColor} / 0.5)`,
                            fontSize: `${s.sidebarLabelFontSize || 10}px`,
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
                              className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg transition-colors"
                              style={{
                                backgroundColor: isActive ? `hsl(${s.accentColor})` : undefined,
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
