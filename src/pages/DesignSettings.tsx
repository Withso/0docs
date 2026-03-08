import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDesignSettings, defaultDesignSettings } from "@/hooks/use-design-settings";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Save, RotateCcw, Type, AlignLeft, Code, ImageIcon,
  Film, Youtube, ListOrdered, List, StickyNote, AlertCircle, Layout, Sidebar, Palette,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

// ─── Color field ─────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-7 h-7 rounded border cursor-pointer bg-transparent shrink-0"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-[130px] text-xs h-7 font-mono" />
      </div>
    </div>
  );
}

// ─── Nav sections ────────────────────────────────────
type NavSection = "global" | "colors" | "layout" | "sidebar" | BlockKey;

const navItems: { key: NavSection; label: string; icon: typeof Type; group: string }[] = [
  { key: "global", label: "Typography", icon: Type, group: "Global" },
  { key: "colors", label: "Colors", icon: Palette, group: "Global" },
  { key: "layout", label: "Layout", icon: Layout, group: "Global" },
  { key: "sidebar", label: "Sidebar", icon: Sidebar, group: "Global" },
  ...blockSections.map((b) => ({ key: b.key as NavSection, label: b.label, icon: b.icon, group: "Blocks" })),
];

// ─── Main Page ───────────────────────────────────────
const DesignSettingsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { settings, loading, saving, saveSettings, resetSettings } = useDesignSettings(projectId);
  const [local, setLocal] = useState<DS>(defaultDesignSettings);
  const [activeNav, setActiveNav] = useState<NavSection>("global");
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (!loading) setLocal(settings);
  }, [settings, loading]);

  useEffect(() => {
    if (!projectId) return;
    supabase.from("projects").select("name").eq("id", projectId).single().then(({ data }) => {
      if (data) setProjectName(data.name);
    });
  }, [projectId]);

  const update = <K extends keyof DS>(key: K, value: DS[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const updateBlockStyle = (block: BlockKey, key: keyof BlockStyleSettings, value: any) => {
    setLocal((prev) => ({
      ...prev,
      blockStyles: {
        ...prev.blockStyles,
        [block]: { ...prev.blockStyles[block], [key]: value },
      },
    }));
  };

  const hasChanges = JSON.stringify(local) !== JSON.stringify(settings);

  const handleSave = async () => {
    await saveSettings(local);
    toast({ title: "Design settings saved" });
  };

  const handleReset = () => {
    setLocal(defaultDesignSettings);
    resetSettings();
    toast({ title: "Design settings reset to defaults" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50 shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/builder/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground text-sm">{projectName}</span>
            <span className="text-muted-foreground text-sm">/ Design Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
            <Button size="sm" disabled={!hasChanges || saving} onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full">
        {/* Left nav */}
        <aside className="w-[220px] shrink-0 border-r py-6 px-4 overflow-y-auto">
          {["Global", "Blocks"].map((group) => (
            <div key={group} className="mb-4">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-2">
                {group}
              </div>
              <nav className="space-y-0.5">
                {navItems
                  .filter((n) => n.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveNav(item.key)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                          isActive
                            ? "bg-secondary text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
              </nav>
            </div>
          ))}
        </aside>

        {/* Controls */}
        <div className="w-[360px] shrink-0 border-r overflow-y-auto">
          <ScrollArea className="h-[calc(100vh-48px)]">
            <div className="p-6 space-y-5">
              {activeNav === "global" && <TypographyControls local={local} update={update} />}
              {activeNav === "colors" && <ColorControls local={local} update={update} />}
              {activeNav === "layout" && <LayoutControls local={local} update={update} />}
              {activeNav === "sidebar" && <SidebarControls local={local} update={update} />}
              {blockSections.some((b) => b.key === activeNav) && (
                <BlockControls
                  blockKey={activeNav as BlockKey}
                  local={local}
                  updateBlockStyle={updateBlockStyle}
                  update={update}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Live preview */}
        <div className="flex-1 overflow-y-auto">
          <ScrollArea className="h-[calc(100vh-48px)]">
            <div className="p-8">
              <LivePreview settings={local} activeSection={activeNav} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

// ─── Typography Controls ─────────────────────────────
function TypographyControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <h3 className="text-sm font-semibold text-foreground">Typography</h3>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Heading Font</Label>
        <Select value={local.headingFont} onValueChange={(v) => update("headingFont", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{fontOptions.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Body Font</Label>
        <Select value={local.bodyFont} onValueChange={(v) => update("bodyFont", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{fontOptions.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Code Font</Label>
        <Select value={local.codeFont} onValueChange={(v) => update("codeFont", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{codeFontOptions.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Heading Weight</Label>
        <Select value={local.headingWeight} onValueChange={(v) => update("headingWeight", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{weightOptions.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Base Font Size: {local.baseFontSize}px</Label>
        <Slider value={[local.baseFontSize]} onValueChange={([v]) => update("baseFontSize", v)} min={12} max={20} step={1} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Heading Size: {local.headingFontSize}px</Label>
        <Slider value={[local.headingFontSize]} onValueChange={([v]) => update("headingFontSize", v)} min={14} max={32} step={1} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Line Height: {local.lineHeight}</Label>
        <Slider value={[local.lineHeight]} onValueChange={([v]) => update("lineHeight", v)} min={1.2} max={2.2} step={0.1} />
      </div>
    </>
  );
}

// ─── Color Controls ──────────────────────────────────
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
  return (
    <>
      <h3 className="text-sm font-semibold text-foreground">Colors</h3>
      {colors.map((c) => (
        <ColorField key={c.key} label={c.label} value={local[c.key] as string} onChange={(v) => update(c.key, v as any)} />
      ))}
    </>
  );
}

// ─── Layout Controls ─────────────────────────────────
function LayoutControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <h3 className="text-sm font-semibold text-foreground">Layout</h3>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Content Width: {local.contentMaxWidth}px</Label>
        <Slider value={[local.contentMaxWidth]} onValueChange={([v]) => update("contentMaxWidth", v)} min={500} max={900} step={10} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Sidebar Width: {local.sidebarWidth}px</Label>
        <Slider value={[local.sidebarWidth]} onValueChange={([v]) => update("sidebarWidth", v)} min={180} max={320} step={10} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Paragraph Spacing: {local.paragraphSpacing}px</Label>
        <Slider value={[local.paragraphSpacing]} onValueChange={([v]) => update("paragraphSpacing", v)} min={8} max={32} step={2} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Rounded Images</Label>
        <Switch checked={local.imageRounded} onCheckedChange={(v) => update("imageRounded", v)} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Code Border Radius: {local.codeBlockBorderRadius}px</Label>
        <Slider value={[local.codeBlockBorderRadius]} onValueChange={([v]) => update("codeBlockBorderRadius", v)} min={0} max={16} step={1} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Note Border Width: {local.noteBorderWidth}px</Label>
        <Slider value={[local.noteBorderWidth]} onValueChange={([v]) => update("noteBorderWidth", v)} min={1} max={6} step={1} />
      </div>
    </>
  );
}

// ─── Sidebar Controls ────────────────────────────────
function SidebarControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <h3 className="text-sm font-semibold text-foreground">Sidebar</h3>
      <ColorField label="Background" value={local.sidebarBg} onChange={(v) => update("sidebarBg", v)} />
      <ColorField label="Text Color" value={local.sidebarTextColor} onChange={(v) => update("sidebarTextColor", v)} />
      <ColorField label="Active Color" value={local.sidebarActiveColor} onChange={(v) => update("sidebarActiveColor", v)} />
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Font Size: {local.sidebarFontSize}px</Label>
        <Slider value={[local.sidebarFontSize]} onValueChange={([v]) => update("sidebarFontSize", v)} min={11} max={16} step={1} />
      </div>
    </>
  );
}

// ─── Block Controls ──────────────────────────────────
function BlockControls({
  blockKey,
  local,
  updateBlockStyle,
  update,
}: {
  blockKey: BlockKey;
  local: DS;
  updateBlockStyle: (block: BlockKey, key: keyof BlockStyleSettings, value: any) => void;
  update: <K extends keyof DS>(k: K, v: DS[K]) => void;
}) {
  const bs = local.blockStyles[blockKey];
  const label = blockSections.find((b) => b.key === blockKey)?.label || blockKey;

  const resolvedColor = bs.color || local.foregroundColor;
  const resolvedBg = bs.backgroundColor || (blockKey === "code_block" ? local.codeBlockBg : blockKey === "note" ? local.noteBg : blockKey === "callout" ? local.accentColor : "");
  const resolvedBorder = bs.borderColor || (blockKey === "note" ? local.noteBorderColor : local.borderColor);
  const resolvedFont = bs.fontFamily || (blockKey === "heading" ? local.headingFont : blockKey === "code_block" ? local.codeFont : local.bodyFont);
  const resolvedSize = bs.fontSize || (blockKey === "heading" ? local.headingFontSize : local.baseFontSize);
  const resolvedWeight = bs.fontWeight || (blockKey === "heading" ? local.headingWeight : "400");
  const resolvedRadius = bs.borderRadius ?? (blockKey === "code_block" ? local.codeBlockBorderRadius : 8);
  const resolvedPadding = bs.padding ?? (["code_block", "note", "callout"].includes(blockKey) ? 16 : 0);

  return (
    <>
      <h3 className="text-sm font-semibold text-foreground">{label} Block</h3>
      <p className="text-xs text-muted-foreground">Customize how {label.toLowerCase()} blocks appear. Leave empty to use global defaults.</p>
      <Separator />

      <ColorField label="Text Color" value={resolvedColor} onChange={(v) => updateBlockStyle(blockKey, "color", v)} />

      {["code_block", "note", "callout"].includes(blockKey) && (
        <ColorField label="Background" value={resolvedBg} onChange={(v) => updateBlockStyle(blockKey, "backgroundColor", v)} />
      )}

      {["note", "callout", "code_block"].includes(blockKey) && (
        <ColorField label="Border" value={resolvedBorder} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />
      )}

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Font</Label>
        <Select value={resolvedFont} onValueChange={(v) => updateBlockStyle(blockKey, "fontFamily", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(blockKey === "code_block" ? codeFontOptions : fontOptions).map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Font Size: {resolvedSize}px</Label>
        <Slider value={[resolvedSize]} onValueChange={([v]) => updateBlockStyle(blockKey, "fontSize", v)} min={10} max={32} step={1} />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Font Weight</Label>
        <Select value={resolvedWeight} onValueChange={(v) => updateBlockStyle(blockKey, "fontWeight", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{weightOptions.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {["code_block", "note", "callout", "image", "video", "youtube"].includes(blockKey) && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Border Radius: {resolvedRadius}px</Label>
          <Slider value={[resolvedRadius]} onValueChange={([v]) => updateBlockStyle(blockKey, "borderRadius", v)} min={0} max={20} step={1} />
        </div>
      )}

      {["code_block", "note", "callout"].includes(blockKey) && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Padding: {resolvedPadding}px</Label>
          <Slider value={[resolvedPadding]} onValueChange={([v]) => updateBlockStyle(blockKey, "padding", v)} min={4} max={32} step={2} />
        </div>
      )}
    </>
  );
}

// ─── Live Preview ────────────────────────────────────
function LivePreview({ settings: s, activeSection }: { settings: DS; activeSection: NavSection }) {
  const containerStyle: React.CSSProperties = {
    maxWidth: `${s.contentMaxWidth}px`,
    fontFamily: `'${s.bodyFont}', -apple-system, BlinkMacSystemFont, sans-serif`,
    fontSize: `${s.baseFontSize}px`,
    lineHeight: s.lineHeight,
    color: `hsl(${s.foregroundColor})`,
    backgroundColor: `hsl(${s.backgroundColor})`,
    borderRadius: "12px",
    border: `1px solid hsl(${s.borderColor})`,
    overflow: "hidden",
  };

  const getBlockStyle = (key: BlockKey): React.CSSProperties => {
    const bs = s.blockStyles[key];
    return {
      color: bs.color ? `hsl(${bs.color})` : undefined,
      backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined,
      fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : undefined,
      fontSize: bs.fontSize ? `${bs.fontSize}px` : undefined,
      fontWeight: (bs.fontWeight as any) || undefined,
      borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : undefined,
      padding: bs.padding != null ? `${bs.padding}px` : undefined,
      borderColor: bs.borderColor ? `hsl(${bs.borderColor})` : undefined,
    };
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: `'${s.headingFont}', sans-serif`,
    fontWeight: s.headingWeight as any,
    fontSize: `${s.headingFontSize + 6}px`,
    marginBottom: "8px",
    ...getBlockStyle("heading"),
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontFamily: `'${s.headingFont}', sans-serif`,
    fontWeight: s.headingWeight as any,
    fontSize: `${s.headingFontSize}px`,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    ...getBlockStyle("heading"),
  };

  const highlight = (key: NavSection) =>
    activeSection === key ? { outline: `2px solid hsl(${s.linkColor})`, outlineOffset: "4px", borderRadius: "6px" } : {};

  return (
    <div style={containerStyle}>
      {/* Mock header */}
      <div style={{ borderBottom: `1px solid hsl(${s.borderColor})`, padding: "12px 24px" }}>
        <span style={{ fontWeight: 600, fontSize: "14px" }}>My Documentation</span>
      </div>

      <div style={{ display: "flex" }}>
        {/* Mock sidebar */}
        <div
          style={{
            width: `${s.sidebarWidth}px`,
            padding: "24px 16px",
            borderRight: `1px solid hsl(${s.borderColor})`,
            backgroundColor: `hsl(${s.sidebarBg})`,
            flexShrink: 0,
            ...highlight("sidebar"),
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: `hsl(${s.sidebarTextColor})`, marginBottom: "8px" }}>
            Pages
          </div>
          {["Getting Started", "Installation", "Configuration", "API Reference"].map((page, i) => (
            <div
              key={page}
              style={{
                fontSize: `${s.sidebarFontSize}px`,
                padding: "4px 8px",
                borderRadius: "4px",
                color: i === 0 ? `hsl(${s.sidebarActiveColor})` : `hsl(${s.sidebarTextColor})`,
                fontWeight: i === 0 ? 500 : 400,
                backgroundColor: i === 0 ? `hsl(${s.accentColor})` : "transparent",
                cursor: "pointer",
                marginBottom: "2px",
              }}
            >
              {page}
            </div>
          ))}
        </div>

        {/* Mock content */}
        <div style={{ flex: 1, padding: "32px", maxWidth: `${s.contentMaxWidth}px` }}>
          {/* Page title */}
          <div style={{ ...headingStyle, ...highlight("global") }}>
            Getting Started
          </div>
          <p style={{ color: `hsl(${s.mutedForegroundColor})`, marginBottom: `${s.paragraphSpacing}px`, fontSize: `${s.baseFontSize}px` }}>
            Learn how to set up and configure your documentation project.
          </p>

          {/* Heading block */}
          <div style={{ ...sectionHeadingStyle, marginTop: "24px", ...highlight("heading") }}>
            Overview
            <span style={{ flex: 1, height: "1px", backgroundColor: `hsl(${s.sectionLineColor})`, opacity: 0.5 }} />
          </div>

          {/* Paragraph block */}
          <p style={{ marginBottom: `${s.paragraphSpacing}px`, ...getBlockStyle("paragraph"), ...highlight("paragraph") }}>
            Welcome to the documentation builder. This platform lets you create beautiful, customizable documentation sites. 
            You can add various types of content blocks including text, code snippets, images, videos, and more. 
            Each block is fully customizable through the design settings.
          </p>

          {/* Code block */}
          <div
            style={{
              backgroundColor: `hsl(${s.codeBlockBg})`,
              borderRadius: `${s.codeBlockBorderRadius}px`,
              border: `1px solid hsl(${s.borderColor})`,
              padding: "16px",
              marginBottom: `${s.paragraphSpacing}px`,
              fontFamily: `'${s.codeFont}', monospace`,
              fontSize: `${s.baseFontSize - 1}px`,
              ...getBlockStyle("code_block"),
              ...highlight("code_block"),
            }}
          >
            <div style={{ fontSize: "11px", color: `hsl(${s.mutedForegroundColor})`, marginBottom: "8px" }}>typescript</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{`import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)`}</pre>
          </div>

          {/* Note block */}
          <div
            style={{
              backgroundColor: `hsl(${s.noteBg})`,
              borderLeft: `${s.noteBorderWidth}px solid hsl(${s.noteBorderColor})`,
              borderRadius: "0 8px 8px 0",
              padding: "12px 16px",
              marginBottom: `${s.paragraphSpacing}px`,
              fontSize: `${s.baseFontSize - 1}px`,
              ...getBlockStyle("note"),
              ...highlight("note"),
            }}
          >
            📝 Make sure to keep your API keys secure. Never expose them in client-side code.
          </div>

          {/* Callout block */}
          <div
            style={{
              backgroundColor: `hsl(${s.accentColor})`,
              border: `1px solid hsl(${s.borderColor})`,
              borderRadius: "8px",
              padding: "16px",
              marginBottom: `${s.paragraphSpacing}px`,
              fontSize: `${s.baseFontSize}px`,
              ...getBlockStyle("callout"),
              ...highlight("callout"),
            }}
          >
            ⚡ Pro tip: Use environment variables to manage different configurations for development and production.
          </div>

          {/* Ordered list */}
          <div style={{ marginBottom: `${s.paragraphSpacing}px`, ...highlight("ordered_list") }}>
            <div style={{ ...sectionHeadingStyle, fontSize: `${s.headingFontSize - 2}px` }}>
              Installation Steps
              <span style={{ flex: 1, height: "1px", backgroundColor: `hsl(${s.sectionLineColor})`, opacity: 0.5 }} />
            </div>
            <ol style={{ margin: 0, paddingLeft: "24px", ...getBlockStyle("ordered_list") }}>
              <li style={{ marginBottom: "6px" }}>Clone the repository from GitHub</li>
              <li style={{ marginBottom: "6px" }}>Install dependencies with npm install</li>
              <li style={{ marginBottom: "6px" }}>Configure your environment variables</li>
              <li style={{ marginBottom: "6px" }}>Start the development server</li>
            </ol>
          </div>

          {/* Unordered list */}
          <div style={{ marginBottom: `${s.paragraphSpacing}px`, ...highlight("unordered_list") }}>
            <div style={{ ...sectionHeadingStyle, fontSize: `${s.headingFontSize - 2}px` }}>
              Features
              <span style={{ flex: 1, height: "1px", backgroundColor: `hsl(${s.sectionLineColor})`, opacity: 0.5 }} />
            </div>
            <ul style={{ margin: 0, paddingLeft: "24px", listStyleType: "disc", ...getBlockStyle("unordered_list") }}>
              <li style={{ marginBottom: "6px" }}>Visual documentation builder</li>
              <li style={{ marginBottom: "6px" }}>Customizable design system</li>
              <li style={{ marginBottom: "6px" }}>Real-time collaboration</li>
              <li style={{ marginBottom: "6px" }}>SEO-friendly output</li>
            </ul>
          </div>

          {/* Image block */}
          <div style={{ marginBottom: `${s.paragraphSpacing}px`, ...highlight("image") }}>
            <div
              style={{
                borderRadius: s.imageRounded ? "8px" : "0",
                border: `1px solid hsl(${s.borderColor})`,
                overflow: "hidden",
                backgroundColor: `hsl(${s.mutedColor})`,
                height: "160px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...getBlockStyle("image"),
              }}
            >
              <ImageIcon style={{ width: "32px", height: "32px", color: `hsl(${s.mutedForegroundColor})` }} />
            </div>
            <p style={{ fontSize: "12px", color: `hsl(${s.mutedForegroundColor})`, marginTop: "4px" }}>
              Example image with caption
            </p>
          </div>

          {/* Video / YouTube block */}
          <div style={{ marginBottom: `${s.paragraphSpacing}px`, ...highlight("youtube") }}>
            <div
              style={{
                borderRadius: `${s.blockStyles.youtube?.borderRadius ?? 8}px`,
                border: `1px solid hsl(${s.borderColor})`,
                overflow: "hidden",
                backgroundColor: `hsl(${s.mutedColor})`,
                aspectRatio: "16/9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...getBlockStyle("youtube"),
              }}
            >
              <div style={{ textAlign: "center" }}>
                <Youtube style={{ width: "40px", height: "40px", color: `hsl(${s.mutedForegroundColor})`, marginBottom: "8px" }} />
                <p style={{ fontSize: "12px", color: `hsl(${s.mutedForegroundColor})` }}>YouTube Video Embed</p>
              </div>
            </div>
          </div>

          {/* Video block */}
          <div style={{ marginBottom: `${s.paragraphSpacing}px`, ...highlight("video") }}>
            <div
              style={{
                borderRadius: `${s.blockStyles.video?.borderRadius ?? 8}px`,
                border: `1px solid hsl(${s.borderColor})`,
                overflow: "hidden",
                backgroundColor: `hsl(${s.mutedColor})`,
                height: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...getBlockStyle("video"),
              }}
            >
              <Film style={{ width: "32px", height: "32px", color: `hsl(${s.mutedForegroundColor})` }} />
            </div>
            <p style={{ fontSize: "12px", color: `hsl(${s.mutedForegroundColor})`, marginTop: "4px" }}>
              Video player placeholder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesignSettingsPage;
