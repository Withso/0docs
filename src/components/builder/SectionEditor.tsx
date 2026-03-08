import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import type { Section, Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import BlockEditor from "./BlockEditor";
import AddBlockMenu from "./AddBlockMenu";

interface SectionEditorProps {
  section: Section;
  blocks: Block[];
  settings: DesignSettings;
  onUpdateSection: (id: string, updates: Partial<Section>) => void;
  onDeleteSection: (id: string) => void;
  onAddBlock: (sectionId: string, type: string) => void;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onDeleteBlock: (id: string) => void;
}

const SectionEditor = ({
  section,
  blocks,
  settings,
  onUpdateSection,
  onDeleteSection,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
}: SectionEditorProps) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [title, setTitle] = useState(section.title);

  useEffect(() => {
    setTitle(section.title);
  }, [section.id, section.title]);

  const debouncedSave = useDebouncedCallback((value: string) => {
    onUpdateSection(section.id, { title: value });
  }, 600);

  return (
    <section className="group/section animate-fade-in" id={`section-${section.id}`} style={{ marginBottom: `${settings.sectionSpacing}px` }}>
      {/* Section title — editable with debounce */}
      <div className="flex items-center gap-3 mb-4">
        <input
          className="bg-transparent border-none outline-none focus:ring-2 focus:ring-ring/20 rounded-md px-1 -ml-1 min-w-0"
          style={{
            fontFamily: `'${settings.headingFont}', sans-serif`,
            fontWeight: settings.headingWeight,
            fontSize: `${settings.headingFontSize}px`,
          }}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            debouncedSave(e.target.value);
          }}
          placeholder="Section title..."
        />
        <div className="flex-1 h-px opacity-50" style={{ backgroundColor: `hsl(${settings.sectionLineColor})` }} />
        <button
          onClick={() => onDeleteSection(section.id)}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity"
          style={{ color: `hsl(${settings.mutedForegroundColor})` }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Blocks */}
      <div className="space-y-2">
        {blocks
          .sort((a, b) => a.order_index - b.order_index)
          .map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              settings={settings}
              onUpdate={onUpdateBlock}
              onDelete={onDeleteBlock}
            />
          ))}
      </div>

      {/* Add block */}
      <div className="relative mt-3">
        {showAddMenu ? (
          <AddBlockMenu
            onSelect={(type) => {
              onAddBlock(section.id, type);
              setShowAddMenu(false);
            }}
            onClose={() => setShowAddMenu(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddMenu(true)}
            className="w-full border border-dashed rounded-lg py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Block
          </button>
        )}
      </div>
    </section>
  );
};

export default SectionEditor;
