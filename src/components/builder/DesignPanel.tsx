import { useState, useEffect } from "react";
import { useDesignSettings, defaultDesignSettings } from "@/hooks/use-design-settings";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import DocContentView from "@/components/docs/DocContentView";
import DesignExamplesView from "@/components/builder/DesignExamplesView";
import type { DesignSubMode } from "@/components/builder/BuilderHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save, RotateCcw, Type, AlignLeft, Code, ImageIcon,
  Film, Youtube, ListOrdered, List, StickyNote, AlertCircle, Layout, Sidebar, Palette,
  PanelRightClose, PanelRight, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

type BlockKey = keyof DS["blockStyles"];

const blockSections: { key: BlockKey; label: string; icon: typeof Type }[] = [
  { key: "heading", label: "Heading", icon: Type },
  { key: "paragraph", label: "Paragraph", icon: AlignLeft },
  { key: "code_block", label: "Code Block", icon: Code },
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "video", label: "Video", icon: Film },
  { key: "youtube", label: "YouTube Embed", icon: Youtube },
  { key: "ordered_list", label: "Numbered List", icon: ListOrdered },
  { key: "unordered_list", label: "Bullet List", icon: List },
  { key: "note", label: "Note", icon: StickyNote },
  { key: "callout", label: "Callout", icon: AlertCircle },
];

// ─── Refined Controls ────────────────────────────────
function SettingsSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: typeof Type; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 group">
        <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 pb-4 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
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

