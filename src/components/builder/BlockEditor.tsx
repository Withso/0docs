import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { Trash2, Plus } from "lucide-react";
import type { Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";

const InlineEditorBlock = lazy(() => import("./InlineEditorBlock"));
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
              color: bs.color ? `hsl(${bs.color})` : undefined, marginBottom: "12px",
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
              fontSize: `${bs.fontSize ?? settings.baseFontSize}px`, lineHeight: settings.lineHeight,
              marginBottom: `${settings.paragraphSpacing}px`,
              color: bs.color ? `hsl(${bs.color})` : undefined, fontWeight: (bs.fontWeight as any) || undefined,
            }}
          />
        );

      case "code_block":
        return (
          <div style={{
            backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${settings.codeBlockBg})`,
            borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : `${settings.codeBlockBorderRadius}px`,
            border: `1px solid ${bs.borderColor ? `hsl(${bs.borderColor})` : `hsl(${settings.borderColor})`}`,
            padding: bs.padding != null ? `${bs.padding}px` : "16px",
            fontFamily: effectiveCodeFont, fontSize: `${effectiveCodeFontSize}px`,
            color: bs.color ? `hsl(${bs.color})` : undefined, marginBottom: "16px",
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
              <input className="bg-transparent outline-none" style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "12px" }}
                value={localContent.language || ""} onChange={(e) => updateContent({ language: e.target.value })} placeholder="language" />
            </div>
            <textarea className="w-full bg-transparent outline-none resize-none" style={{ fontFamily: "inherit", fontSize: "inherit", color: "inherit", minHeight: "60px" }}
              value={localContent.code || ""} onChange={(e) => updateContent({ code: e.target.value })} placeholder="// Code here..."
              rows={Math.max(3, (localContent.code || "").split("\n").length)} />
          </div>
        );

      case "image":
        return (
          <div>
            <input className="w-full bg-transparent outline-none border px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{ borderColor: `hsl(${settings.borderColor})`, color: `hsl(${settings.mutedForegroundColor})`, fontSize: `${settings.baseFontSize - 1}px`, borderRadius: `${settings.codeBlockBorderRadius}px` }}
              value={localContent.url || ""} onChange={(e) => updateContent({ url: e.target.value })} placeholder="Image URL..." />
            {localContent.url && (
              <div className="overflow-hidden" style={{
                borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : (settings.imageRounded ? "8px" : "0"),
                border: `1px solid hsl(${bs.borderColor || settings.borderColor})`,
                ...(bs.backgroundColor ? { backgroundColor: `hsl(${bs.backgroundColor})` } : {}),
                ...(bs.padding != null ? { padding: `${bs.padding}px` } : {}),
              }}>
                <img src={localContent.url} alt={localContent.alt || ""} className="w-full h-auto" loading="lazy" />
              </div>
            )}
            <input className="w-full bg-transparent outline-none mt-1 px-1"
              style={{ color: bs.color ? `hsl(${bs.color})` : `hsl(${settings.mutedForegroundColor})`, fontSize: `${bs.fontSize ?? (settings.baseFontSize - 1)}px`,
                fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`, fontWeight: (bs.fontWeight as any) || undefined, lineHeight: settings.lineHeight }}
              value={localContent.alt || ""} onChange={(e) => updateContent({ alt: e.target.value })} placeholder="Alt text / caption" />
          </div>
        );

      case "youtube":
        return (
          <div>
            <input className="w-full bg-transparent outline-none border px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{ borderColor: `hsl(${settings.borderColor})`, color: `hsl(${settings.mutedForegroundColor})`, fontSize: `${settings.baseFontSize - 1}px`, borderRadius: `${settings.codeBlockBorderRadius}px` }}
              value={localContent.videoId || ""} onChange={(e) => updateContent({ videoId: e.target.value })} placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)" />
            {localContent.videoId && (
              <div style={{ backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined, border: `1px solid hsl(${bs.borderColor || settings.borderColor})`, borderRadius: `${bs.borderRadius ?? 8}px`, padding: bs.padding != null ? `${bs.padding}px` : undefined }}>
                <div className="overflow-hidden aspect-video" style={{ borderRadius: `${bs.borderRadius ?? 8}px` }}>
                  <iframe src={`https://www.youtube.com/embed/${localContent.videoId}`} className="w-full h-full" allowFullScreen title={localContent.title || "Video"} />
                </div>
              </div>
            )}
          </div>
        );

      case "video":
        return (
          <div>
            <input className="w-full bg-transparent outline-none border px-3 py-2 mb-2 focus:ring-2 focus:ring-ring/20"
              style={{ borderColor: `hsl(${settings.borderColor})`, color: `hsl(${settings.mutedForegroundColor})`, fontSize: `${settings.baseFontSize - 1}px`, borderRadius: `${settings.codeBlockBorderRadius}px` }}
              value={localContent.url || ""} onChange={(e) => updateContent({ url: e.target.value })} placeholder="Video URL..." />
            {localContent.url && (
              <div style={{ backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined, border: `1px solid hsl(${bs.borderColor || settings.borderColor})`, borderRadius: `${bs.borderRadius ?? 8}px`, padding: bs.padding != null ? `${bs.padding}px` : undefined }}>
                <div className="overflow-hidden" style={{ borderRadius: `${bs.borderRadius ?? 8}px` }}>
                  <video controls className="w-full" style={{ display: "block" }}><source src={localContent.url} /></video>
                </div>
              </div>
            )}
          </div>
        );

      case "ordered_list":
      case "unordered_list":
        return <ListEditor items={localContent.items || []} ordered={block.type === "ordered_list"} onChange={(items) => updateContent({ items })} settings={settings} bs={bs} />;

      case "note":
        return (
          <div style={{
            backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${settings.noteBg})`,
            borderLeft: `${settings.noteBorderWidth}px solid ${bs.borderColor ? `hsl(${bs.borderColor})` : `hsl(${settings.noteBorderColor})`}`,
            borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : "0 8px 8px 0",
            padding: bs.padding != null ? `${bs.padding}px` : "12px 16px",
            fontSize: `${bs.fontSize ?? (settings.baseFontSize - 1)}px`,
            fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`,
            color: bs.color ? `hsl(${bs.color})` : undefined, marginBottom: "16px",
          }}>
            <AutoTextarea value={localContent.text || ""} onChange={(val) => updateContent({ text: val })}
              className="w-full bg-transparent outline-none resize-none" placeholder="Note text..."
              style={{ fontSize: "inherit", fontFamily: "inherit", color: "inherit" }} />
          </div>
        );

      case "callout":
        return (
          <div style={{
            backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${settings.accentColor})`,
            border: `1px solid ${bs.borderColor ? `hsl(${bs.borderColor})` : `hsl(${settings.borderColor})`}`,
            borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : "8px",
            padding: bs.padding != null ? `${bs.padding}px` : "16px",
            fontSize: `${bs.fontSize ?? settings.baseFontSize}px`,
            fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`,
            color: bs.color ? `hsl(${bs.color})` : undefined, marginBottom: "16px",
          }}>
            <AutoTextarea value={localContent.text || ""} onChange={(val) => updateContent({ text: val })}
              className="w-full bg-transparent outline-none resize-none" placeholder="Callout text..."
              style={{ fontSize: "inherit", fontFamily: "inherit", color: "inherit" }} />
          </div>
        );

      // --- New block types ---

      case "tabs":
        return <TabsEditor content={localContent} onChange={updateContent} settings={settings} bs={bs} />;

      case "accordion":
        return <AccordionEditor content={localContent} onChange={updateContent} settings={settings} bs={bs} />;

      case "card":
        return (
          <div style={{
            border: `1px solid hsl(${bs.borderColor || settings.borderColor})`,
            borderRadius: `${bs.borderRadius ?? 8}px`, padding: `${bs.padding ?? 20}px`,
            backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${settings.accentColor})`, marginBottom: "16px",
          }}>
            <input className="w-full bg-transparent outline-none mb-2" style={{
              fontFamily: `'${settings.headingFont}', sans-serif`, fontWeight: settings.headingWeight,
              fontSize: `${bs.fontSize ?? settings.baseFontSize}px`, color: bs.color ? `hsl(${bs.color})` : undefined,
            }} value={localContent.title || ""} onChange={(e) => updateContent({ title: e.target.value })} placeholder="Card title..." />
            <AutoTextarea value={localContent.description || ""} onChange={(val) => updateContent({ description: val })}
              className="w-full bg-transparent outline-none resize-none" placeholder="Card description..."
              style={{ fontFamily: `'${settings.bodyFont}', sans-serif`, fontSize: `${settings.baseFontSize - 1}px`, color: `hsl(${settings.mutedForegroundColor})`, lineHeight: settings.lineHeight }} />
            <input className="w-full bg-transparent outline-none mt-2" style={{ fontSize: `${settings.baseFontSize - 1}px`, color: `hsl(${settings.linkColor})` }}
              value={localContent.link || ""} onChange={(e) => updateContent({ link: e.target.value })} placeholder="Link URL (optional)..." />
          </div>
        );

      case "steps":
        return <StepsEditor content={localContent} onChange={updateContent} settings={settings} bs={bs} />;

      case "table":
        return <TableEditor content={localContent} onChange={updateContent} settings={settings} bs={bs} />;

      case "divider":
        return <hr style={{ border: "none", borderTop: `1px solid hsl(${bs.borderColor || settings.borderColor})`, margin: "24px 0" }} />;

      case "quote":
        return (
          <blockquote style={{
            borderLeft: `3px solid hsl(${bs.borderColor || settings.primaryColor})`,
            paddingLeft: "16px", margin: "0 0 16px 0",
          }}>
            <AutoTextarea value={localContent.text || ""} onChange={(val) => updateContent({ text: val })}
              className="w-full bg-transparent outline-none resize-none" placeholder="Quote text..."
              style={{ fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`,
                fontSize: `${bs.fontSize ?? settings.baseFontSize}px`, fontStyle: "italic", lineHeight: settings.lineHeight, color: bs.color ? `hsl(${bs.color})` : undefined }} />
            <input className="w-full bg-transparent outline-none mt-1" style={{ fontSize: `${settings.baseFontSize - 2}px`, color: `hsl(${settings.mutedForegroundColor})` }}
              value={localContent.attribution || ""} onChange={(e) => updateContent({ attribution: e.target.value })} placeholder="— Attribution" />
          </blockquote>
        );

      case "api_endpoint":
        return <ApiEndpointEditor content={localContent} onChange={updateContent} settings={settings} bs={bs} />;

      case "code_tabs":
        return <CodeTabsEditor content={localContent} onChange={updateContent} settings={settings} bs={bs} />;

      default:
        return <p style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: `${settings.baseFontSize - 1}px` }}>Unknown block type: {block.type}</p>;
    }
  };

  return (
    <div className="group/block relative">
      <div className="absolute -right-8 top-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <button onClick={() => onDelete(block.id)} className="p-1" style={{ color: `hsl(${settings.mutedForegroundColor})` }}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {renderBlock()}
    </div>
  );
};

