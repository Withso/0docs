import { useState, useEffect, useMemo } from "react";
import { Search, FileText, Hash, Type } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

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
}

/** Simple fuzzy match: checks if all chars of query appear in order in target */
function fuzzyMatch(target: string, query: string): { match: boolean; score: number } {
  const t = target.toLowerCase();
  const q = query.toLowerCase();

  // Exact substring match gets highest score
  if (t.includes(q)) return { match: true, score: 100 };

  // Word-start matching
  const words = t.split(/\s+/);
  const queryWords = q.split(/\s+/);
  let wordMatches = 0;
  for (const qw of queryWords) {
    if (words.some((w) => w.startsWith(qw))) wordMatches++;
  }
  if (wordMatches === queryWords.length) return { match: true, score: 80 };
  if (wordMatches > 0) return { match: true, score: 40 + wordMatches * 10 };

  // Character-sequence fuzzy match
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi === q.length) return { match: true, score: 20 };

  return { match: false, score: 0 };
}

function extractBlockText(block: SearchBlock): string {
  const c = block.content;
  if (!c) return "";
  const parts: string[] = [];

  if (c.text) parts.push(c.text);
  if (c.code) parts.push(c.code);
  if (c.title) parts.push(c.title);
  if (c.description) parts.push(c.description);
  if (c.html) {
    // Strip HTML tags for search
    parts.push(c.html.replace(/<[^>]*>/g, " "));
  }

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

  return parts.join(" ");
}

const SearchDialog = ({
  open,
  onOpenChange,
  pages,
  sections,
  blocks,
  onSelectPage,
  onSelectSection,
  onSearch,
}: SearchDialogProps) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return { pages: pages.slice(0, 8), sections: [], blocks: [] };

    const matchedPages = pages
      .map((p) => {
        const titleText = p.title.replace(/<[^>]*>/g, "");
        const { match, score } = fuzzyMatch(titleText, q);
        return { page: p, match, score };
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.page);

    const matchedSections = sections
      .map((s) => {
        const titleText = s.title.replace(/<[^>]*>/g, "");
        const { match, score } = fuzzyMatch(titleText, q);
        return { section: s, match, score };
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.section)
      .slice(0, 10);

    const matchedBlocks = blocks
      .map((b) => {
        const text = extractBlockText(b);
        const { match, score } = fuzzyMatch(text, q);
        return { block: b, match, score, text };
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => r.block);

    return { pages: matchedPages, sections: matchedSections, blocks: matchedBlocks };
  }, [query, pages, sections, blocks]);

  const getPageForSection = (sectionPageId: string) => pages.find((p) => p.id === sectionPageId);
  const getSectionForBlock = (blockSectionId: string) => sections.find((s) => s.id === blockSectionId);

  const handleSelect = (page: SearchPage, sectionId?: string) => {
    if (query.trim() && onSearch) {
      const total = results.pages.length + results.sections.length + results.blocks.length;
      onSearch(query, total);
    }
    onSelectPage(page);
    if (sectionId && onSelectSection) {
      onSelectSection(sectionId, page);
      setTimeout(() => {
        document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
    onOpenChange(false);
  };

  const getBlockPreview = (block: SearchBlock): string => {
    const text = extractBlockText(block);
    if (!query.trim()) return text.slice(0, 80);

    // Find the matching region and show context around it
    const lower = text.toLowerCase();
    const qLower = query.toLowerCase().trim();
    const idx = lower.indexOf(qLower);
    if (idx >= 0) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + qLower.length + 60);
      return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    }
    return text.slice(0, 80);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search documentation..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {results.pages.length > 0 && (
          <CommandGroup heading="Pages">
            {results.pages.map((page) => (
              <CommandItem
                key={page.id}
                onSelect={() => handleSelect(page)}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span dangerouslySetInnerHTML={{ __html: page.title }} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.sections.length > 0 && (
          <CommandGroup heading="Sections">
            {results.sections.map((section) => {
              const page = getPageForSection(section.page_id);
              if (!page) return null;
              return (
                <CommandItem
                  key={section.id}
                  onSelect={() => handleSelect(page, section.id)}
                  className="cursor-pointer"
                >
                  <Hash className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span dangerouslySetInnerHTML={{ __html: section.title }} />
                    <span className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: page.title }} />
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {results.blocks.length > 0 && (
          <CommandGroup heading="Content">
            {results.blocks.map((block) => {
              const section = getSectionForBlock(block.section_id);
              const page = section ? getPageForSection(section.page_id) : null;
              if (!page || !section) return null;
              return (
                <CommandItem
                  key={block.id}
                  onSelect={() => handleSelect(page, section.id)}
                  className="cursor-pointer"
                >
                  <Type className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{getBlockPreview(block)}</span>
                    <span className="text-xs text-muted-foreground">
                      <span dangerouslySetInnerHTML={{ __html: page.title }} /> → <span dangerouslySetInnerHTML={{ __html: section.title }} />
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default SearchDialog;
