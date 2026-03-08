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
}

const SearchDialog = ({
  open,
  onOpenChange,
  pages,
  sections,
  blocks,
  onSelectPage,
  onSelectSection,
}: SearchDialogProps) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Build searchable index
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { pages: pages.slice(0, 5), sections: [], blocks: [] };

    const matchedPages = pages.filter((p) => p.title.toLowerCase().includes(q));

    const matchedSections = sections.filter((s) => s.title.toLowerCase().includes(q));

    const matchedBlocks = blocks.filter((b) => {
      const c = b.content;
      if (!c) return false;
      const text = c.text || c.code || c.title || c.description || "";
      if (typeof text === "string" && text.toLowerCase().includes(q)) return true;
      if (Array.isArray(c.items)) {
        return c.items.some((item: any) => {
          const str = typeof item === "string" ? item : item?.title || item?.description || "";
          return str.toLowerCase().includes(q);
        });
      }
      if (Array.isArray(c.tabs)) {
        return c.tabs.some((t: any) => (t.label || t.code || t.content || "").toLowerCase().includes(q));
      }
      return false;
    }).slice(0, 10);

    return { pages: matchedPages, sections: matchedSections, blocks: matchedBlocks };
  }, [query, pages, sections, blocks]);

  const getPageForSection = (sectionPageId: string) => pages.find((p) => p.id === sectionPageId);
  const getSectionForBlock = (blockSectionId: string) => sections.find((s) => s.id === blockSectionId);

  const handleSelect = (page: SearchPage, sectionId?: string) => {
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
    const c = block.content;
    const text = c?.text || c?.code || c?.title || c?.description || "";
    if (typeof text === "string") return text.slice(0, 80);
    return "";
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
                <span>{page.title}</span>
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
                    <span>{section.title}</span>
                    <span className="text-xs text-muted-foreground">{page.title}</span>
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
                      {page.title} → {section.title}
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