function SliderField({ label, value, onChange, min, max, step, unit = "px" }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded">
          {value}{unit}
        </span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="ds-slider" />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-[11px] font-medium text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={hslToHex(value)}
            onChange={(e) => onChange(hexToHsl(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div
            className="w-7 h-7 rounded-lg border border-border shadow-sm cursor-pointer"
            style={{ backgroundColor: `hsl(${value})` }}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[100px] text-[10px] h-7 font-mono bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>
    </div>
  );
}

function FontSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 focus:ring-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((f) => (
          <SelectItem key={f} value={f} className="text-xs" style={{ fontFamily: f }}>{f}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function WeightSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 focus:ring-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {weightOptions.map((w) => (
          <SelectItem key={w.value} value={w.value} className="text-xs">{w.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Color/Layout/Sidebar/Block Controls ─────────────
function ColorControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  const colors: { label: string; key: keyof DS }[] = [
    { label: "Background", key: "backgroundColor" },
    { label: "Text", key: "foregroundColor" },
    { label: "Primary", key: "primaryColor" },
    { label: "Primary Text", key: "primaryForegroundColor" },
    { label: "Muted", key: "mutedColor" },
    { label: "Muted Text", key: "mutedForegroundColor" },
    { label: "Accent", key: "accentColor" },
    { label: "Border", key: "borderColor" },
    { label: "Links", key: "linkColor" },
    { label: "Section Line", key: "sectionLineColor" },
    { label: "Code Block BG", key: "codeBlockBg" },
    { label: "Note BG", key: "noteBg" },
    { label: "Note Border", key: "noteBorderColor" },
  ];
  return <>{colors.map((c) => <ColorField key={c.key} label={c.label} value={local[c.key] as string} onChange={(v) => update(c.key, v as any)} />)}</>;
}

function LayoutControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <SliderField label="Content Width" value={local.contentMaxWidth} onChange={(v) => update("contentMaxWidth", v)} min={500} max={900} step={10} />
      <SliderField label="Sidebar Width" value={local.sidebarWidth} onChange={(v) => update("sidebarWidth", v)} min={180} max={320} step={10} />
      <SliderField label="Page Title Size" value={local.pageTitleSize} onChange={(v) => update("pageTitleSize", v)} min={18} max={42} step={1} />
      <SliderField label="Section Spacing" value={local.sectionSpacing} onChange={(v) => update("sectionSpacing", v)} min={16} max={80} step={4} />
      <SliderField label="Paragraph Spacing" value={local.paragraphSpacing} onChange={(v) => update("paragraphSpacing", v)} min={8} max={32} step={2} />
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">Rounded Images</Label>
        <Switch checked={local.imageRounded} onCheckedChange={(v) => update("imageRounded", v)} />
      </div>
      <SliderField label="Code Border Radius" value={local.codeBlockBorderRadius} onChange={(v) => update("codeBlockBorderRadius", v)} min={0} max={16} step={1} />
      <SliderField label="Note Border Width" value={local.noteBorderWidth} onChange={(v) => update("noteBorderWidth", v)} min={1} max={6} step={1} />
    </>
  );
}

function SidebarControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <ColorField label="Background" value={local.sidebarBg} onChange={(v) => update("sidebarBg", v)} />
      <ColorField label="Text Color" value={local.sidebarTextColor} onChange={(v) => update("sidebarTextColor", v)} />
      <ColorField label="Active Color" value={local.sidebarActiveColor} onChange={(v) => update("sidebarActiveColor", v)} />
      <ColorField label="Indicator Color" value={local.sidebarIndicatorColor} onChange={(v) => update("sidebarIndicatorColor", v)} />
      <SliderField label="Font Size" value={local.sidebarFontSize} onChange={(v) => update("sidebarFontSize", v)} min={11} max={16} step={1} />
      <SliderField label="Page Gap" value={local.sidebarPageGap} onChange={(v) => update("sidebarPageGap", v)} min={0} max={12} step={1} />
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">Section Scroll Tracker</Label>
        <Switch checked={local.sidebarShowSectionTracker} onCheckedChange={(v) => update("sidebarShowSectionTracker", v)} />
      </div>
    </>
  );
}

function BlockControls({
  blockKey, local, updateBlockStyle,
}: {
  blockKey: BlockKey; local: DS;
  updateBlockStyle: (block: BlockKey, key: keyof BlockStyleSettings, value: any) => void;
}) {
  const bs = local.blockStyles[blockKey];
  const label = blockSections.find((b) => b.key === blockKey)?.label || blockKey;

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
    <>
      <p className="text-[10px] text-muted-foreground">Override {label.toLowerCase()} styles. Empty = global defaults.</p>
      {supportsTextStyle && <ColorField label="Text Color" value={resolvedColor} onChange={(v) => updateBlockStyle(blockKey, "color", v)} />}
      {supportsBackground && <ColorField label="Background" value={resolvedBg} onChange={(v) => updateBlockStyle(blockKey, "backgroundColor", v)} />}
      {supportsBorder && <ColorField label="Border" value={resolvedBorder} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />}
      {supportsTextStyle && <FieldRow label="Font"><FontSelect value={resolvedFont} onChange={(v) => updateBlockStyle(blockKey, "fontFamily", v)} options={blockKey === "code_block" ? codeFontOptions : fontOptions} /></FieldRow>}
      {supportsTextStyle && <SliderField label="Font Size" value={resolvedSize} onChange={(v) => updateBlockStyle(blockKey, "fontSize", v)} min={10} max={32} step={1} />}
      {supportsTextStyle && <FieldRow label="Font Weight"><WeightSelect value={resolvedWeight} onChange={(v) => updateBlockStyle(blockKey, "fontWeight", v)} /></FieldRow>}
      {supportsRadius && <SliderField label="Border Radius" value={resolvedRadius} onChange={(v) => updateBlockStyle(blockKey, "borderRadius", v)} min={0} max={20} step={1} />}
      {supportsPadding && <SliderField label="Padding" value={resolvedPadding} onChange={(v) => updateBlockStyle(blockKey, "padding", v)} min={0} max={32} step={2} />}
    </>
  );
}

// ─── Interfaces ──────────────────────────────────────
interface DocPage { id: string; title: string; slug: string; order_index: number; }
interface DocSection { id: string; page_id: string; title: string; order_index: number; }
interface DocBlock { id: string; section_id: string; type: string; content: any; order_index: number; }

interface DesignPanelProps {
  projectId: string;
  projectName: string;
  settings: DS;
  saving: boolean;
  saveSettings: (s: DS) => Promise<void>;
  resetSettings: () => void;
  designSubMode: DesignSubMode;
}

// ─── Main Panel ──────────────────────────────────────
const DesignPanel = ({ projectId, projectName, settings, saving, saveSettings, resetSettings, designSubMode }: DesignPanelProps) => {
  const { toast } = useToast();
  const [local, setLocal] = useState<DS>(defaultDesignSettings);
  const [panelOpen, setPanelOpen] = useState(true);
  const [pages, setPages] = useState<DocPage[]>([]);
  const [activePage, setActivePage] = useState<DocPage | null>(null);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [blocks, setBlocks] = useState<DocBlock[]>([]);

  useEffect(() => { setLocal(settings); }, [settings]);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      const { data: pagesData } = await supabase.from("pages").select("*").eq("project_id", projectId).order("order_index");
      if (pagesData && pagesData.length > 0) { setPages(pagesData); setActivePage(pagesData[0]); }
    };
    load();
  }, [projectId]);

  useEffect(() => {
    if (!activePage) { setSections([]); setBlocks([]); return; }
    const load = async () => {
      const { data: secs } = await supabase.from("sections").select("*").eq("page_id", activePage.id).order("order_index");
      if (secs) {
        setSections(secs);
        if (secs.length > 0) {
          const { data: blks } = await supabase.from("blocks").select("*").in("section_id", secs.map(s => s.id)).order("order_index");
          setBlocks(blks || []);
        } else setBlocks([]);
      }
    };
    load();
  }, [activePage]);

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

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: Live preview */}
      <div className="flex-1 overflow-auto bg-muted/30">
        <DocContentView
          settings={local}
          projectName={projectName}
          pages={pages}
          activePage={activePage}
          sections={sections}
          blocks={blocks}
          onSelectPage={setActivePage}
          headerStickyTop={0}
          hideHeader
        />
      </div>

      {/* Right: Settings panel */}
      {panelOpen && (
        <aside className="w-[320px] shrink-0 border-l bg-background flex flex-col">
          <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">Customize</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Typography, colors, layout & block styles</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg gap-1" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
              <Button
                size="sm"
                className="h-7 text-[11px] rounded-lg gap-1 bg-foreground text-background hover:bg-foreground/90"
                disabled={!hasChanges || saving}
                onClick={handleSave}
              >
                <Save className="h-3 w-3" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 py-2">
              <div className="mb-1">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Global</span>
              </div>

              <SettingsSection title="Typography" icon={Type} defaultOpen>
                <FieldRow label="Heading Font"><FontSelect value={local.headingFont} onChange={(v) => update("headingFont", v)} options={fontOptions} /></FieldRow>
                <FieldRow label="Body Font"><FontSelect value={local.bodyFont} onChange={(v) => update("bodyFont", v)} options={fontOptions} /></FieldRow>
                <FieldRow label="Code Font"><FontSelect value={local.codeFont} onChange={(v) => update("codeFont", v)} options={codeFontOptions} /></FieldRow>
                <FieldRow label="Heading Weight"><WeightSelect value={local.headingWeight} onChange={(v) => update("headingWeight", v)} /></FieldRow>
                <SliderField label="Base Font Size" value={local.baseFontSize} onChange={(v) => update("baseFontSize", v)} min={12} max={20} step={1} />
                <SliderField label="Heading Size" value={local.headingFontSize} onChange={(v) => update("headingFontSize", v)} min={14} max={32} step={1} />
                <SliderField label="Line Height" value={local.lineHeight} onChange={(v) => update("lineHeight", v)} min={1.2} max={2.2} step={0.1} unit="" />
              </SettingsSection>

              <div className="border-t" />
              <SettingsSection title="Colors" icon={Palette}><ColorControls local={local} update={update} /></SettingsSection>
              <div className="border-t" />
              <SettingsSection title="Layout" icon={Layout}><LayoutControls local={local} update={update} /></SettingsSection>
              <div className="border-t" />
              <SettingsSection title="Sidebar" icon={Sidebar}><SidebarControls local={local} update={update} /></SettingsSection>

              <div className="mt-5 mb-1">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Block Styles</span>
              </div>

              {blockSections.map((item) => (
                <div key={item.key}>
                  <SettingsSection title={item.label} icon={item.icon}>
                    <BlockControls blockKey={item.key} local={local} updateBlockStyle={updateBlockStyle} />
                  </SettingsSection>
                  <div className="border-t" />
                </div>
              ))}

              <div className="h-8" />
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* Toggle panel button - floating */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="fixed bottom-4 right-4 z-50 h-8 w-8 rounded-lg border bg-background shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
      >
        {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default DesignPanel;
