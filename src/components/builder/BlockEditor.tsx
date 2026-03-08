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

  // Resolved effective values matching DocBlockRenderer logic
  const effectiveCodeFont = bs.fontFamily ? `'${bs.fontFamily}', monospace` : `'${settings.codeFont}', monospace`;
  const effectiveCodeFontSize = bs.fontSize ?? (settings.baseFontSize - 1);

  const renderBlock = () => {
    switch (block.type) {
      case "heading":
        return (
          <input
            className="bg-transparent w-full outline-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
            style={{
              fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.headingFont}', sans-serif`,
              fontWeight: (bs.fontWeight as any) || settings.headingWeight,
              fontSize: `${bs.fontSize ?? settings.headingFontSize}px`,
              color: bs.color ? `hsl(${bs.color})` : undefined,
              marginBottom: "12px",
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
            className="w-full bg-transparent outline-none resize-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
            placeholder="Start typing..."
            style={{
              fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`,
              fontSize: `${bs.fontSize ?? settings.baseFontSize}px`,
              lineHeight: settings.lineHeight,
              marginBottom: `${settings.paragraphSpacing}px`,
              color: bs.color ? `hsl(${bs.color})` : undefined,
              fontWeight: (bs.fontWeight as any) || undefined,
            }}
          />
        );

      case "code_block":
        return (
          <div
            style={{
              backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${settings.codeBlockBg})`,
              borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : `${settings.codeBlockBorderRadius}px`,
              border: `1px solid ${bs.borderColor ? `hsl(${bs.borderColor})` : `hsl(${settings.borderColor})`}`,
              padding: bs.padding != null ? `${bs.padding}px` : "16px",
              fontFamily: effectiveCodeFont,
              fontSize: `${effectiveCodeFontSize}px`,
              color: bs.color ? `hsl(${bs.color})` : undefined,
              marginBottom: "16px",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
              <input
                className="bg-transparent outline-none"
                style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "12px" }}
                value={localContent.language || ""}
                onChange={(e) => updateContent({ language: e.target.value })}
                placeholder="language"
              />
            </div>
            <textarea
              className="w-full bg-transparent outline-none resize-none"
              style={{
                fontFamily: "inherit",
                fontSize: "inherit",
                color: "inherit",
                minHeight: "60px",
              }}
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
              className="w-full bg-transparent outline-none border px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{
                borderColor: `hsl(${settings.borderColor})`,
                color: `hsl(${settings.mutedForegroundColor})`,
                fontSize: `${settings.baseFontSize - 1}px`,
                borderRadius: `${settings.codeBlockBorderRadius}px`,
              }}
              value={localContent.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Image URL..."
            />
            {localContent.url && (
              <div
                className="overflow-hidden"
                style={{
                  borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : (settings.imageRounded ? "8px" : "0"),
                  border: `1px solid hsl(${bs.borderColor || settings.borderColor})`,
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
              className="w-full bg-transparent outline-none mt-1 px-1"
              style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "12px" }}
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
              className="w-full bg-transparent outline-none border px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{
                borderColor: `hsl(${settings.borderColor})`,
                color: `hsl(${settings.mutedForegroundColor})`,
                fontSize: `${settings.baseFontSize - 1}px`,
                borderRadius: `${settings.codeBlockBorderRadius}px`,
              }}
              value={localContent.videoId || ""}
              onChange={(e) => updateContent({ videoId: e.target.value })}
              placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)"
            />
            {localContent.videoId && (
              <div
                className="overflow-hidden aspect-video"
                style={{
                  borderRadius: `${bs.borderRadius ?? 8}px`,
                  border: `1px solid hsl(${bs.borderColor || settings.borderColor})`,
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
              className="w-full bg-transparent outline-none border px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{
                borderColor: `hsl(${settings.borderColor})`,
                color: `hsl(${settings.mutedForegroundColor})`,
                fontSize: `${settings.baseFontSize - 1}px`,
                borderRadius: `${settings.codeBlockBorderRadius}px`,
              }}
              value={localContent.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Video URL..."
            />
            {localContent.url && (
              <video
                controls
                className="w-full"
                style={{
                  borderRadius: `${bs.borderRadius ?? 8}px`,
                  border: `1px solid hsl(${bs.borderColor || settings.borderColor})`,
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
            settings={settings}
            bs={bs}
          />
        );

      case "note": {
        return (
          <div
            style={{
              backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${settings.noteBg})`,
              borderLeft: `${settings.noteBorderWidth}px solid ${bs.borderColor ? `hsl(${bs.borderColor})` : `hsl(${settings.noteBorderColor})`}`,
              borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : "0 8px 8px 0",
              padding: bs.padding != null ? `${bs.padding}px` : "12px 16px",
              fontSize: `${bs.fontSize ?? (settings.baseFontSize - 1)}px`,
              fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`,
              color: bs.color ? `hsl(${bs.color})` : undefined,
              marginBottom: "16px",
            }}
          >
            <AutoTextarea
              value={localContent.text || ""}
              onChange={(val) => updateContent({ text: val })}
              className="w-full bg-transparent outline-none resize-none"
              placeholder="Note text..."
              style={{ fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}
            />
          </div>
        );
      }

      case "callout": {
        return (
          <div
            style={{
              backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${settings.accentColor})`,
              border: `1px solid ${bs.borderColor ? `hsl(${bs.borderColor})` : `hsl(${settings.borderColor})`}`,
              borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : "8px",
              padding: bs.padding != null ? `${bs.padding}px` : "16px",
              fontSize: `${bs.fontSize ?? settings.baseFontSize}px`,
              fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`,
              color: bs.color ? `hsl(${bs.color})` : undefined,
              marginBottom: "16px",
            }}
          >
            <AutoTextarea
              value={localContent.text || ""}
              onChange={(val) => updateContent({ text: val })}
              className="w-full bg-transparent outline-none resize-none"
              placeholder="Callout text..."
              style={{ fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}
            />
          </div>
        );
      }

      default:
        return <p style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: `${settings.baseFontSize - 1}px` }}>Unknown block type: {block.type}</p>;
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
  settings,
  bs,
}: {
  items: string[];
  ordered: boolean;
  onChange: (items: string[]) => void;
  settings: DesignSettings;
  bs: Partial<DesignSettings["blockStyles"]["ordered_list"]>;
}) => {
  const addItem = () => onChange([...items, ""]);
  const updateItem = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const listFontSize = bs.fontSize ?? settings.baseFontSize;
  const listFont = bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`;

  return (
    <div
      style={{
        fontFamily: listFont,
        fontSize: `${listFontSize}px`,
        lineHeight: settings.lineHeight,
        color: bs.color ? `hsl(${bs.color})` : undefined,
        fontWeight: (bs.fontWeight as any) || undefined,
      }}
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group/item" style={{ marginBottom: "4px" }}>
          <span
            className="mt-0.5 shrink-0 w-4 text-right"
            style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "inherit" }}
          >
            {ordered ? `${i + 1}.` : "•"}
          </span>
          <input
            className="flex-1 bg-transparent outline-none focus:ring-2 focus:ring-ring/20 rounded px-1"
            style={{ fontSize: "inherit", fontFamily: "inherit", lineHeight: "inherit" }}
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
        className="ml-6"
        style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "12px" }}
      >
        + Add item
      </button>
    </div>
  );
};

export default BlockEditor;
