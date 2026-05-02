import { useState, useMemo, useRef, useEffect, useId } from "react";
import {
  Type, AlignLeft, Code, ImageIcon, Film, Youtube,
  ListOrdered, List, StickyNote, AlertCircle, X,
  Columns, ChevronDown, CreditCard, Footprints,
  Table2, Minus, Quote, Globe, CodeXml, FileJson,
  Frame as FrameIcon, Megaphone, ChevronsUpDown, Search,
  type LucideIcon,
} from "lucide-react";

type BlockGroup = "Basic" | "Media" | "Layout" | "Code & API" | "Advanced";

interface BlockEntry {
  type: string;
  label: string;
  icon: LucideIcon;
  group: BlockGroup;
  description: string;
  keywords?: string[];
}

const blockTypes: BlockEntry[] = [
  { type: "heading",       label: "Heading",        icon: Type,           group: "Basic",      description: "Section title", keywords: ["title", "h1", "h2"] },
  { type: "paragraph",     label: "Paragraph",      icon: AlignLeft,      group: "Basic",      description: "Plain body text", keywords: ["text", "body"] },
  { type: "quote",         label: "Quote",          icon: Quote,          group: "Basic",      description: "Blockquote with attribution" },
  { type: "divider",       label: "Divider",        icon: Minus,          group: "Basic",      description: "Horizontal rule", keywords: ["hr", "line"] },
  { type: "ordered_list",  label: "Numbered List",  icon: ListOrdered,    group: "Basic",      description: "1, 2, 3 list", keywords: ["ol"] },
  { type: "unordered_list",label: "Bullet List",    icon: List,           group: "Basic",      description: "Bulleted list", keywords: ["ul"] },

  { type: "image",         label: "Image",          icon: ImageIcon,      group: "Media",      description: "Embed an image" },
  { type: "frame",         label: "Frame",          icon: FrameIcon,      group: "Media",      description: "Bordered media frame" },
  { type: "video",         label: "Video",          icon: Film,           group: "Media",      description: "Self-hosted video" },
  { type: "youtube",       label: "YouTube",        icon: Youtube,        group: "Media",      description: "Embed a YouTube video" },

  { type: "note",          label: "Note",           icon: StickyNote,     group: "Layout",     description: "Highlighted info note", keywords: ["info", "warning"] },
  { type: "callout",       label: "Callout",        icon: AlertCircle,    group: "Layout",     description: "Bordered callout box" },
  { type: "card",          label: "Card",           icon: CreditCard,     group: "Layout",     description: "Linked card with title" },
  { type: "tabs",          label: "Tabs",           icon: Columns,        group: "Layout",     description: "Tabbed content" },
  { type: "accordion",     label: "Accordion",      icon: ChevronDown,    group: "Layout",     description: "Collapsible groups" },
  { type: "expandable",    label: "Expandable",     icon: ChevronsUpDown, group: "Layout",     description: "Single expandable details", keywords: ["details", "collapse"] },
  { type: "steps",         label: "Steps",          icon: Footprints,     group: "Layout",     description: "Numbered walkthrough" },
  { type: "table",         label: "Table",          icon: Table2,         group: "Layout",     description: "Rows and columns" },
  { type: "update",        label: "Update",         icon: Megaphone,      group: "Layout",     description: "Changelog entry" },

  { type: "code_block",    label: "Code Block",     icon: Code,           group: "Code & API", description: "Single-language snippet" },
  { type: "code_tabs",     label: "Code Tabs",      icon: CodeXml,        group: "Code & API", description: "Multi-language tabs" },
  { type: "api_endpoint",  label: "API Endpoint",   icon: Globe,          group: "Code & API", description: "Documented HTTP route" },
  { type: "import_openapi",label: "Import OpenAPI", icon: FileJson,       group: "Code & API", description: "Generate from a spec" },

  { type: "inline_editor", label: "Inline Editor",  icon: AlignLeft,      group: "Advanced",   description: "Rich-text inline editor" },
];

const GROUP_ORDER: BlockGroup[] = ["Basic", "Media", "Layout", "Code & API", "Advanced"];

interface AddBlockMenuProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const AddBlockMenu = ({ onSelect, onClose }: AddBlockMenuProps) => {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionId = (idx: number) => `${listboxId}-opt-${idx}`;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the active option scrolled into view as user navigates
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-option-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blockTypes;
    return blockTypes.filter((b) => {
      const haystack = `${b.label} ${b.description} ${b.group} ${(b.keywords ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  // Reset index whenever filtered list changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<BlockGroup, BlockEntry[]>();
    for (const b of filtered) {
      const list = map.get(b.group) ?? [];
      list.push(b);
      map.set(b.group, list);
    }
    return GROUP_ORDER
      .map((g) => [g, map.get(g) ?? []] as const)
      .filter(([, list]) => list.length > 0);
  }, [filtered]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item) onSelect(item.type);
    }
  };

  // Build a flat index map so we can highlight the right entry across groups
  const flatIndex = useMemo(() => {
    const arr: { type: string; idx: number }[] = [];
    let i = 0;
    for (const [, list] of grouped) {
      for (const b of list) {
        arr.push({ type: b.type, idx: i });
        i++;
      }
    }
    return arr;
  }, [grouped]);

  const indexFor = (type: string) =>
    flatIndex.find((f) => f.type === type)?.idx ?? -1;

  return (
    <div
      className="border rounded-xl bg-card text-card-foreground shadow-platform-lg overflow-hidden animate-fade-in"
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded="true"
      aria-owns={listboxId}
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={filtered[activeIdx] ? optionId(activeIdx) : undefined}
          aria-label="Search blocks"
        />
        <span className="hidden md:inline text-[10px] uppercase tracking-wider text-muted-foreground/70 px-1.5 py-0.5 rounded border border-border">
          Esc
        </span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Grouped results */}
      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label="Block types"
        className="max-h-[360px] overflow-y-auto p-1.5"
      >
        {grouped.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground" role="status">
            No blocks match <span className="text-foreground font-medium">&quot;{query}&quot;</span>
          </div>
        )}
        {grouped.map(([group, list]) => (
          <div key={group} className="mb-1.5 last:mb-0" role="group" aria-label={group}>
            <div className="px-2.5 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
              {group}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
              {list.map(({ type, label, icon: Icon, description }) => {
                const i = indexFor(type);
                const isActive = i === activeIdx;
                return (
                  <button
                    key={type}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isActive}
                    data-option-idx={i}
                    onClick={() => onSelect(type)}
                    onMouseEnter={() => {
                      if (i >= 0) setActiveIdx(i);
                    }}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                        isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-medium leading-tight truncate">{label}</span>
                      <span className="block text-[11px] text-muted-foreground leading-tight truncate mt-0.5">{description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer keyboard hint */}
      <div className="border-t px-3 py-1.5 flex items-center justify-between text-[10.5px] text-muted-foreground bg-muted/30">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">↑</kbd>
          <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">↓</kbd>
          <span>navigate</span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">↵</kbd>
          <span>insert</span>
        </span>
      </div>
    </div>
  );
};

export default AddBlockMenu;
