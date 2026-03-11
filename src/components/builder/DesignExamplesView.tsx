import { useState, useEffect } from "react";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import { defaultDesignSettings } from "@/hooks/use-design-settings";
import DocBlockRenderer from "@/components/docs/DocBlockRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, PanelRightClose, PanelRight } from "lucide-react";
import {
  Type, AlignLeft, Code, ImageIcon, Film, Youtube, ListOrdered, List,
  StickyNote, AlertCircle, Layout, Sidebar, Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Shared Controls ─────────────────────────────────
import {
  SettingsSection, SliderField, ColorField, ToggleField,
  FontSelect, WeightSelect, ColorControls, LayoutControls,
  SidebarControls, BlockControls, fontOptions, codeFontOptions,
  blockSections, type BlockKey,
} from "@/components/builder/DesignControls";

// ─── Sample Blocks ───────────────────────────────────
const sampleBlocks: Record<string, { type: string; content: any }> = {
  heading: { type: "heading", content: { text: "Getting Started with DocBuilder" } },
  paragraph: { type: "paragraph", content: { text: "DocBuilder is a powerful documentation platform that helps you create beautiful, organized docs for your projects. Customize every aspect of your documentation's appearance using the design settings." } },
  code_block: { type: "code_block", content: { language: "typescript", code: `import { createClient } from '@supabase/supabase-js'\n\nconst supabase = createClient(\n  process.env.SUPABASE_URL,\n  process.env.SUPABASE_KEY\n)` } },
  image: { type: "image", content: { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=300&fit=crop", alt: "Code on a screen — sample image block" } },
  video: { type: "video", content: { url: "" } },
  youtube: { type: "youtube", content: { videoId: "dQw4w9WgXcQ", title: "Sample YouTube Embed" } },
  ordered_list: { type: "ordered_list", content: { items: ["Install the package from npm", "Configure your project settings", "Start building your documentation"] } },
  unordered_list: { type: "unordered_list", content: { items: ["Fully customizable design system", "Real-time live preview", "OpenAPI import support"] } },
  note: { type: "note", content: { text: "This is a note block. Use it to highlight important information that readers should pay attention to." } },
  callout: { type: "callout", content: { text: "Callout blocks are great for tips, warnings, or any content you want to draw special attention to." } },
};

// Icon map for block sections
const blockIconMap: Record<string, any> = {
  heading: Type, paragraph: AlignLeft, code_block: Code, image: ImageIcon,
  video: Film, youtube: Youtube, ordered_list: ListOrdered, unordered_list: List,
  note: StickyNote, callout: AlertCircle,
};

// ─── Nav items ───────────────────────────────────────
interface NavItem { id: string; label: string; icon: any; group: "global" | "block"; }
const navItems: NavItem[] = [
  { id: "typography", label: "Typography", icon: Type, group: "global" },
  { id: "colors", label: "Colors", icon: Palette, group: "global" },
  { id: "layout", label: "Layout", icon: Layout, group: "global" },
  { id: "sidebar", label: "Sidebar", icon: Sidebar, group: "global" },
  { id: "heading", label: "Heading", icon: Type, group: "block" },
  { id: "paragraph", label: "Paragraph", icon: AlignLeft, group: "block" },
  { id: "code_block", label: "Code Block", icon: Code, group: "block" },
  { id: "image", label: "Image", icon: ImageIcon, group: "block" },
  { id: "video", label: "Video", icon: Film, group: "block" },
  { id: "youtube", label: "YouTube", icon: Youtube, group: "block" },
  { id: "ordered_list", label: "Numbered List", icon: ListOrdered, group: "block" },
  { id: "unordered_list", label: "Bullet List", icon: List, group: "block" },
  { id: "note", label: "Note", icon: StickyNote, group: "block" },
  { id: "callout", label: "Callout", icon: AlertCircle, group: "block" },
];

// ─── Props ───────────────────────────────────────────
interface DesignExamplesViewProps {
  settings: DS;
  saving: boolean;
  saveSettings: (s: DS) => Promise<void>;
  resetSettings: () => void;
}

// ─── Main View ───────────────────────────────────────
const DesignExamplesView = ({ settings, saving, saveSettings, resetSettings }: DesignExamplesViewProps) => {
  const { toast } = useToast();
  const [local, setLocal] = useState<DS>(defaultDesignSettings);
  const [activeNav, setActiveNav] = useState("typography");
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => { setLocal(settings); }, [settings]);

  const update = <K extends keyof DS>(key: K, value: DS[K]) => setLocal((prev) => ({ ...prev, [key]: value }));
  const updateBlockStyle = (block: BlockKey, key: keyof BlockStyleSettings, value: any) => {
    setLocal((prev) => ({
      ...prev,
      blockStyles: { ...prev.blockStyles, [block]: { ...prev.blockStyles[block], [key]: value } },
    }));
  };

  const hasChanges = JSON.stringify(local) !== JSON.stringify(settings);
  const handleSave = async () => { await saveSettings(local); toast({ title: "Design settings saved" }); };
  const handleReset = () => { setLocal(defaultDesignSettings); resetSettings(); toast({ title: "Design settings reset to defaults" }); };

  const makeFakeBlock = (type: string) => ({
    id: `sample-${type}`,
    section_id: "sample",
    type,
    content: sampleBlocks[type]?.content || {},
    order_index: 0,
  });

  // Render active section content
  const renderActiveContent = () => {
    switch (activeNav) {
      case "typography":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <FontSelect label="Heading Font" value={local.headingFont} onChange={(v) => update("headingFont", v)} options={fontOptions} />
              <FontSelect label="Body Font" value={local.bodyFont} onChange={(v) => update("bodyFont", v)} options={fontOptions} />
              <FontSelect label="Code Font" value={local.codeFont} onChange={(v) => update("codeFont", v)} options={codeFontOptions} />
              <WeightSelect label="Heading Weight" value={local.headingWeight} onChange={(v) => update("headingWeight", v)} />
              <SliderField label="Base Font Size" value={local.baseFontSize} onChange={(v) => update("baseFontSize", v)} min={12} max={20} step={1} />
              <SliderField label="Heading Size" value={local.headingFontSize} onChange={(v) => update("headingFontSize", v)} min={14} max={32} step={1} />
              <SliderField label="Line Height" value={local.lineHeight} onChange={(v) => update("lineHeight", v)} min={1.2} max={2.2} step={0.1} unit="" />
            </div>
            <PreviewCard settings={local}>
              <h3 style={{ fontFamily: `'${local.headingFont}', sans-serif`, fontWeight: local.headingWeight as any, fontSize: `${local.headingFontSize}px`, marginBottom: "8px" }}>
                Heading Example
              </h3>
              <p style={{ fontFamily: `'${local.bodyFont}', sans-serif`, fontSize: `${local.baseFontSize}px`, lineHeight: local.lineHeight, color: `hsl(${local.foregroundColor})` }}>
                Body text using your selected font. This shows how paragraph content will appear in your documentation.
              </p>
              <pre style={{ fontFamily: `'${local.codeFont}', monospace`, fontSize: `${local.baseFontSize - 1}px`, backgroundColor: `hsl(${local.codeBlockBg})`, padding: "12px", borderRadius: `${local.codeBlockBorderRadius}px`, marginTop: "12px" }}>
                <code>{`const example = "inline code font"`}</code>
              </pre>
            </PreviewCard>
          </div>
        );
      case "colors":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <ColorControls local={local} update={update} />
            </div>
            <PreviewCard settings={local}>
              <div className="flex gap-2 flex-wrap">
                {["backgroundColor", "foregroundColor", "primaryColor", "accentColor", "mutedColor", "borderColor", "linkColor"].map((k) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-lg shadow-sm" style={{ backgroundColor: `hsl(${local[k as keyof DS]})`, boxShadow: 'inset 0 0 0 1px hsl(var(--foreground) / 0.08)' }} />
                    <span className="text-[9px] text-muted-foreground">{k.replace("Color", "").replace("ground", "")}</span>
                  </div>
                ))}
              </div>
            </PreviewCard>
          </div>
        );
      case "layout":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <LayoutControls local={local} update={update} />
            </div>
          </div>
        );
      case "sidebar":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <SidebarControls local={local} update={update} />
            </div>
            <PreviewCard settings={local}>
              <div style={{ backgroundColor: `hsl(${local.sidebarBg})`, padding: "12px", borderRadius: "8px", width: `${Math.min(local.sidebarWidth, 260)}px` }}>
                {["Introduction", "Getting Started", "Configuration"].map((p, i) => (
                  <div key={p} style={{
                    padding: `${local.sidebarPageGap + 4}px 8px`,
                    fontSize: `${local.sidebarFontSize}px`,
                    color: i === 0 ? `hsl(${local.sidebarActiveColor})` : `hsl(${local.sidebarTextColor})`,
                    fontWeight: i === 0 ? 600 : 400,
                    borderLeft: i === 0 ? `2px solid hsl(${local.sidebarIndicatorColor})` : "2px solid transparent",
                    fontFamily: `'${local.bodyFont}', sans-serif`,
                  }}>
                    {p}
                  </div>
                ))}
              </div>
            </PreviewCard>
          </div>
        );
      default: {
        // Block styles
        const blockKey = activeNav as BlockKey;
        const sample = sampleBlocks[blockKey];
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <BlockControls blockKey={blockKey} local={local} updateBlockStyle={updateBlockStyle} />
            </div>
            {sample && (
              <PreviewCard settings={local}>
                <DocBlockRenderer block={makeFakeBlock(blockKey)} settings={local} />
              </PreviewCard>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="flex-1 flex min-h-0 relative">
      {/* Main: Preview area with controls */}
      <ScrollArea className="flex-1">
        <div className="max-w-[680px] mx-auto px-8 py-8">
          <h2 className="text-[18px] font-semibold text-foreground mb-6">
            {navItems.find(n => n.id === activeNav)?.label || "Typography"}
          </h2>
          {renderActiveContent()}
          <div className="h-12" />
        </div>
      </ScrollArea>

      {/* Right: Floating style guide panel */}
      {panelOpen && (
        <div className="shrink-0 p-2 pl-0">
          <aside
            className="w-[200px] h-full rounded-2xl flex flex-col overflow-hidden"
            style={{
              backgroundColor: "hsl(var(--background) / 0.92)",
              backdropFilter: "blur(20px)",
              border: "1px solid hsl(var(--border) / 0.5)",
              boxShadow: '0 4px 24px -4px hsl(var(--foreground) / 0.08)',
            }}
          >
            {/* Header */}
            <div className="px-3 py-3 shrink-0 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-foreground">Style Guide</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleReset}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px] rounded-lg gap-1 px-2"
                  disabled={!hasChanges || saving}
                  onClick={handleSave}
                >
                  <Save className="h-3 w-3" /> {saving ? "…" : "Save"}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="py-1 px-2">
                <div className="px-1 mb-1">
                  <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em]">Global</span>
                </div>
                {navItems.filter((n) => n.group === "global").map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-[12px] rounded-lg transition-colors",
                      activeNav === item.id
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    style={activeNav === item.id ? { backgroundColor: 'hsl(var(--foreground) / 0.06)' } : undefined}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                ))}

                <div className="px-1 mt-4 mb-1">
                  <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em]">Block Styles</span>
                </div>
                {navItems.filter((n) => n.group === "block").map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-[12px] rounded-lg transition-colors",
                      activeNav === item.id
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    style={activeNav === item.id ? { backgroundColor: 'hsl(var(--foreground) / 0.06)' } : undefined}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>
        </div>
      )}

      {/* Toggle panel button */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="fixed bottom-4 right-4 z-50 h-8 w-8 rounded-xl bg-background/90 backdrop-blur-sm shadow-platform-sm flex items-center justify-center hover:bg-muted transition-all hover:shadow-platform-md"
        style={{ border: "1px solid hsl(var(--border) / 0.5)" }}
      >
        {panelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

// ─── Preview Card ────────────────────────────────────
function PreviewCard({ settings, children }: { settings: DS; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: `hsl(${settings.backgroundColor})`,
        border: '1px solid hsl(var(--foreground) / 0.06)',
        color: `hsl(${settings.foregroundColor})`,
      }}
    >
      {children}
    </div>
  );
}

export default DesignExamplesView;
