import { useState, useEffect, useRef } from "react";
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

/**
 * Mintlify-style table of contents.
 *
 * Visual: tiny "On this page" caps label, then a vertical guide rail with
 * each section as a row whose left indicator turns from neutral (border) to
 * primary as it scrolls into view. Inactive rows do not show a dot — only the
 * vertical rail. The active row gets a primary-colored 2px bar that overlays
 * the rail at the row position (this matches Mintlify's docs sidebar TOC).
 */
const TableOfContents = ({ sections, settings: s, stickyTop = 48 }: TableOfContentsProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;

    const visibilityMap = new Map<string, IntersectionObserverEntry>();

    const computeActive = () => {
      if (window.scrollY < 100) {
        setActiveId(sections[0].id);
        return;
      }

      const atBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50);
      if (atBottom) {
        setActiveId(sections[sections.length - 1].id);
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

      if (bestId) setActiveId(bestId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visibilityMap.set(entry.target.id, entry));
        computeActive();
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
    );

    const els = sections
      .map((sec) => document.getElementById(`section-${sec.id}`))
      .filter(Boolean) as HTMLElement[];

    els.forEach((el) => observer.observe(el));

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
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <aside
      className="shrink-0 sticky hidden xl:block py-12"
      style={{
        width: "200px",
        top: `${stickyTop}px`,
        height: `calc(100vh - ${stickyTop}px)`,
      }}
    >
      <div
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{
          color: `hsl(${s.mutedForegroundColor})`,
          fontFamily: `'${s.bodyFont}', sans-serif`,
        }}
      >
        On this page
      </div>

      {/* Vertical rail anchors all rows; active row's bar overlays it. */}
      <nav
        className="relative flex flex-col"
        style={{
          borderLeft: `1px solid hsl(${s.borderColor})`,
        }}
      >
        {sections.map((section) => {
          const isActive = activeId === section.id;
          const anchorId = `section-${section.id}`;
          return (
            <a
              key={section.id}
              href={`#${anchorId}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(anchorId);
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - (stickyTop + 24);
                  window.scrollTo({ top, behavior: "smooth" });
                }
                window.history.replaceState(null, "", `#${anchorId}`);
                setActiveId(section.id);
              }}
              aria-current={isActive ? "location" : undefined}
              className="group/toc relative flex items-center py-1.5 pl-4 pr-1 transition-colors focus:outline-none"
              style={{
                color: isActive
                  ? `hsl(${s.primaryColor})`
                  : `hsl(${s.mutedForegroundColor})`,
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                fontFamily: `'${s.bodyFont}', sans-serif`,
                lineHeight: 1.4,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = `hsl(${s.foregroundColor})`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = `hsl(${s.mutedForegroundColor})`;
              }}
            >
              <span
                aria-hidden
                className="absolute top-1.5 bottom-1.5 w-[2px] rounded-full transition-colors"
                style={{
                  left: "-1px",
                  backgroundColor: isActive
                    ? `hsl(${s.primaryColor})`
                    : "transparent",
                }}
              />
              <span className="truncate" dangerouslySetInnerHTML={{ __html: section.title }} />
            </a>
          );
        })}
      </nav>
    </aside>
  );
};

export default TableOfContents;
