import { useState, useEffect } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";

interface TOCSection {
  id: string;
  title: string;
}

interface TableOfContentsProps {
  sections: TOCSection[];
  settings: DesignSettings;
  stickyTop?: number;
}

const TableOfContents = ({ sections, settings: s, stickyTop = 48 }: TableOfContentsProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;

    // Track visibility ratios for all sections
    const visibilityMap = new Map<string, IntersectionObserverEntry>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visibilityMap.set(entry.target.id, entry));

        // Find the topmost visible section (smallest positive boundingClientRect.top)
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

        // If nothing is intersecting, find the last section that scrolled past
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

        if (bestId) setActiveId(bestId);
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
    );

    const els = sections
      .map((sec) => document.getElementById(`section-${sec.id}`))
      .filter(Boolean) as HTMLElement[];

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <aside
      className="shrink-0 sticky hidden xl:block py-8 pl-6"
      style={{
        width: "200px",
        top: `${stickyTop}px`,
        height: `calc(100vh - ${stickyTop}px)`,
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: `hsl(${s.mutedForegroundColor})` }}
      >
        On this page
      </div>
      <nav className="flex flex-col gap-1 border-l" style={{ borderColor: `hsl(${s.borderColor} / 0.4)` }}>
        {sections.map((section) => {
          const isActive = activeId === section.id;
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
                color: isActive
                  ? `hsl(${s.sidebarActiveColor})`
                  : `hsl(${s.mutedForegroundColor})`,
                fontSize: "12px",
                fontWeight: isActive ? 500 : 400,
                fontFamily: `'${s.bodyFont}', sans-serif`,
              }}
            >
              {isActive && (
                <span
                  className="absolute left-[-1px] top-[5px] bottom-[5px] w-[2px] rounded-full"
                  style={{ backgroundColor: `hsl(${s.sidebarIndicatorColor})` }}
                />
              )}
              <span dangerouslySetInnerHTML={{ __html: section.title }} />
            </a>
          );
        })}
      </nav>
    </aside>
  );
};

export default TableOfContents;
