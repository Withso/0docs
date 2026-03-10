import { useState } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import type { Section, Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import BlockEditor from "./BlockEditor";
import AddBlockMenu from "./AddBlockMenu";
import InlineRichText from "./InlineRichText";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface SectionEditorProps {
  section: Section;
  blocks: Block[];
  settings: DesignSettings;
  onUpdateSection: (id: string, updates: Partial<Section>) => void;
  onDeleteSection: (id: string) => void;
  onAddBlock: (sectionId: string, type: string) => void;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onDeleteBlock: (id: string) => void;
  onImportOpenAPI?: () => void;
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
  onImportOpenAPI,
}: SectionEditorProps) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <section className="group/section animate-fade-in" id={`section-${section.id}`} style={{ marginBottom: `${settings.sectionSpacing}px` }}>
      {/* Section title */}
      <div className="flex items-center gap-3 mb-4">
        {isEditingTitle ? (
          <InlineRichText
            value={section.title}
            onChange={(html) => onUpdateSection(section.id, { title: html })}
            onDone={() => setIsEditingTitle(false)}
            settings={settings}
            singleLine
            placeholder="Section title..."
            className="min-w-0"
            style={{
              fontFamily: `'${settings.headingFont}', sans-serif`,
              fontWeight: settings.headingWeight,
              fontSize: `${settings.headingFontSize}px`,
            }}
          />
        ) : (
          <div
            className="group/title flex items-center gap-2 min-w-0 cursor-default select-none"
            onDoubleClick={() => setIsEditingTitle(true)}
          >
            <span
              style={{
                fontFamily: `'${settings.headingFont}', sans-serif`,
                fontWeight: settings.headingWeight,
                fontSize: `${settings.headingFontSize}px`,
              }}
              dangerouslySetInnerHTML={{ __html: section.title }}
            />
            <button
              onClick={() => setIsEditingTitle(true)}
              className="opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0"
              style={{ color: `hsl(${settings.mutedForegroundColor})` }}
              title="Edit title"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
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
              if (type === "import_openapi") {
                onImportOpenAPI?.();
                setShowAddMenu(false);
                return;
              }
              onAddBlock(section.id, type);
              setShowAddMenu(false);
            }}
            onClose={() => setShowAddMenu(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddMenu(true)}
            className="w-full border border-dashed rounded-xl py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all duration-150 flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Block
          </button>
        )}
      </div>
    </section>
  );
};

export default SectionEditor;