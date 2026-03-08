import { useState, useRef, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import type { Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";

type BlockKey = keyof DesignSettings["blockStyles"];

interface BlockEditorProps {
  block: Block;
  settings: DesignSettings;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
}

const BlockEditor = ({ block, settings, onUpdate, onDelete }: BlockEditorProps) => {
  // Local content state for immediate UI updates
  const [localContent, setLocalContent] = useState(block.content);

  useEffect(() => {
    setLocalContent(block.content);
  }, [block.id, block.content]);

  const debouncedSave = useDebouncedCallback((content: any) => {
    onUpdate(block.id, { content });
  }, 500);

  const updateContent = useCallback((updates: any) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    debouncedSave(newContent);
  }, [localContent, debouncedSave]);

  const bs = settings.blockStyles[block.type as BlockKey] || {};
  const blockStyle: React.CSSProperties = {
    color: bs.color ? `hsl(${bs.color})` : undefined,
    fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : undefined,
    fontSize: bs.fontSize ? `${bs.fontSize}px` : undefined,
    fontWeight: bs.fontWeight as any,
    backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined,
    borderColor: bs.borderColor ? `hsl(${bs.borderColor})` : undefined,
    borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : undefined,
    padding: bs.padding != null ? `${bs.padding}px` : undefined,
  };

  const renderBlock = () => {
    switch (block.type) {
      case "heading":
        return (
          <input
            className="bg-transparent w-full outline-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
            style={{
              fontFamily: `'${settings.headingFont}', sans-serif`,
              fontWeight: settings.headingWeight,
              fontSize: `${settings.headingFontSize}px`,
              ...blockStyle,
            }}
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
            className="w-full bg-transparent outline-none leading-relaxed resize-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
            placeholder="Start typing..."
            style={{
              fontSize: `${settings.baseFontSize}px`,
              marginBottom: `${settings.paragraphSpacing}px`,
              ...blockStyle,
            }}
          />
        );

      case "code_block":
        return (
          <div
            className="mb-4 border"
            style={{
              backgroundColor: `hsl(${settings.codeBlockBg})`,
              borderRadius: `${settings.codeBlockBorderRadius}px`,
              borderColor: `hsl(${settings.borderColor})`,
              padding: "16px",
              ...blockStyle,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <input
                className="text-xs bg-transparent outline-none"
                style={{ color: `hsl(${settings.mutedForegroundColor})` }}
                value={localContent.language || ""}
                onChange={(e) => updateContent({ language: e.target.value })}
                placeholder="language"
              />
            </div>
            <textarea
              className="w-full bg-transparent outline-none text-sm resize-none min-h-[60px]"
              style={{ fontFamily: `'${settings.codeFont}', monospace` }}
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
              className="w-full text-sm bg-transparent outline-none border rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{ borderColor: `hsl(${settings.borderColor})`, color: `hsl(${settings.mutedForegroundColor})` }}
              value={localContent.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Image URL..."
            />
            {localContent.url && (
              <div
                className="overflow-hidden border"
                style={{
                  borderRadius: settings.imageRounded ? "8px" : "0",
                  borderColor: `hsl(${settings.borderColor})`,
                  ...blockStyle,
                }}
              >
                <img
                  src={localContent.url}
                  alt={localContent.alt || ""}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            )}
            <input
              className="w-full text-xs bg-transparent outline-none mt-1 px-1"
              style={{ color: `hsl(${settings.mutedForegroundColor})` }}
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
              className="w-full text-sm bg-transparent outline-none border rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{ borderColor: `hsl(${settings.borderColor})`, color: `hsl(${settings.mutedForegroundColor})` }}
              value={localContent.videoId || ""}
              onChange={(e) => updateContent({ videoId: e.target.value })}
              placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)"
            />
            {localContent.videoId && (
              <div
                className="overflow-hidden border aspect-video"
                style={{
                  borderRadius: `${bs.borderRadius ?? 8}px`,
                  borderColor: `hsl(${settings.borderColor})`,
                }}
              >
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
              className="w-full text-sm bg-transparent outline-none border rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{ borderColor: `hsl(${settings.borderColor})`, color: `hsl(${settings.mutedForegroundColor})` }}
              value={localContent.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Video URL..."
            />
            {localContent.url && (
              <video
                controls
                className="w-full border"
                style={{
                  borderRadius: `${bs.borderRadius ?? 8}px`,
                  borderColor: `hsl(${settings.borderColor})`,
                }}
              >
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
            style={blockStyle}
            settings={settings}
          />
        );

      case "note":
        return (
          <div
            className="mb-4"
            style={{
              backgroundColor: `hsl(${settings.noteBg})`,
              borderLeft: `${settings.noteBorderWidth}px solid hsl(${settings.noteBorderColor})`,
              borderRadius: "0 8px 8px 0",
              padding: "12px 16px",
              fontSize: `${settings.baseFontSize - 1}px`,
              ...blockStyle,
            }}
          >
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
          <div
            className="mb-4 border rounded-lg p-4"
            style={{
              backgroundColor: `hsl(${settings.accentColor})`,
              borderColor: `hsl(${settings.borderColor})`,
              ...blockStyle,
            }}
          >
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
          className="p-1"
          style={{ color: `hsl(${settings.mutedForegroundColor})` }}
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
      ref.current.style.height = `${ref.current.scrollHeight}px`;
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
  style,
  settings,
}: {
  items: string[];
  ordered: boolean;
  onChange: (items: string[]) => void;
  style?: React.CSSProperties;
  settings: DesignSettings;
}) => {
  const addItem = () => onChange([...items, ""]);
  const updateItem = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1" style={style}>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group/item">
          <span
            className="text-sm mt-0.5 shrink-0 w-4 text-right"
            style={{ color: `hsl(${settings.mutedForegroundColor})` }}
          >
            {ordered ? `${i + 1}.` : "•"}
          </span>
          <input
            className="flex-1 bg-transparent outline-none text-sm leading-relaxed focus:ring-2 focus:ring-ring/20 rounded px-1"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder="List item..."
          />
          <button
            onClick={() => removeItem(i)}
            className="opacity-0 group-hover/item:opacity-100 shrink-0"
            style={{ color: `hsl(${settings.mutedForegroundColor})` }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs ml-6"
        style={{ color: `hsl(${settings.mutedForegroundColor})` }}
      >
        + Add item
      </button>
    </div>
  );
};

export default BlockEditor;