// --- Shared components ---

const AutoTextarea = ({ value, onChange, className, placeholder, style }: {
  value: string; onChange: (val: string) => void; className?: string; placeholder?: string; style?: React.CSSProperties;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = `${ref.current.scrollHeight}px`; } }, [value]);
  return <textarea ref={ref} className={className} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} rows={1} />;
};

const ListEditor = ({ items, ordered, onChange, settings, bs }: {
  items: string[]; ordered: boolean; onChange: (items: string[]) => void; settings: DesignSettings; bs: any;
}) => {
  const listFontSize = bs.fontSize ?? settings.baseFontSize;
  const listFont = bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${settings.bodyFont}', sans-serif`;
  return (
    <div style={{ fontFamily: listFont, fontSize: `${listFontSize}px`, lineHeight: settings.lineHeight, color: bs.color ? `hsl(${bs.color})` : undefined, fontWeight: (bs.fontWeight as any) || undefined }}>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group/item" style={{ marginBottom: "4px" }}>
          <span className="mt-0.5 shrink-0 w-4 text-right" style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "inherit" }}>
            {ordered ? `${i + 1}.` : "•"}
          </span>
          <input className="flex-1 bg-transparent outline-none focus:ring-2 focus:ring-ring/20 rounded px-1"
            style={{ fontSize: "inherit", fontFamily: "inherit", lineHeight: "inherit" }}
            value={item} onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }} placeholder="List item..." />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="opacity-0 group-hover/item:opacity-100 shrink-0"
            style={{ color: `hsl(${settings.mutedForegroundColor})` }}><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} className="ml-6" style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "12px" }}>+ Add item</button>
    </div>
  );
};

