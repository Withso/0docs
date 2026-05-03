import { useState, useMemo, useCallback, useRef } from "react";
import { Trash2, Plus, Pencil, GripVertical } from "lucide-react";
import type { Section, Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import BlockEditor from "./BlockEditor";
import AddBlockMenu from "./AddBlockMenu";
import InlineRichText from "./InlineRichText";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

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
  sectionDragHandleProps?: Record<string, any>;
  // For cross-section block DnD
  allBlocks?: Block[];
  allSections?: Section[];
  onReorderBlocks?: (blocks: Block[]) => void;
}

/* ─── Sortable block wrapper with drag handle ─── */
const SortableBlock = ({
  id,
  children,
}: {
  id: string;
  children: (props: { handleProps: Record<string, any>; isDragging: boolean }) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.25 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ handleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  );
};

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
  sectionDragHandleProps,
  allBlocks,
  allSections,
  onReorderBlocks,
}: SectionEditorProps) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [dragActiveBlockId, setDragActiveBlockId] = useState<string | null>(null);
  const [isSectionFocused, setIsSectionFocused] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks]
  );

  const blockIds = useMemo(() => sortedBlocks.map((b) => b.id), [sortedBlocks]);

  const handleBlockDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveBlockId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id);
      const newIndex = sortedBlocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sortedBlocks];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updated = reordered.map((b, i) => ({ ...b, order_index: i }));
      onReorderBlocks?.(updated);
    },
    [sortedBlocks, onReorderBlocks]
  );

  const dragOverlayBlock = useMemo(() => {
    if (!dragActiveBlockId) return null;
    const block = sortedBlocks.find((b) => b.id === dragActiveBlockId);
    if (!block) return null;
    return (
      <div
        className="rounded-xl px-3 py-2 shadow-xl text-xs"
        style={{
          backgroundColor: `hsl(${settings.backgroundColor})`,
          color: `hsl(${settings.mutedForegroundColor})`,
          maxWidth: "300px",
        }}
      >
        <span className="font-medium capitalize">{block.type.replace(/_/g, " ")}</span>
        {block.type === "heading" && (
          <span className="ml-2 opacity-60 truncate">{(block.content as any)?.text?.slice(0, 40)}</span>
        )}
        {block.type === "paragraph" && (
          <span className="ml-2 opacity-60 truncate">{(block.content as any)?.text?.slice(0, 40)}</span>
        )}
      </div>
    );
  }, [dragActiveBlockId, sortedBlocks, settings]);

  return (
    <section
      ref={sectionRef}
      className="group/section animate-fade-in relative transition-all duration-200"
      id={`section-${section.id}`}
      style={{
        marginBottom: `${settings.sectionSpacing}px`,
        // Subtle but actually visible focus tint that works in both themes
        backgroundColor: isSectionFocused ? `hsl(${settings.primaryColor} / 0.06)` : "transparent",
        borderRadius: "16px",
        padding: "20px 24px 16px",
        marginLeft: "-24px",
        marginRight: "-24px",
        borderLeft: isSectionFocused
          ? `2px solid hsl(${settings.primaryColor} / 0.6)`
          : "2px solid transparent",
        boxShadow: isSectionFocused
          ? `inset 0 0 0 1px hsl(${settings.primaryColor} / 0.12)`
          : undefined,
      }}
      onFocusCapture={() => setIsSectionFocused(true)}
      onBlurCapture={(e) => {
        // Only unfocus if the new focus target is outside this section
        if (!sectionRef.current?.contains(e.relatedTarget as Node)) {
          setIsSectionFocused(false);
          setFocusedBlockId(null);
        }
      }}
    >
      {/* Section title */}
      <div className="flex items-center gap-2 mb-4">
        {/* Section drag handle */}
        {sectionDragHandleProps && (
          <span
            className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/section:opacity-40 transition-opacity -ml-2"
            style={{ color: `hsl(${settings.mutedForegroundColor})` }}
            {...sectionDragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}
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
        {settings.sectionBorderVisible && (
          <div className="flex-1" style={{ height: `${settings.sectionBorderThickness}px`, backgroundColor: `hsl(${settings.sectionBorderColor})`, opacity: 0.5 }} />
        )}
        <button
          onClick={() => onDeleteSection(section.id)}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity"
          style={{ color: `hsl(${settings.mutedForegroundColor})` }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Blocks with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setDragActiveBlockId(e.active.id as string)}
        onDragEnd={handleBlockDragEnd}
      >
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sortedBlocks.map((block) => (
              <SortableBlock key={block.id} id={block.id}>
                {({ handleProps }) => (
                  <div
                    className="group/block relative flex transition-all duration-150"
                    style={{
                      backgroundColor:
                        focusedBlockId === block.id
                          ? `hsl(${settings.primaryColor} / 0.07)`
                          : "transparent",
                      borderRadius: "12px",
                      padding: "4px 8px",
                      marginLeft: "-8px",
                      marginRight: "-8px",
                      outline:
                        focusedBlockId === block.id
                          ? `1px solid hsl(${settings.primaryColor} / 0.35)`
                          : "1px solid transparent",
                    }}
                    onFocusCapture={() => setFocusedBlockId(block.id)}
                    onClickCapture={() => setFocusedBlockId(block.id)}
                  >
                    {/* Block drag handle: visible at 40% on hover, 80% when focused */}
                    <span
                      className={`shrink-0 cursor-grab active:cursor-grabbing transition-opacity pt-1 pr-1 ${
                        focusedBlockId === block.id
                          ? "opacity-80"
                          : "opacity-0 group-hover/block:opacity-50"
                      }`}
                      style={{ color: `hsl(${settings.mutedForegroundColor})` }}
                      title="Drag to reorder"
                      {...handleProps}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0 relative">
                      <div
                        className={`absolute right-0 top-1 transition-opacity z-10 ${
                          focusedBlockId === block.id
                            ? "opacity-100"
                            : "opacity-0 group-hover/block:opacity-100"
                        }`}
                      >
                        <button
                          onClick={() => onDeleteBlock(block.id)}
                          className="p-1 rounded-lg hover:bg-destructive/15 hover:text-destructive transition-colors"
                          style={{ color: `hsl(${settings.mutedForegroundColor})` }}
                          title="Delete block"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <BlockEditor
                        block={block}
                        settings={settings}
                        onUpdate={onUpdateBlock}
                        onDelete={onDeleteBlock}
                      />
                    </div>
                  </div>
                )}
              </SortableBlock>
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {dragOverlayBlock}
        </DragOverlay>
      </DndContext>

      {/* Empty state CTA when section has no blocks */}
      {sortedBlocks.length === 0 && !showAddMenu && (
        <button
          onClick={() => setShowAddMenu(true)}
          className="zdocs-editor-dashed w-full rounded-xl bg-muted/20 hover:bg-primary/[0.03] py-8 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </span>
          <span className="text-[12.5px] font-medium">Add your first block</span>
          <span className="text-[11px] text-muted-foreground/80">Heading, paragraph, code, image, and more</span>
        </button>
      )}

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
          sortedBlocks.length > 0 && (
            <button
              onClick={() => setShowAddMenu(true)}
              className="zdocs-editor-dashed w-full rounded-xl py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-primary/[0.03] flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-3.5 w-3.5" /> Add Block
            </button>
          )
        )}
      </div>
    </section>
  );
};

export default SectionEditor;