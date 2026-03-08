import { useState, useRef, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import type { Block } from "@/hooks/use-builder";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface BlockEditorProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
}

const BlockEditor = ({ block, onUpdate, onDelete }: BlockEditorProps) => {
  // Local content state for immediate UI updates
  const [localContent, setLocalContent] = useState(block.content);

  useEffect(() => {
    setLocalContent(block.content);
  }, [block.id]);

  const debouncedSave = useDebouncedCallback((content: any) => {
    onUpdate(block.id, { content });
  }, 500);

  const updateContent = useCallback((updates: any) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    debouncedSave(newContent);
  }, [localContent, debouncedSave]);

  const renderBlock = () => {
    switch (block.type) {
      case "heading":
        return (
          <input
            className="text-xl font-semibold text-foreground bg-transparent w-full outline-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
            value={localContent.text || ""}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Heading..."
          />
        );

      case "paragraph":
        return (
          <AutoTextarea
            value={localContent.text || ""}
            onChange={(val) => updateContent({ text: val })}
            className="w-full bg-transparent outline-none text-foreground leading-relaxed resize-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
            placeholder="Start typing..."
            style={{ fontSize: "15px" }}
          />
        );

      case "code_block":
        return (
          <div className="doc-code-block">
            <div className="flex items-center justify-between mb-2">
              <input
                className="text-xs text-muted-foreground bg-transparent outline-none"
                value={localContent.language || ""}
                onChange={(e) => updateContent({ language: e.target.value })}
                placeholder="language"
              />
            </div>
            <textarea
              className="w-full bg-transparent outline-none text-sm font-mono resize-none text-foreground min-h-[60px]"
              value={localContent.code || ""}
              onChange={(e) => updateContent({ code: e.target.value })}
              placeholder="// Code here..."
              rows={Math.max(3, (localContent.code || "").split("\n").length)}
            />
          </div>
        );

      case "image":
        return (
          <div>
            <input
              className="w-full text-sm bg-transparent outline-none border rounded-lg px-3 py-2 mb-2 text-muted-foreground focus:ring-2 focus:ring-ring/20"
              value={localContent.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Image URL..."
            />
            {localContent.url && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={localContent.url}
                  alt={localContent.alt || ""}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            )}
            <input
              className="w-full text-xs text-muted-foreground bg-transparent outline-none mt-1 px-1"
              value={localContent.alt || ""}
              onChange={(e) => updateContent({ alt: e.target.value })}
              placeholder="Alt text / caption"
            />
          </div>
        );

      case "youtube":
        return (
          <div>
            <input
              className="w-full text-sm bg-transparent outline-none border rounded-lg px-3 py-2 mb-2 text-muted-foreground focus:ring-2 focus:ring-ring/20"
              value={localContent.videoId || ""}
              onChange={(e) => updateContent({ videoId: e.target.value })}
              placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)"
            />
            {localContent.videoId && (
              <div className="rounded-lg overflow-hidden border aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${localContent.videoId}`}
                  className="w-full h-full"
                  allowFullScreen
                  title={localContent.title || "Video"}
                />
              </div>
            )}
          </div>
        );

      case "video":
        return (
          <div>
            <input
              className="w-full text-sm bg-transparent outline-none border rounded-lg px-3 py-2 mb-2 text-muted-foreground focus:ring-2 focus:ring-ring/20"
              value={localContent.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Video URL..."
            />
            {localContent.url && (
              <video controls className="w-full rounded-lg border">
                <source src={localContent.url} />
              </video>
            )}
          </div>
        );

      case "ordered_list":
      case "unordered_list":
        return (
          <ListEditor
            items={localContent.items || []}
            ordered={block.type === "ordered_list"}
            onChange={(items) => updateContent({ items })}
          />
        );

      case "note":
        return (
          <div className="doc-note">
            <AutoTextarea
              value={localContent.text || ""}
              onChange={(val) => updateContent({ text: val })}
              className="w-full bg-transparent outline-none text-sm resize-none"
              placeholder="Note text..."
            />
          </div>
        );

      case "callout":
        return (
          <div className="border rounded-lg p-4 bg-secondary/50">
            <AutoTextarea
              value={localContent.text || ""}
              onChange={(val) => updateContent({ text: val })}
              className="w-full bg-transparent outline-none text-sm resize-none"
              placeholder="Callout text..."
            />
          </div>
        );

      default:
        return <p className="text-muted-foreground text-sm">Unknown block type: {block.type}</p>;
    }
  };

  return (
    <div className="group/block relative">
      <div className="absolute -right-8 top-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <button
          onClick={() => onDelete(block.id)}
          className="text-muted-foreground hover:text-destructive p-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {renderBlock()}
    </div>
  );
};

// Auto-resizing textarea
const AutoTextarea = ({
  value,
  onChange,
  className,
  placeholder,
  style,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
      rows={1}
    />
  );
};

// List editor
const ListEditor = ({
  items,
  ordered,
  onChange,
}: {
  items: string[];
  ordered: boolean;
  onChange: (items: string[]) => void;
}) => {
  const addItem = () => onChange([...items, ""]);
  const updateItem = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group/item">
          <span className="text-muted-foreground text-sm mt-0.5 shrink-0 w-4 text-right">
            {ordered ? `${i + 1}.` : "•"}
          </span>
          <input
            className="flex-1 bg-transparent outline-none text-sm leading-relaxed text-foreground focus:ring-2 focus:ring-ring/20 rounded px-1"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder="List item..."
          />
          <button
            onClick={() => removeItem(i)}
            className="text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 shrink-0"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs text-muted-foreground hover:text-foreground ml-6"
      >
        + Add item
      </button>
    </div>
  );
};

export default BlockEditor;