// --- New block editors ---

const TabsEditor = ({ content, onChange, settings, bs }: { content: any; onChange: (u: any) => void; settings: DesignSettings; bs: any }) => {
  const [active, setActive] = useState(0);
  const tabs = content.tabs || [];
  const updateTab = (i: number, updates: any) => {
    const newTabs = [...tabs]; newTabs[i] = { ...newTabs[i], ...updates }; onChange({ tabs: newTabs });
  };
  return (
    <div style={{ marginBottom: "16px" }}>
      <div className="flex items-center" style={{ borderBottom: `1px solid hsl(${settings.borderColor})`, gap: "0" }}>
        {tabs.map((tab: any, i: number) => (
          <div key={i} className="flex items-center group/tab">
            <button onClick={() => setActive(i)} style={{
              padding: "8px 14px", fontSize: `${bs.fontSize ?? (settings.baseFontSize - 1)}px`,
              fontFamily: `'${settings.bodyFont}', sans-serif`, fontWeight: active === i ? 500 : 400,
              color: active === i ? `hsl(${settings.primaryColor})` : `hsl(${settings.mutedForegroundColor})`,
              borderBottom: active === i ? `2px solid hsl(${settings.primaryColor})` : "2px solid transparent",
              background: "none", cursor: "pointer",
            }}>{tab.label}</button>
          </div>
        ))}
        <button onClick={() => onChange({ tabs: [...tabs, { label: `Tab ${tabs.length + 1}`, content: "" }] })}
          className="ml-1" style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "12px" }}>+</button>
      </div>
      {tabs[active] && (
        <div style={{ padding: "12px 0" }}>
          <input className="w-full bg-transparent outline-none mb-2" style={{ fontSize: "12px", color: `hsl(${settings.mutedForegroundColor})` }}
            value={tabs[active].label} onChange={(e) => updateTab(active, { label: e.target.value })} placeholder="Tab label" />
          <AutoTextarea value={tabs[active].content || ""} onChange={(val) => updateTab(active, { content: val })}
            className="w-full bg-transparent outline-none resize-none" placeholder="Tab content..."
            style={{ fontFamily: `'${settings.bodyFont}', sans-serif`, fontSize: `${settings.baseFontSize}px`, lineHeight: settings.lineHeight }} />
          {tabs.length > 1 && (
            <button onClick={() => { const newTabs = tabs.filter((_: any, idx: number) => idx !== active); setActive(Math.min(active, newTabs.length - 1)); onChange({ tabs: newTabs }); }}
              style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})`, marginTop: "4px" }}>Remove tab</button>
          )}
        </div>
      )}
    </div>
  );
};

const AccordionEditor = ({ content, onChange, settings, bs }: { content: any; onChange: (u: any) => void; settings: DesignSettings; bs: any }) => {
  const items = content.items || [];
  const updateItem = (i: number, updates: any) => {
    const newItems = [...items]; newItems[i] = { ...newItems[i], ...updates }; onChange({ items: newItems });
  };
  return (
    <div style={{ marginBottom: "16px", border: `1px solid hsl(${settings.borderColor})`, borderRadius: `${bs.borderRadius ?? 8}px`, overflow: "hidden" }}>
      {items.map((item: any, i: number) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid hsl(${settings.borderColor})` : undefined, padding: "12px 16px" }}>
          <input className="w-full bg-transparent outline-none" style={{ fontFamily: `'${settings.bodyFont}', sans-serif`, fontSize: `${bs.fontSize ?? settings.baseFontSize}px`, fontWeight: 500 }}
            value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} placeholder="Accordion title..." />
          <AutoTextarea value={item.content || ""} onChange={(val) => updateItem(i, { content: val })}
            className="w-full bg-transparent outline-none resize-none mt-1" placeholder="Content..."
            style={{ fontSize: `${settings.baseFontSize - 1}px`, color: `hsl(${settings.mutedForegroundColor})`, lineHeight: settings.lineHeight }} />
          {items.length > 1 && (
            <button onClick={() => onChange({ items: items.filter((_: any, idx: number) => idx !== i) })}
              style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})`, marginTop: "4px" }}>Remove</button>
          )}
        </div>
      ))}
      <button onClick={() => onChange({ items: [...items, { title: "New Item", content: "" }] })}
        className="w-full py-2" style={{ fontSize: "12px", color: `hsl(${settings.mutedForegroundColor})` }}>+ Add item</button>
    </div>
  );
};

const StepsEditor = ({ content, onChange, settings, bs }: { content: any; onChange: (u: any) => void; settings: DesignSettings; bs: any }) => {
  const items = content.items || [];
  const updateItem = (i: number, updates: any) => {
    const newItems = [...items]; newItems[i] = { ...newItems[i], ...updates }; onChange({ items: newItems });
  };
  return (
    <div style={{ marginBottom: "16px" }}>
      {items.map((step: any, i: number) => (
        <div key={i} className="flex gap-4 group/step" style={{ marginBottom: "16px" }}>
          <div className="flex flex-col items-center shrink-0">
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%", backgroundColor: `hsl(${settings.primaryColor})`,
              color: `hsl(${settings.primaryForegroundColor})`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 600,
            }}>{i + 1}</div>
            {i < items.length - 1 && <div style={{ width: "2px", flex: 1, marginTop: "4px", backgroundColor: `hsl(${settings.borderColor})` }} />}
          </div>
          <div className="flex-1">
            <input className="w-full bg-transparent outline-none" style={{ fontFamily: `'${settings.headingFont}', sans-serif`, fontWeight: settings.headingWeight, fontSize: `${bs.fontSize ?? settings.baseFontSize}px` }}
              value={step.title} onChange={(e) => updateItem(i, { title: e.target.value })} placeholder="Step title..." />
            <AutoTextarea value={step.description || ""} onChange={(val) => updateItem(i, { description: val })}
              className="w-full bg-transparent outline-none resize-none mt-1" placeholder="Step description..."
              style={{ fontSize: `${settings.baseFontSize - 1}px`, color: `hsl(${settings.mutedForegroundColor})`, lineHeight: settings.lineHeight }} />
            {items.length > 1 && (
              <button onClick={() => onChange({ items: items.filter((_: any, idx: number) => idx !== i) })} className="opacity-0 group-hover/step:opacity-100"
                style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})`, marginTop: "4px" }}>Remove</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={() => onChange({ items: [...items, { title: "New Step", description: "" }] })}
        className="ml-11" style={{ fontSize: "12px", color: `hsl(${settings.mutedForegroundColor})` }}>+ Add step</button>
    </div>
  );
};

