import { useState } from "react";
import { Trash2, Plus, GripVertical } from "lucide-react";
import type { Section, Block } from "@/pages/Builder";
import BlockEditor from "./BlockEditor";
import AddBlockMenu from "./AddBlockMenu";

interface SectionEditorProps {
  section: Section;
  blocks: Block[];
  onUpdateSection: (id: string, updates: Partial<Section>) => void;
  onDeleteSection: (id: string) => void;
  onAddBlock: (sectionId: string, type: string) => void;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onDeleteBlock: (id: string) => void;
}

const SectionEditor = ({
  section,
  blocks,
  onUpdateSection,
  onDeleteSection,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
}: SectionEditorProps) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <section className="mb-10 group/section" id={`section-${section.id}`}>
      {/* Section title — editable, styled like doc-heading */}
      <div className="flex items-center gap-3 mb-4">
        <input
          className="text-lg font-semibold text-foreground bg-transparent border-none outline-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1 min-w-0"
          value={section.title}
          onChange={(e) => onUpdateSection(section.id, { title: e.target.value })}
        />
        <div className="flex-1 h-px bg-[hsl(var(--doc-section-line))] opacity-50" />
        <button
          onClick={() => onDeleteSection(section.id)}
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover/section:opacity-100 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Blocks */}
      <div className="doc-prose space-y-2">
        {blocks
          .sort((a, b) => a.order_index - b.order_index)
          .map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
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
