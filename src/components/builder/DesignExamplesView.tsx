import { useState, useRef, useEffect } from "react";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import { defaultDesignSettings } from "@/hooks/use-design-settings";
import DocBlockRenderer from "@/components/docs/DocBlockRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Type, AlignLeft, Code, ImageIcon, Film, Youtube, ListOrdered, List,
  StickyNote, AlertCircle, Layout, Sidebar, Palette,
} from "lucide-react";

// Re-use helpers from DesignPanel
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Helpers ─────────────────────────────────────────
function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s2 = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h2 = 0;
  if (max === r) h2 = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h2 = ((b - r) / d + 2) * 60;
  else h2 = ((r - g) / d + 4) * 60;
  return `${Math.round(h2)} ${Math.round(s2 * 100)}% ${Math.round(l * 100)}%`;
}

const fontOptions = [
  "Inter", "System UI", "Georgia", "Merriweather", "Lora", "Playfair Display",
  "Roboto", "Open Sans", "Nunito", "DM Sans", "Space Grotesk", "Outfit", "Plus Jakarta Sans",
];
const codeFontOptions = ["JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Cascadia Code", "monospace"];
const weightOptions = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
];

// ─── Small Controls ──────────────────────────────────
function SliderField({ label, value, onChange, min, max, step, unit = "px" }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded">{value}{unit}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-[11px] font-medium text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input type="color" value={hslToHex(value)} onChange={(e) => onChange(hexToHsl(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          <div className="w-7 h-7 rounded-lg border border-border shadow-sm cursor-pointer" style={{ backgroundColor: `hsl(${value})` }} />
        </div>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-[100px] text-[10px] h-7 font-mono bg-muted/50 border-0 focus-visible:ring-1" />
      </div>
    </div>
  );
}

function FontSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 focus:ring-1"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((f) => <SelectItem key={f} value={f} className="text-xs" style={{ fontFamily: f }}>{f}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function WeightSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 focus:ring-1"><SelectValue /></SelectTrigger>
      <SelectContent>
        {weightOptions.map((w) => <SelectItem key={w.value} value={w.value} className="text-xs">{w.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ─── Sample Blocks ───────────────────────────────────
const sampleBlocks: Record<string, { type: string; content: any }> = {
  heading: { type: "heading", content: { text: "Getting Started with DocBuilder" } },
  paragraph: { type: "paragraph", content: { text: "DocBuilder is a powerful documentation platform that helps you create beautiful, organized docs for your projects. Customize every aspect of your documentation's appearance using the design settings below." } },
  code_block: { type: "code_block", content: { language: "typescript", code: `import { createClient } from '@supabase/supabase-js'\n\nconst supabase = createClient(\n  process.env.SUPABASE_URL,\n  process.env.SUPABASE_KEY\n)` } },
  image: { type: "image", content: { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=300&fit=crop", alt: "Code on a screen — sample image block" } },
  video: { type: "video", content: { url: "" } },
  youtube: { type: "youtube", content: { videoId: "dQw4w9WgXcQ", title: "Sample YouTube Embed" } },
  ordered_list: { type: "ordered_list", content: { items: ["Install the package from npm", "Configure your project settings", "Start building your documentation"] } },
  unordered_list: { type: "unordered_list", content: { items: ["Fully customizable design system", "Real-time live preview", "OpenAPI import support"] } },
  note: { type: "note", content: { text: "This is a note block. Use it to highlight important information that readers should pay attention to." } },
  callout: { type: "callout", content: { text: "Callout blocks are great for tips, warnings, or any content you want to draw special attention to." } },
};

type BlockKey = keyof DS["blockStyles"];

// ─── Nav categories ──────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: typeof Type;
  group: "global" | "block";
}

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
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const scrollTo = (id: string) => {
    setActiveNav(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const makeFakeBlock = (type: string) => ({
    id: `sample-${type}`,
    section_id: "sample",
    type,
    content: sampleBlocks[type]?.content || {},
    order_index: 0,
  });

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: Nav sidebar */}
      <aside className="w-[200px] shrink-0 border-r bg-background flex flex-col">
        <div className="px-3 py-3 border-b flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">Style Guide</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg gap-1 px-2" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px] rounded-lg gap-1 bg-foreground text-background hover:bg-foreground/90 px-2"
              disabled={!hasChanges || saving}
              onClick={handleSave}
            >
              <Save className="h-3 w-3" /> {saving ? "…" : "Save"}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-2">
            <div className="px-3 mb-1">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Global</span>
            </div>
            {navItems.filter((n) => n.group === "global").map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 flex items-center gap-2 text-[12px] transition-colors",
                  activeNav === item.id
                    ? "text-foreground font-medium bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            ))}

            <div className="px-3 mt-4 mb-1">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Block Styles</span>
            </div>
            {navItems.filter((n) => n.group === "block").map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 flex items-center gap-2 text-[12px] transition-colors",
                  activeNav === item.id
                    ? "text-foreground font-medium bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main: Example blocks with inline controls */}
      <ScrollArea className="flex-1">
        <div className="max-w-[760px] mx-auto px-8 py-8">

          {/* ── Typography ── */}
          <div ref={(el) => { sectionRefs.current["typography"] = el; }} className="mb-12">
            <SectionHeader title="Typography" description="Heading, body, and code fonts with sizing controls" />
            <div className="grid grid-cols-2 gap-6 mb-6">
              <FieldRow label="Heading Font"><FontSelect value={local.headingFont} onChange={(v) => update("headingFont", v)} options={fontOptions} /></FieldRow>
              <FieldRow label="Body Font"><FontSelect value={local.bodyFont} onChange={(v) => update("bodyFont", v)} options={fontOptions} /></FieldRow>
              <FieldRow label="Code Font"><FontSelect value={local.codeFont} onChange={(v) => update("codeFont", v)} options={codeFontOptions} /></FieldRow>
              <FieldRow label="Heading Weight"><WeightSelect value={local.headingWeight} onChange={(v) => update("headingWeight", v)} /></FieldRow>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <SliderField label="Base Font Size" value={local.baseFontSize} onChange={(v) => update("baseFontSize", v)} min={12} max={20} step={1} />
              <SliderField label="Heading Size" value={local.headingFontSize} onChange={(v) => update("headingFontSize", v)} min={14} max={32} step={1} />
              <SliderField label="Line Height" value={local.lineHeight} onChange={(v) => update("lineHeight", v)} min={1.2} max={2.2} step={0.1} unit="" />
            </div>
            {/* Example */}
            <ExampleCard label="Typography Preview" settings={local}>
              <h3 style={{ fontFamily: `'${local.headingFont}', sans-serif`, fontWeight: local.headingWeight as any, fontSize: `${local.headingFontSize}px`, marginBottom: "8px" }}>
                Heading Example
              </h3>
              <p style={{ fontFamily: `'${local.bodyFont}', sans-serif`, fontSize: `${local.baseFontSize}px`, lineHeight: local.lineHeight, color: `hsl(${local.foregroundColor})` }}>
                Body text using your selected font. This shows how paragraph content will appear in your documentation with the current typography settings.
              </p>
              <pre style={{ fontFamily: `'${local.codeFont}', monospace`, fontSize: `${local.baseFontSize - 1}px`, backgroundColor: `hsl(${local.codeBlockBg})`, padding: "12px", borderRadius: `${local.codeBlockBorderRadius}px`, marginTop: "12px" }}>
                <code>{`const example = "inline code font"`}</code>
              </pre>
            </ExampleCard>
          </div>

          {/* ── Colors ── */}
          <div ref={(el) => { sectionRefs.current["colors"] = el; }} className="mb-12">
            <SectionHeader title="Colors" description="Global color palette for backgrounds, text, borders, and accents" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {([
                ["Background", "backgroundColor"], ["Text", "foregroundColor"], ["Primary", "primaryColor"],
                ["Primary Text", "primaryForegroundColor"], ["Muted", "mutedColor"], ["Muted Text", "mutedForegroundColor"],
                ["Accent", "accentColor"], ["Border", "borderColor"], ["Links", "linkColor"],
                ["Section Line", "sectionLineColor"], ["Code Block BG", "codeBlockBg"],
                ["Note BG", "noteBg"], ["Note Border", "noteBorderColor"],
              ] as [string, keyof DS][]).map(([label, key]) => (
                <ColorField key={key} label={label} value={local[key] as string} onChange={(v) => update(key, v as any)} />
              ))}
            </div>
            {/* Color swatches preview */}
            <div className="flex gap-2 mt-6 flex-wrap">
              {["backgroundColor", "foregroundColor", "primaryColor", "accentColor", "mutedColor", "borderColor", "linkColor"].map((k) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{ backgroundColor: `hsl(${local[k as keyof DS]})` }} />
                  <span className="text-[9px] text-muted-foreground">{k.replace("Color", "").replace("ground", "")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Layout ── */}
          <div ref={(el) => { sectionRefs.current["layout"] = el; }} className="mb-12">
            <SectionHeader title="Layout" description="Content width, spacing, and structural settings" />
            <div className="grid grid-cols-2 gap-6 mb-6">
              <SliderField label="Content Width" value={local.contentMaxWidth} onChange={(v) => update("contentMaxWidth", v)} min={500} max={900} step={10} />
              <SliderField label="Sidebar Width" value={local.sidebarWidth} onChange={(v) => update("sidebarWidth", v)} min={180} max={320} step={10} />
              <SliderField label="Page Title Size" value={local.pageTitleSize} onChange={(v) => update("pageTitleSize", v)} min={18} max={42} step={1} />
              <SliderField label="Section Spacing" value={local.sectionSpacing} onChange={(v) => update("sectionSpacing", v)} min={16} max={80} step={4} />
              <SliderField label="Paragraph Spacing" value={local.paragraphSpacing} onChange={(v) => update("paragraphSpacing", v)} min={8} max={32} step={2} />
              <SliderField label="Code Border Radius" value={local.codeBlockBorderRadius} onChange={(v) => update("codeBlockBorderRadius", v)} min={0} max={16} step={1} />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={local.imageRounded} onCheckedChange={(v) => update("imageRounded", v)} />
                <Label className="text-[11px] text-muted-foreground">Rounded Images</Label>
              </div>
              <SliderField label="Note Border Width" value={local.noteBorderWidth} onChange={(v) => update("noteBorderWidth", v)} min={1} max={6} step={1} />
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div ref={(el) => { sectionRefs.current["sidebar"] = el; }} className="mb-12">
            <SectionHeader title="Sidebar" description="Navigation sidebar appearance and behavior" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6">
              <ColorField label="Background" value={local.sidebarBg} onChange={(v) => update("sidebarBg", v)} />
              <ColorField label="Text Color" value={local.sidebarTextColor} onChange={(v) => update("sidebarTextColor", v)} />
              <ColorField label="Active Color" value={local.sidebarActiveColor} onChange={(v) => update("sidebarActiveColor", v)} />
              <ColorField label="Indicator Color" value={local.sidebarIndicatorColor} onChange={(v) => update("sidebarIndicatorColor", v)} />
            </div>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <SliderField label="Font Size" value={local.sidebarFontSize} onChange={(v) => update("sidebarFontSize", v)} min={11} max={16} step={1} />
              <SliderField label="Page Gap" value={local.sidebarPageGap} onChange={(v) => update("sidebarPageGap", v)} min={0} max={12} step={1} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={local.sidebarShowSectionTracker} onCheckedChange={(v) => update("sidebarShowSectionTracker", v)} />
              <Label className="text-[11px] text-muted-foreground">Section Scroll Tracker</Label>
            </div>
            {/* Sidebar preview */}
            <ExampleCard label="Sidebar Preview" settings={local}>
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
            </ExampleCard>
          </div>

          {/* ── Block Styles ── */}
          {navItems.filter((n) => n.group === "block").map((item) => {
            const blockKey = item.id as BlockKey;
            const sample = sampleBlocks[blockKey];
            if (!sample && blockKey !== "video" && blockKey !== "youtube") return null;

            return (
              <div key={item.id} ref={(el) => { sectionRefs.current[item.id] = el; }} className="mb-12">
                <SectionHeader title={item.label} description={`Customize the appearance of ${item.label.toLowerCase()} blocks`} />

                {/* Example block */}
                {sample && (
                  <ExampleCard label={`${item.label} Example`} settings={local}>
                    <DocBlockRenderer block={makeFakeBlock(blockKey)} settings={local} />
                  </ExampleCard>
                )}

                {/* Collapsible controls */}
                <BlockStyleControls
                  blockKey={blockKey}
                  local={local}
                  updateBlockStyle={updateBlockStyle}
                />
              </div>
            );
          })}

          <div className="h-12" />
        </div>
      </ScrollArea>
    </div>
  );
};

// ─── Sub Components ──────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5 pb-3 border-b">
      <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
      <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function ExampleCard({ label, settings, children }: { label: string; settings: DS; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{label}</span>
      <div
        className="border rounded-xl p-5"
        style={{
          backgroundColor: `hsl(${settings.backgroundColor})`,
          borderColor: `hsl(${settings.borderColor})`,
          color: `hsl(${settings.foregroundColor})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BlockStyleControls({
  blockKey,
  local,
  updateBlockStyle,
}: {
  blockKey: BlockKey;
  local: DS;
  updateBlockStyle: (block: BlockKey, key: keyof BlockStyleSettings, value: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const bs = local.blockStyles[blockKey];

  const supportsTextStyle = ["heading", "paragraph", "code_block", "ordered_list", "unordered_list", "note", "callout", "image"].includes(blockKey);
  const supportsBackground = ["code_block", "note", "callout", "image", "video", "youtube"].includes(blockKey);
  const supportsBorder = ["note", "callout", "code_block", "image", "video", "youtube"].includes(blockKey);
  const supportsRadius = ["code_block", "note", "callout", "image", "video", "youtube"].includes(blockKey);
  const supportsPadding = ["code_block", "note", "callout", "image", "video", "youtube"].includes(blockKey);

  const resolvedColor = bs.color || local.foregroundColor;
  const resolvedBg = bs.backgroundColor || (blockKey === "code_block" ? local.codeBlockBg : blockKey === "note" ? local.noteBg : blockKey === "callout" ? local.accentColor : "0 0% 100%");
  const resolvedBorder = bs.borderColor || (blockKey === "note" ? local.noteBorderColor : local.borderColor);
  const resolvedFont = bs.fontFamily || (blockKey === "heading" ? local.headingFont : blockKey === "code_block" ? local.codeFont : local.bodyFont);
  const resolvedSize = bs.fontSize || (blockKey === "heading" ? local.headingFontSize : blockKey === "image" ? local.baseFontSize - 1 : local.baseFontSize);
  const resolvedWeight = bs.fontWeight || (blockKey === "heading" ? local.headingWeight : "400");
  const resolvedRadius = bs.borderRadius ?? (blockKey === "code_block" ? local.codeBlockBorderRadius : 8);
  const resolvedPadding = bs.padding ?? (["code_block", "note", "callout"].includes(blockKey) ? 16 : 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 mt-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
        Customize {blockKey.replace("_", " ")} styles
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-2 pb-4 pl-5 border-l-2 border-muted ml-1">
          {supportsTextStyle && <ColorField label="Text Color" value={resolvedColor} onChange={(v) => updateBlockStyle(blockKey, "color", v)} />}
          {supportsBackground && <ColorField label="Background" value={resolvedBg} onChange={(v) => updateBlockStyle(blockKey, "backgroundColor", v)} />}
          {supportsBorder && <ColorField label="Border" value={resolvedBorder} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />}
          {supportsTextStyle && <FieldRow label="Font"><FontSelect value={resolvedFont} onChange={(v) => updateBlockStyle(blockKey, "fontFamily", v)} options={blockKey === "code_block" ? codeFontOptions : fontOptions} /></FieldRow>}
          {supportsTextStyle && <SliderField label="Font Size" value={resolvedSize} onChange={(v) => updateBlockStyle(blockKey, "fontSize", v)} min={10} max={32} step={1} />}
          {supportsTextStyle && <FieldRow label="Font Weight"><WeightSelect value={resolvedWeight} onChange={(v) => updateBlockStyle(blockKey, "fontWeight", v)} /></FieldRow>}
          {supportsRadius && <SliderField label="Border Radius" value={resolvedRadius} onChange={(v) => updateBlockStyle(blockKey, "borderRadius", v)} min={0} max={20} step={1} />}
          {supportsPadding && <SliderField label="Padding" value={resolvedPadding} onChange={(v) => updateBlockStyle(blockKey, "padding", v)} min={0} max={32} step={2} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default DesignExamplesView;