const TableEditor = ({ content, onChange, settings, bs }: { content: any; onChange: (u: any) => void; settings: DesignSettings; bs: any }) => {
  const headers = content.headers || [];
  const rows = content.rows || [];
  const updateHeader = (i: number, val: string) => { const h = [...headers]; h[i] = val; onChange({ headers: h }); };
  const updateCell = (ri: number, ci: number, val: string) => { const r = rows.map((row: string[]) => [...row]); r[ri][ci] = val; onChange({ rows: r }); };
  const addColumn = () => { onChange({ headers: [...headers, `Column ${headers.length + 1}`], rows: rows.map((r: string[]) => [...r, ""]) }); };
  const addRow = () => { onChange({ rows: [...rows, headers.map(() => "")] }); };
  return (
    <div style={{ border: `1px solid hsl(${bs.borderColor || settings.borderColor})`, borderRadius: `${bs.borderRadius ?? 8}px`, overflow: "hidden", marginBottom: "16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: `hsl(${settings.accentColor})` }}>
            {headers.map((h: string, i: number) => (
              <th key={i} style={{ padding: "8px 12px", borderBottom: `1px solid hsl(${settings.borderColor})` }}>
                <input className="w-full bg-transparent outline-none" style={{ fontSize: `${settings.baseFontSize - 1}px`, fontWeight: 600 }}
                  value={h} onChange={(e) => updateHeader(i, e.target.value)} placeholder="Header..." />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: string[], ri: number) => (
            <tr key={ri}>
              {row.map((cell: string, ci: number) => (
                <td key={ci} style={{ padding: "8px 12px", borderBottom: ri < rows.length - 1 ? `1px solid hsl(${settings.borderColor})` : undefined }}>
                  <input className="w-full bg-transparent outline-none" style={{ fontSize: `${settings.baseFontSize - 1}px` }}
                    value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} placeholder="Cell..." />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 p-2" style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})` }}>
        <button onClick={addRow}>+ Row</button>
        <button onClick={addColumn}>+ Column</button>
      </div>
    </div>
  );
};

const ApiEndpointEditor = ({ content, onChange, settings, bs }: { content: any; onChange: (u: any) => void; settings: DesignSettings; bs: any }) => {
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  const params = content.parameters || [];
  const updateParam = (i: number, updates: any) => {
    const newParams = [...params]; newParams[i] = { ...newParams[i], ...updates }; onChange({ parameters: newParams });
  };
  const addParam = () => onChange({ parameters: [...params, { name: "", type: "string", required: false }] });
  const removeParam = (i: number) => onChange({ parameters: params.filter((_: any, idx: number) => idx !== i) });

  return (
    <div style={{ border: `1px solid hsl(${bs.borderColor || settings.borderColor})`, borderRadius: `${bs.borderRadius ?? 8}px`, overflow: "hidden", marginBottom: "16px" }}>
      <div className="flex items-center gap-2" style={{ padding: "10px 14px", backgroundColor: `hsl(${settings.accentColor})`, borderBottom: `1px solid hsl(${settings.borderColor})` }}>
        <select className="bg-transparent outline-none font-mono text-xs font-bold" value={content.method || "GET"}
          onChange={(e) => onChange({ method: e.target.value })}>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="flex-1 bg-transparent outline-none font-mono" style={{ fontSize: `${settings.baseFontSize - 1}px` }}
          value={content.path || ""} onChange={(e) => onChange({ path: e.target.value })} placeholder="/api/endpoint" />
      </div>
      <div style={{ padding: "10px 14px" }}>
        <AutoTextarea value={content.description || ""} onChange={(val) => onChange({ description: val })}
          className="w-full bg-transparent outline-none resize-none" placeholder="Description..."
          style={{ fontSize: `${settings.baseFontSize - 1}px`, color: `hsl(${settings.mutedForegroundColor})` }} />
      </div>
      {/* Parameters section */}
      <div style={{ padding: "0 14px 10px 14px" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: `hsl(${settings.mutedForegroundColor})` }}>Parameters</div>
          <button onClick={addParam} style={{ fontSize: "11px", color: `hsl(${settings.primaryColor})` }}>+ Add</button>
        </div>
        {params.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <input className="bg-transparent outline-none font-mono flex-1" style={{ fontSize: "12px", padding: "4px 6px", border: `1px solid hsl(${settings.borderColor})`, borderRadius: "4px" }}
              value={p.name} onChange={(e) => updateParam(i, { name: e.target.value })} placeholder="name" />
            <select className="bg-transparent outline-none" style={{ fontSize: "11px", padding: "4px", border: `1px solid hsl(${settings.borderColor})`, borderRadius: "4px" }}
              value={p.type || "string"} onChange={(e) => updateParam(i, { type: e.target.value })}>
              {["string", "number", "boolean", "object", "array"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-1" style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})` }}>
              <input type="checkbox" checked={!!p.required} onChange={(e) => updateParam(i, { required: e.target.checked })} />
              req
            </label>
            <button onClick={() => removeParam(i)} style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})` }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 14px 10px 14px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "4px", color: `hsl(${settings.mutedForegroundColor})` }}>Response</div>
        <textarea className="w-full bg-transparent outline-none resize-none font-mono" style={{ fontSize: "12px", backgroundColor: `hsl(${settings.codeBlockBg})`, borderRadius: "4px", padding: "8px", minHeight: "40px" }}
          value={content.response || ""} onChange={(e) => onChange({ response: e.target.value })} placeholder='{"key": "value"}' />
      </div>
    </div>
  );
};

const CodeTabsEditor = ({ content, onChange, settings, bs }: { content: any; onChange: (u: any) => void; settings: DesignSettings; bs: any }) => {
  const [active, setActive] = useState(0);
  const tabs = content.tabs || [];
  const codeFont = bs.fontFamily ? `'${bs.fontFamily}', monospace` : `'${settings.codeFont}', monospace`;
  const updateTab = (i: number, updates: any) => { const newTabs = [...tabs]; newTabs[i] = { ...newTabs[i], ...updates }; onChange({ tabs: newTabs }); };
  return (
    <div style={{ border: `1px solid hsl(${bs.borderColor || settings.borderColor})`, borderRadius: `${bs.borderRadius ?? settings.codeBlockBorderRadius}px`, overflow: "hidden", marginBottom: "16px" }}>
      <div className="flex items-center" style={{ backgroundColor: `hsl(${settings.accentColor})`, borderBottom: `1px solid hsl(${settings.borderColor})` }}>
        {tabs.map((tab: any, i: number) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding: "8px 14px", fontSize: "12px", fontFamily: codeFont,
            fontWeight: active === i ? 600 : 400,
            color: active === i ? `hsl(${settings.primaryColor})` : `hsl(${settings.mutedForegroundColor})`,
            borderBottom: active === i ? `2px solid hsl(${settings.primaryColor})` : "2px solid transparent",
            background: "none", cursor: "pointer",
          }}>{tab.label}</button>
        ))}
        <button onClick={() => onChange({ tabs: [...tabs, { label: "New", language: "", code: "" }] })}
          className="ml-1" style={{ color: `hsl(${settings.mutedForegroundColor})`, fontSize: "12px" }}>+</button>
      </div>
      {tabs[active] && (
        <div style={{ backgroundColor: `hsl(${bs.backgroundColor || settings.codeBlockBg})`, padding: "12px" }}>
          <div className="flex gap-2 mb-2">
            <input className="bg-transparent outline-none" style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})` }}
              value={tabs[active].label} onChange={(e) => updateTab(active, { label: e.target.value })} placeholder="Label" />
            <input className="bg-transparent outline-none" style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})` }}
              value={tabs[active].language || ""} onChange={(e) => updateTab(active, { language: e.target.value })} placeholder="language" />
          </div>
          <textarea className="w-full bg-transparent outline-none resize-none" style={{ fontFamily: codeFont, fontSize: `${bs.fontSize ?? (settings.baseFontSize - 1)}px`, minHeight: "60px" }}
            value={tabs[active].code || ""} onChange={(e) => updateTab(active, { code: e.target.value })} placeholder="// Code..."
            rows={Math.max(3, (tabs[active].code || "").split("\n").length)} />
          {tabs.length > 1 && (
            <button onClick={() => { const newTabs = tabs.filter((_: any, idx: number) => idx !== active); setActive(Math.min(active, newTabs.length - 1)); onChange({ tabs: newTabs }); }}
              style={{ fontSize: "11px", color: `hsl(${settings.mutedForegroundColor})`, marginTop: "4px" }}>Remove tab</button>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockEditor;
