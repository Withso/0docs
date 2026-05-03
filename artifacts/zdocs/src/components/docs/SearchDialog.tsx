import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Fragment,
} from "react";
import { createPortal } from "react-dom";
import { smoothBehavior } from "@/lib/motion";
import {
  Search,
  FileText,
  Hash,
  Type,
  X,
  Clock,
  Sparkles,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface SearchPage {
  id: string;
  title: string;
  slug: string;
}

interface SearchSection {
  id: string;
  page_id: string;
  title: string;
}

interface SearchBlock {
  id: string;
  section_id: string;
  type: string;
  content: any;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: SearchPage[];
  sections: SearchSection[];
  blocks: SearchBlock[];
  onSelectPage: (page: SearchPage) => void;
  onSelectSection?: (sectionId: string, page: SearchPage) => void;
  onSearch?: (query: string, resultsCount: number) => void;
  /** Optional storage key suffix so multiple docs sites don't share recents. */
  storageKey?: string;
}

type ResultType = "page" | "section" | "content";

interface MatchRange {
  start: number;
  end: number;
}

interface SearchResult {
  key: string;
  type: ResultType;
  title: string; // raw title (HTML stripped)
  parent: string | null; // breadcrumb (for sections/blocks)
  snippet: string | null;
  snippetMatches: MatchRange[];
  titleMatches: MatchRange[];
  score: number;
  page: SearchPage;
  sectionId?: string;
}

const RECENTS_MAX = 5;
const POPULAR_MAX = 4;
const DEBOUNCE_MS = 130;

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function extractBlockText(block: SearchBlock): string {
  const c = block.content;
  if (!c) return "";
  const parts: string[] = [];

  if (c.text) parts.push(c.text);
  if (c.code) parts.push(c.code);
  if (c.title) parts.push(c.title);
  if (c.description) parts.push(c.description);
  if (c.html) parts.push(stripHtml(c.html));

  if (Array.isArray(c.items)) {
    for (const item of c.items) {
      if (typeof item === "string") parts.push(item);
      else if (item?.title) parts.push(item.title);
      if (item?.description) parts.push(item.description);
    }
  }
  if (Array.isArray(c.tabs)) {
    for (const t of c.tabs) {
      if (t.label) parts.push(t.label);
      if (t.content) parts.push(t.content);
      if (t.code) parts.push(t.code);
    }
  }
  if (Array.isArray(c.headers)) parts.push(...c.headers);
  if (Array.isArray(c.rows)) {
    for (const row of c.rows) {
      if (Array.isArray(row)) parts.push(...row);
    }
  }
  if (c.method) parts.push(c.method);
  if (c.path) parts.push(c.path);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Find all non-overlapping matches of `q` (case-insensitive) in `text`. */
function findMatches(text: string, q: string): MatchRange[] {
  if (!q) return [];
  const ranges: MatchRange[] = [];
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let i = 0;
  while (i <= lower.length - ql.length) {
    const idx = lower.indexOf(ql, i);
    if (idx < 0) break;
    ranges.push({ start: idx, end: idx + ql.length });
    i = idx + ql.length;
  }
  return ranges;
}

/** Score a title against query. Higher = better. */
function scoreTitle(title: string, q: string): number {
  if (!q) return 0;
  const t = title.toLowerCase();
  const ql = q.toLowerCase();
  if (t === ql) return 1000;
  if (t.startsWith(ql)) return 500;
  if (t.includes(` ${ql}`)) return 300;
  if (t.includes(ql)) return 200;
  // Word-start partial
  const words = t.split(/\s+/);
  const qWords = ql.split(/\s+/);
  let starts = 0;
  for (const qw of qWords) {
    if (words.some((w) => w.startsWith(qw))) starts++;
  }
  if (starts === qWords.length) return 120;
  if (starts > 0) return 60 + starts * 10;
  // Subsequence fallback
  let qi = 0;
  for (let i = 0; i < t.length && qi < ql.length; i++) {
    if (t[i] === ql[qi]) qi++;
  }
  if (qi === ql.length) return 30;
  return 0;
}

function buildSnippet(
  text: string,
  q: string,
  context = 50,
  maxLen = 140,
): { snippet: string; matches: MatchRange[] } | null {
  if (!q) return null;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return null;

  const start = Math.max(0, idx - context);
  const end = Math.min(text.length, idx + q.length + context);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  if (snippet.length > maxLen + 2) {
    snippet = snippet.slice(0, maxLen) + "…";
  }

  const matches = findMatches(snippet, q);
  return { snippet, matches };
}

function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges: MatchRange[];
}) {
  if (!ranges || ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(text.slice(cursor, r.start));
    parts.push(
      <mark
        key={i}
        className="bg-[hsl(var(--docs-primary)/0.18)] text-[hsl(var(--docs-foreground))] rounded-[3px] px-0.5"
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

const TYPE_ICONS: Record<ResultType, React.ComponentType<any>> = {
  page: FileText,
  section: Hash,
  content: Type,
};

const TYPE_LABELS: Record<ResultType, string> = {
  page: "Pages",
  section: "Sections",
  content: "Content",
};

const SearchDialog = ({
  open,
  onOpenChange,
  pages,
  sections,
  blocks,
  onSelectPage,
  onSelectSection,
  onSearch,
  storageKey = "default",
}: SearchDialogProps) => {
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const recentsStorageKey = `0docs:search:recents:${storageKey}`;

  // Load recents on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(recentsStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecents(parsed.filter((s) => typeof s === "string").slice(0, RECENTS_MAX));
        }
      }
    } catch {
      // ignore
    }
  }, [recentsStorageKey]);

  // Reset query / focus when opening.
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current =
        (document.activeElement as HTMLElement) || null;
      setRawQuery("");
      setDebouncedQuery("");
      setActiveIndex(0);
      // Focus input on next frame.
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = prevOverflow;
        previouslyFocusedRef.current?.focus?.();
      };
    }
    return undefined;
  }, [open]);

  // Debounce typing.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [rawQuery]);

  const persistRecent = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setRecents((prev) => {
        const next = [trimmed, ...prev.filter((p) => p.toLowerCase() !== trimmed.toLowerCase())].slice(
          0,
          RECENTS_MAX,
        );
        try {
          localStorage.setItem(recentsStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [recentsStorageKey],
  );

  const clearRecents = useCallback(() => {
    setRecents([]);
    try {
      localStorage.removeItem(recentsStorageKey);
    } catch {
      // ignore
    }
  }, [recentsStorageKey]);

  const pageById = useMemo(() => {
    const map = new Map<string, SearchPage>();
    for (const p of pages) map.set(p.id, p);
    return map;
  }, [pages]);

  const sectionById = useMemo(() => {
    const map = new Map<string, SearchSection>();
    for (const s of sections) map.set(s.id, s);
    return map;
  }, [sections]);

  const popularPages = useMemo(() => pages.slice(0, POPULAR_MAX), [pages]);

  // Build the ranked, grouped result list.
  const grouped = useMemo<{
    groups: { type: ResultType; results: SearchResult[] }[];
    flat: SearchResult[];
  }>(() => {
    const q = debouncedQuery;
    if (!q) return { groups: [], flat: [] };

    const pageResults: SearchResult[] = [];
    for (const p of pages) {
      const title = stripHtml(p.title);
      const score = scoreTitle(title, q);
      if (score > 0) {
        pageResults.push({
          key: `page:${p.id}`,
          type: "page",
          title,
          parent: null,
          snippet: null,
          snippetMatches: [],
          titleMatches: findMatches(title, q),
          score,
          page: p,
        });
      }
    }
    pageResults.sort((a, b) => b.score - a.score);

    const sectionResults: SearchResult[] = [];
    for (const s of sections) {
      const page = pageById.get(s.page_id);
      if (!page) continue;
      const title = stripHtml(s.title);
      const score = scoreTitle(title, q);
      if (score > 0) {
        sectionResults.push({
          key: `section:${s.id}`,
          type: "section",
          title,
          parent: stripHtml(page.title),
          snippet: null,
          snippetMatches: [],
          titleMatches: findMatches(title, q),
          score,
          page,
          sectionId: s.id,
        });
      }
    }
    sectionResults.sort((a, b) => b.score - a.score);
    sectionResults.splice(20);

    const contentResults: SearchResult[] = [];
    for (const b of blocks) {
      const text = extractBlockText(b);
      if (!text) continue;
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      if (idx < 0) continue;
      const section = sectionById.get(b.section_id);
      const page = section ? pageById.get(section.page_id) : null;
      if (!page || !section) continue;
      const sn = buildSnippet(text, q);
      if (!sn) continue;
      // Score: closer match position = higher; exact short text match boosted
      const positional = Math.max(0, 200 - idx);
      const score = positional + (text.length < 200 ? 30 : 0);
      contentResults.push({
        key: `content:${b.id}`,
        type: "content",
        title: stripHtml(section.title),
        parent: stripHtml(page.title),
        snippet: sn.snippet,
        snippetMatches: sn.matches,
        titleMatches: [],
        score,
        page,
        sectionId: section.id,
      });
    }
    contentResults.sort((a, b) => b.score - a.score);
    contentResults.splice(15);

    const groups = [
      { type: "page" as ResultType, results: pageResults },
      { type: "section" as ResultType, results: sectionResults },
      { type: "content" as ResultType, results: contentResults },
    ].filter((g) => g.results.length > 0);

    const flat: SearchResult[] = [];
    for (const g of groups) flat.push(...g.results);

    return { groups, flat };
  }, [debouncedQuery, pages, sections, blocks, pageById, sectionById]);

  // Reset selection when results change.
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  // Keep itemRefs sized.
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, grouped.flat.length);
  }, [grouped.flat.length]);

  // Scroll active row into view.
  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const navigateToResult = useCallback(
    (r: SearchResult, opts: { newTab?: boolean } = {}) => {
      if (debouncedQuery) {
        persistRecent(debouncedQuery);
        onSearch?.(debouncedQuery, grouped.flat.length);
      }
      if (opts.newTab) {
        // Open the target page in a new tab. The SPA routes (/docs and
        // /p/:slug) load a project, so we encode the target page slug as a
        // ?page=<slug> query that Index reads on mount, plus an optional
        // section anchor for deep-linking.
        const base = window.location.pathname;
        const params = new URLSearchParams();
        if (r.page.slug) params.set("page", r.page.slug);
        const qs = params.toString();
        const hash = r.sectionId ? `#section-${r.sectionId}` : "";
        const url = `${base}${qs ? `?${qs}` : ""}${hash}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      onSelectPage(r.page);
      if (r.sectionId && onSelectSection) {
        onSelectSection(r.sectionId, r.page);
        setTimeout(() => {
          document
            .getElementById(`section-${r.sectionId}`)
            ?.scrollIntoView({ behavior: smoothBehavior(), block: "start" });
        }, 200);
      }
      onOpenChange(false);
    },
    [
      debouncedQuery,
      grouped.flat.length,
      onOpenChange,
      onSearch,
      onSelectPage,
      onSelectSection,
      persistRecent,
    ],
  );

  const dialogContentRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      // Focus trap: keep Tab/Shift+Tab inside the dialog content.
      if (e.key === "Tab") {
        const root = dialogContentRef.current;
        if (root) {
          const FOCUSABLE = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
          ].join(",");
          const focusables = Array.from(
            root.querySelectorAll<HTMLElement>(FOCUSABLE),
          ).filter((el) => el.offsetParent !== null || el === document.activeElement);
          if (focusables.length > 0) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey && (active === first || !root.contains(active))) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && active === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
        return;
      }
      const total = grouped.flat.length;
      if (total === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % total);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + total) % total);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(total - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = grouped.flat[activeIndex];
        if (r) navigateToResult(r, { newTab: e.metaKey || e.ctrlKey });
      }
    },
    [grouped.flat, activeIndex, navigateToResult, onOpenChange],
  );

  if (!open) return null;

  const isEmptyQuery = debouncedQuery.length === 0;
  const noResults = !isEmptyQuery && grouped.flat.length === 0;

  // Compute the global flat index per result to wire selection state.
  let runningIdx = -1;

  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex sm:items-start sm:justify-center sm:pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      <div
        ref={dialogContentRef}
        className="relative w-full sm:max-w-2xl sm:w-[640px] mx-0 sm:mx-4 bg-[hsl(var(--docs-background))] text-[hsl(var(--docs-foreground))] sm:rounded-2xl shadow-2xl border border-[hsl(var(--docs-border))] flex flex-col max-h-screen sm:max-h-[70vh] animate-in fade-in-0 zoom-in-95"
        style={{
          fontFamily: "var(--docs-body-font, inherit)",
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-2 px-4 sm:px-5 h-14 border-b border-[hsl(var(--docs-border))] shrink-0">
          <Search className="h-4 w-4 text-[hsl(var(--docs-muted-foreground))] shrink-0" />
          <input
            ref={inputRef}
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search documentation…"
            aria-label="Search documentation"
            aria-autocomplete="list"
            aria-controls="docs-search-results"
            aria-activedescendant={
              grouped.flat[activeIndex]
                ? `docs-search-result-${activeIndex}`
                : undefined
            }
            className="flex-1 bg-transparent border-0 outline-none text-[15px] placeholder:text-[hsl(var(--docs-muted-foreground))]"
            autoComplete="off"
            spellCheck={false}
          />
          {rawQuery && (
            <button
              type="button"
              onClick={() => {
                setRawQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[hsl(var(--docs-muted-foreground))] hover:bg-[hsl(var(--docs-muted)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            className="hidden sm:inline-flex h-7 px-2 items-center justify-center rounded-md text-[11px] font-medium text-[hsl(var(--docs-muted-foreground))] border border-[hsl(var(--docs-border))] hover:bg-[hsl(var(--docs-muted)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
          >
            Esc
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            className="sm:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-[hsl(var(--docs-muted-foreground))] hover:bg-[hsl(var(--docs-muted)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          id="docs-search-results"
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="flex-1 overflow-y-auto py-2"
        >
          {isEmptyQuery ? (
            <div className="px-2">
              {recents.length > 0 && (
                <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--docs-muted-foreground))] flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Recent
                  </div>
                  <button
                    type="button"
                    onClick={clearRecents}
                    className="text-[11px] text-[hsl(var(--docs-muted-foreground))] hover:text-[hsl(var(--docs-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))] rounded px-1"
                  >
                    Clear
                  </button>
                </div>
              )}
              {recents.map((r) => (
                <button
                  key={`recent-${r}`}
                  type="button"
                  onClick={() => {
                    setRawQuery(r);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-[hsl(var(--docs-muted)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))] text-[13px]"
                >
                  <Clock className="h-3.5 w-3.5 text-[hsl(var(--docs-muted-foreground))] shrink-0" />
                  <span className="truncate">{r}</span>
                </button>
              ))}

              {popularPages.length > 0 && (
                <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--docs-muted-foreground))] flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Popular
                </div>
              )}
              {popularPages.map((p) => (
                <button
                  key={`popular-${p.id}`}
                  type="button"
                  onClick={() => {
                    onSelectPage(p);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-[hsl(var(--docs-muted)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--docs-ring))] text-[13px]"
                >
                  <FileText className="h-3.5 w-3.5 text-[hsl(var(--docs-muted-foreground))] shrink-0" />
                  <span
                    className="truncate"
                    dangerouslySetInnerHTML={{ __html: p.title }}
                  />
                </button>
              ))}

              {recents.length === 0 && popularPages.length === 0 && (
                <div className="px-4 py-12 text-center text-[13px] text-[hsl(var(--docs-muted-foreground))]">
                  Start typing to search the docs.
                </div>
              )}
            </div>
          ) : noResults ? (
            <div className="px-6 py-12 text-center">
              <div className="text-[14px] mb-1">
                No results for{" "}
                <span className="font-medium text-[hsl(var(--docs-foreground))]">
                  &ldquo;{debouncedQuery}&rdquo;
                </span>
              </div>
              <div className="text-[12px] text-[hsl(var(--docs-muted-foreground))]">
                Try a different word, check spelling, or browse the sidebar.
              </div>
            </div>
          ) : (
            <div className="px-2">
              {grouped.groups.map((group) => {
                const Icon = TYPE_ICONS[group.type];
                return (
                  <Fragment key={group.type}>
                    <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--docs-muted-foreground))]">
                        {TYPE_LABELS[group.type]}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--docs-muted-foreground))]">
                        {group.results.length}
                      </div>
                    </div>
                    {group.results.map((r) => {
                      runningIdx += 1;
                      const idx = runningIdx;
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={r.key}
                          ref={(el) => {
                            itemRefs.current[idx] = el;
                          }}
                          type="button"
                          id={`docs-search-result-${idx}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={(e) =>
                            navigateToResult(r, {
                              newTab: e.metaKey || e.ctrlKey,
                            })
                          }
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left focus-visible:outline-none transition-colors"
                          style={{
                            backgroundColor: isActive
                              ? "hsl(var(--docs-muted) / 0.7)"
                              : "transparent",
                          }}
                        >
                          <Icon
                            className="h-4 w-4 mt-0.5 shrink-0"
                            style={{
                              color: isActive
                                ? "hsl(var(--docs-primary))"
                                : "hsl(var(--docs-muted-foreground))",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium truncate">
                              <HighlightedText
                                text={r.title}
                                ranges={r.titleMatches}
                              />
                            </div>
                            {r.snippet && (
                              <div className="text-[12px] text-[hsl(var(--docs-muted-foreground))] mt-0.5 line-clamp-2">
                                <HighlightedText
                                  text={r.snippet}
                                  ranges={r.snippetMatches}
                                />
                              </div>
                            )}
                            {r.parent && !r.snippet && (
                              <div className="text-[11px] text-[hsl(var(--docs-muted-foreground))] mt-0.5 truncate">
                                in {r.parent}
                              </div>
                            )}
                            {r.parent && r.snippet && (
                              <div className="text-[11px] text-[hsl(var(--docs-muted-foreground))] mt-1 truncate">
                                {r.parent}
                              </div>
                            )}
                          </div>
                          {isActive && (
                            <CornerDownLeft
                              className="h-3.5 w-3.5 mt-1 shrink-0"
                              style={{ color: "hsl(var(--docs-muted-foreground))" }}
                              aria-hidden
                            />
                          )}
                        </button>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hints (desktop only) */}
        <div className="hidden sm:flex items-center justify-between px-5 h-10 border-t border-[hsl(var(--docs-border))] text-[11px] text-[hsl(var(--docs-muted-foreground))] shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded border border-[hsl(var(--docs-border))] bg-[hsl(var(--docs-muted)/0.5)]">
                <ArrowUp className="h-3 w-3" />
              </kbd>
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded border border-[hsl(var(--docs-border))] bg-[hsl(var(--docs-muted)/0.5)]">
                <ArrowDown className="h-3 w-3" />
              </kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded border border-[hsl(var(--docs-border))] bg-[hsl(var(--docs-muted)/0.5)]">
                <CornerDownLeft className="h-3 w-3" />
              </kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center h-5 px-1 rounded border border-[hsl(var(--docs-border))] bg-[hsl(var(--docs-muted)/0.5)] font-mono text-[10px]">
                ⌘
              </kbd>
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded border border-[hsl(var(--docs-border))] bg-[hsl(var(--docs-muted)/0.5)]">
                <CornerDownLeft className="h-3 w-3" />
              </kbd>
              new tab
            </span>
          </div>
          <span>
            {grouped.flat.length > 0
              ? `${grouped.flat.length} result${grouped.flat.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default SearchDialog;
