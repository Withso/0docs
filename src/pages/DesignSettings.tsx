import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDesignSettings, defaultDesignSettings } from "@/hooks/use-design-settings";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import DocContentView from "@/components/docs/DocContentView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, Save, RotateCcw, Type, AlignLeft, Code, ImageIcon,
  Film, Youtube, ListOrdered, List, StickyNote, AlertCircle, Layout, Sidebar, Palette,
  Eye, PanelRightClose, PanelRight,
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-6 h-6 rounded border cursor-pointer bg-transparent shrink-0"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-[110px] text-[10px] h-6 font-mono" />
      </div>
    </div>
  );
}

interface DocPage { id: string; title: string; slug: string; order_index: number; }
interface DocSection { id: string; page_id: string; title: string; order_index: number; }
interface DocBlock { id: string; section_id: string; type: string; content: any; order_index: number; }

// ─── Main Page ───────────────────────────────────────
const DesignSettingsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { settings, loading: settingsLoading, saving, saveSettings, resetSettings } = useDesignSettings(projectId);
  const [local, setLocal] = useState<DS>(defaultDesignSettings);
  const [projectData, setProjectData] = useState<any>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  // Doc data
  const [pages, setPages] = useState<DocPage[]>([]);
  const [activePage, setActivePage] = useState<DocPage | null>(null);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [docLoading, setDocLoading] = useState(true);

  // Track which block accordion is open for highlight
  const [openAccordionValues, setOpenAccordionValues] = useState<string[]>([]);
  const highlightedBlockType = blockSections.find((b) => openAccordionValues.includes(`block-${b.key}`))?.key || null;

  useEffect(() => { if (!settingsLoading) setLocal(settings); }, [settings, settingsLoading]);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      const { data: proj } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (proj) {
        setProjectData(proj);
        const { data: pagesData } = await supabase.from("pages").select("*").eq("project_id", projectId).order("order_index");
        if (pagesData && pagesData.length > 0) { setPages(pagesData); setActivePage(pagesData[0]); }
      }
      setDocLoading(false);
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

  if (settingsLoading || docLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header bar */}
      <header className="border-b bg-background sticky top-0 z-[60] shrink-0">
        <div className="px-4 h-11 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/builder/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground text-sm">{projectData?.name}</span>
            <span className="text-muted-foreground text-xs">/ Design Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPanelOpen(!panelOpen)} title={panelOpen ? "Hide panel" : "Show panel"}>
              {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
            <Button size="sm" className="h-7 text-xs" disabled={!hasChanges || saving} onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`/docs/${projectData?.slug}`, "_blank")}>
              <Eye className="h-3 w-3 mr-1" /> Preview
            </Button>
          </div>
        </div>
      </header>

      {/* Split layout: preview + settings panel */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Live documentation preview */}
        <div className="flex-1 overflow-auto">
          <DocContentView
            settings={local}
            projectName={projectData?.name || ""}
            pages={pages}
            activePage={activePage}
            sections={sections}
            blocks={blocks}
            onSelectPage={setActivePage}
            highlightType={highlightedBlockType}
            headerStickyTop={0}
            hideHeader
          />
        </div>

        {/* Right: Fixed settings panel */}
        {panelOpen && (
          <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col">
            <div className="px-4 py-3 border-b shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Customize</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Adjust typography, colors, layout &amp; block styles</p>
            </div>

            <ScrollArea className="flex-1">
              <Accordion
                type="multiple"
                value={openAccordionValues}
                onValueChange={setOpenAccordionValues}
                className="px-3"
              >
                {/* ─── Global Settings ─── */}
                <div className="pt-3 pb-1">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Global</span>
                </div>

                <AccordionItem value="typography" className="border-b-0">
                  <AccordionTrigger className="py-2.5 text-xs hover:no-underline">
                    <span className="flex items-center gap-2"><Type className="h-3.5 w-3.5 text-muted-foreground" /> Typography</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pb-2">
                      <TypographyControls local={local} update={update} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="colors" className="border-b-0">
                  <AccordionTrigger className="py-2.5 text-xs hover:no-underline">
                    <span className="flex items-center gap-2"><Palette className="h-3.5 w-3.5 text-muted-foreground" /> Colors</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pb-2">
                      <ColorControls local={local} update={update} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="layout" className="border-b-0">
                  <AccordionTrigger className="py-2.5 text-xs hover:no-underline">
                    <span className="flex items-center gap-2"><Layout className="h-3.5 w-3.5 text-muted-foreground" /> Layout</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pb-2">
                      <LayoutControls local={local} update={update} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sidebar" className="border-b-0">
                  <AccordionTrigger className="py-2.5 text-xs hover:no-underline">
                    <span className="flex items-center gap-2"><Sidebar className="h-3.5 w-3.5 text-muted-foreground" /> Sidebar</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pb-2">
                      <SidebarControls local={local} update={update} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ─── Block Styles ─── */}
                <div className="pt-4 pb-1">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Block Styles</span>
                </div>

                {blockSections.map((item) => {
                  const Icon = item.icon;
                  return (
                    <AccordionItem key={item.key} value={`block-${item.key}`} className="border-b-0">
                      <AccordionTrigger className="py-2.5 text-xs hover:no-underline">
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" /> {item.label}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pb-2">
                          <BlockControls blockKey={item.key} local={local} updateBlockStyle={updateBlockStyle} update={update} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
              <div className="h-6" />
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
};

// ─── Typography Controls ─────────────────────────────
function TypographyControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Heading Font</Label>
        <Select value={local.headingFont} onValueChange={(v) => update("headingFont", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{fontOptions.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Body Font</Label>
        <Select value={local.bodyFont} onValueChange={(v) => update("bodyFont", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{fontOptions.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Code Font</Label>
        <Select value={local.codeFont} onValueChange={(v) => update("codeFont", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{codeFontOptions.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Heading Weight</Label>
        <Select value={local.headingWeight} onValueChange={(v) => update("headingWeight", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{weightOptions.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Base Font Size: {local.baseFontSize}px</Label>
        <Slider value={[local.baseFontSize]} onValueChange={([v]) => update("baseFontSize", v)} min={12} max={20} step={1} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Heading Size: {local.headingFontSize}px</Label>
        <Slider value={[local.headingFontSize]} onValueChange={([v]) => update("headingFontSize", v)} min={14} max={32} step={1} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Line Height: {local.lineHeight}</Label>
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
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Content Width: {local.contentMaxWidth}px</Label>
        <Slider value={[local.contentMaxWidth]} onValueChange={([v]) => update("contentMaxWidth", v)} min={500} max={900} step={10} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Sidebar Width: {local.sidebarWidth}px</Label>
        <Slider value={[local.sidebarWidth]} onValueChange={([v]) => update("sidebarWidth", v)} min={180} max={320} step={10} />
      </div>
      <Separator />
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Page Title Size: {local.pageTitleSize}px</Label>
        <Slider value={[local.pageTitleSize]} onValueChange={([v]) => update("pageTitleSize", v)} min={18} max={42} step={1} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Section Spacing: {local.sectionSpacing}px</Label>
        <Slider value={[local.sectionSpacing]} onValueChange={([v]) => update("sectionSpacing", v)} min={16} max={80} step={4} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Paragraph Spacing: {local.paragraphSpacing}px</Label>
        <Slider value={[local.paragraphSpacing]} onValueChange={([v]) => update("paragraphSpacing", v)} min={8} max={32} step={2} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">Rounded Images</Label>
        <Switch checked={local.imageRounded} onCheckedChange={(v) => update("imageRounded", v)} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Code Border Radius: {local.codeBlockBorderRadius}px</Label>
        <Slider value={[local.codeBlockBorderRadius]} onValueChange={([v]) => update("codeBlockBorderRadius", v)} min={0} max={16} step={1} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Note Border Width: {local.noteBorderWidth}px</Label>
        <Slider value={[local.noteBorderWidth]} onValueChange={([v]) => update("noteBorderWidth", v)} min={1} max={6} step={1} />
      </div>
    </>
  );
}

// ─── Sidebar Controls ────────────────────────────────
function SidebarControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <ColorField label="Background" value={local.sidebarBg} onChange={(v) => update("sidebarBg", v)} />
      <ColorField label="Text Color" value={local.sidebarTextColor} onChange={(v) => update("sidebarTextColor", v)} />
      <ColorField label="Active Color" value={local.sidebarActiveColor} onChange={(v) => update("sidebarActiveColor", v)} />
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Font Size: {local.sidebarFontSize}px</Label>
        <Slider value={[local.sidebarFontSize]} onValueChange={([v]) => update("sidebarFontSize", v)} min={11} max={16} step={1} />
      </div>
      <Separator />
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Page Gap: {local.sidebarPageGap}px</Label>
        <Slider value={[local.sidebarPageGap]} onValueChange={([v]) => update("sidebarPageGap", v)} min={0} max={12} step={1} />
      </div>
    </>
  );
}

// ─── Block Controls ──────────────────────────────────
function BlockControls({
  blockKey, local, updateBlockStyle, update,
}: {
  blockKey: BlockKey; local: DS;
  updateBlockStyle: (block: BlockKey, key: keyof BlockStyleSettings, value: any) => void;
  update: <K extends keyof DS>(k: K, v: DS[K]) => void;
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
  const resolvedPadding = bs.padding ?? (["code_block", "note", "callout"].includes(blockKey) ? 16 : ["image", "video", "youtube"].includes(blockKey) ? 0 : 0);

  return (
    <>
      <p className="text-[10px] text-muted-foreground">Customize {label.toLowerCase()} blocks. Leave empty for global defaults.</p>

      {supportsTextStyle && (
        <ColorField label="Text Color" value={resolvedColor} onChange={(v) => updateBlockStyle(blockKey, "color", v)} />
      )}
      {supportsBackground && (
        <ColorField label="Background" value={resolvedBg} onChange={(v) => updateBlockStyle(blockKey, "backgroundColor", v)} />
      )}
      {supportsBorder && (
        <ColorField label="Border" value={resolvedBorder} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />
      )}

      {supportsTextStyle && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Font</Label>
          <Select value={resolvedFont} onValueChange={(v) => updateBlockStyle(blockKey, "fontFamily", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(blockKey === "code_block" ? codeFontOptions : fontOptions).map((f) => (
                <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {supportsTextStyle && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Font Size: {resolvedSize}px</Label>
          <Slider value={[resolvedSize]} onValueChange={([v]) => updateBlockStyle(blockKey, "fontSize", v)} min={10} max={32} step={1} />
        </div>
      )}

      {supportsTextStyle && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Font Weight</Label>
          <Select value={resolvedWeight} onValueChange={(v) => updateBlockStyle(blockKey, "fontWeight", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{weightOptions.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {supportsRadius && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Border Radius: {resolvedRadius}px</Label>
          <Slider value={[resolvedRadius]} onValueChange={([v]) => updateBlockStyle(blockKey, "borderRadius", v)} min={0} max={20} step={1} />
        </div>
      )}

      {supportsPadding && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Padding: {resolvedPadding}px</Label>
          <Slider value={[resolvedPadding]} onValueChange={([v]) => updateBlockStyle(blockKey, "padding", v)} min={0} max={32} step={2} />
        </div>
      )}
    </>
  );
}

export default DesignSettingsPage;
