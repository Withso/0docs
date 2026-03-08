import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDesignSettings, defaultDesignSettings } from "@/hooks/use-design-settings";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import DesignSettingsWrapper from "@/components/docs/DesignSettingsWrapper";
import DocBlockRenderer from "@/components/docs/DocBlockRenderer";
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
  GripHorizontal, Minimize2, Maximize2, Eye, ChevronRight,
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

type NavSection = "global" | "colors" | "layout" | "sidebar" | BlockKey;

const globalNavItems: { key: NavSection; label: string; icon: typeof Type }[] = [
  { key: "global", label: "Typography", icon: Type },
  { key: "colors", label: "Colors", icon: Palette },
  { key: "layout", label: "Layout", icon: Layout },
  { key: "sidebar", label: "Sidebar", icon: Sidebar },
];

interface DocPage { id: string; title: string; slug: string; order_index: number; }
interface DocSection { id: string; page_id: string; title: string; order_index: number; }
interface DocBlock { id: string; section_id: string; type: string; content: any; order_index: number; }

// ─── Draggable + Resizable hook ──────────────────────
function useDraggableResizable(
  initialX: number, initialY: number, initialW: number, initialH: number, minW: number, minH: number
) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: initialW, h: initialH });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    resizing.current = true;
    offset.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - offset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.current.y)),
        });
      }
      if (resizing.current) {
        const dx = e.clientX - offset.current.x;
        const dy = e.clientY - offset.current.y;
        offset.current = { x: e.clientX, y: e.clientY };
        setSize((prev) => ({
          w: Math.max(minW, prev.w + dx),
          h: Math.max(minH, prev.h + dy),
        }));
      }
    };
    const onMouseUp = () => {
      dragging.current = false;
      resizing.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minW, minH]);

  return { pos, size, onDragStart, onResizeStart };
}

// ─── Main Page ───────────────────────────────────────
const DesignSettingsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { settings, loading: settingsLoading, saving, saveSettings, resetSettings } = useDesignSettings(projectId);
  const [local, setLocal] = useState<DS>(defaultDesignSettings);
  const [activeNav, setActiveNav] = useState<NavSection>("global");
  const [projectData, setProjectData] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Doc data
  const [pages, setPages] = useState<DocPage[]>([]);
  const [activePage, setActivePage] = useState<DocPage | null>(null);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [docLoading, setDocLoading] = useState(true);

  const { pos, size, onDragStart, onResizeStart } = useDraggableResizable(
    Math.max(0, window.innerWidth - 420), 80, 380, 560, 300, 300
  );

  // Determine highlighted block type — only when a block section is active
  const highlightedBlockType = blockSections.some((b) => b.key === activeNav) ? (activeNav as string) : null;

  useEffect(() => {
    if (!settingsLoading) setLocal(settings);
  }, [settings, settingsLoading]);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      const { data: proj } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (proj) {
        setProjectData(proj);
        const { data: pagesData } = await supabase.from("pages").select("*").eq("project_id", projectId).order("order_index");
        if (pagesData && pagesData.length > 0) {
          setPages(pagesData);
          setActivePage(pagesData[0]);
        }
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

  const update = <K extends keyof DS>(key: K, value: DS[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const updateBlockStyle = (block: BlockKey, key: keyof BlockStyleSettings, value: any) => {
    setLocal((prev) => ({
      ...prev,
      blockStyles: { ...prev.blockStyles, [block]: { ...prev.blockStyles[block], [key]: value } },
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

  if (settingsLoading || docLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-[60] shrink-0">
        <div className="px-6 h-11 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/builder/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground text-sm">{projectData?.name}</span>
            <span className="text-muted-foreground text-xs">/ Design Settings</span>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Full-page live documentation — identical to PublicDocs */}
      <div className="flex-1 overflow-auto">
        <DesignSettingsWrapper settings={local} className="min-h-full">
          <header
            className="border-b sticky top-11 z-40"
            style={{ backgroundColor: `hsl(${local.backgroundColor})`, borderColor: `hsl(${local.borderColor})` }}
          >
            <div
              style={{ maxWidth: `${local.contentMaxWidth + local.sidebarWidth + 48}px` }}
              className="mx-auto px-6 h-12 flex items-center"
            >
              <span className="font-semibold text-sm">{projectData?.name}</span>
            </div>
          </header>

          <div
            style={{ maxWidth: `${local.contentMaxWidth + local.sidebarWidth + 48}px` }}
            className="mx-auto flex px-6"
          >
            {/* Sidebar — same as PublicDocs */}
            <aside
              style={{ width: `${local.sidebarWidth}px`, backgroundColor: `hsl(${local.sidebarBg})` }}
              className="shrink-0 sticky top-[92px] h-[calc(100vh-92px)] overflow-y-auto py-10 pr-6 hidden lg:block"
            >
              <div
                className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
                style={{ color: `hsl(${local.sidebarTextColor})` }}
              >
                Pages
              </div>
              <nav className="space-y-0.5">
                {pages.map((page) => {
                  const isActive = activePage?.id === page.id;
                  const pageSections = isActive ? sections : [];
                  return (
                    <div key={page.id}>
                      <div className="flex items-center gap-1">
                        <ChevronRight
                          className={`h-3 w-3 shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`}
                          style={{ color: `hsl(${local.mutedForegroundColor})` }}
                        />
                        <button
                          onClick={() => setActivePage(page)}
                          className="flex-1 text-left truncate px-2 py-1 rounded text-sm transition-colors"
                          style={{
                            fontSize: `${local.sidebarFontSize}px`,
                            color: isActive ? `hsl(${local.sidebarActiveColor})` : `hsl(${local.sidebarTextColor})`,
                            fontWeight: isActive ? 500 : 400,
                            backgroundColor: isActive ? `hsl(${local.accentColor})` : "transparent",
                          }}
                        >
                          {page.title}
                        </button>
                      </div>
                      {isActive && pageSections.length > 0 && (
                        <nav className="ml-4 mt-0.5 mb-1 space-y-0.5">
                          {pageSections.map((section) => (
                            <a
                              key={section.id}
                              href={`#section-${section.id}`}
                              className="block px-2 py-0.5 text-xs rounded transition-colors"
                              style={{ color: `hsl(${local.sidebarTextColor})`, fontSize: `${local.sidebarFontSize - 2}px` }}
                            >
                              {section.title}
                            </a>
                          ))}
                        </nav>
                      )}
                    </div>
                  );
                })}
              </nav>
            </aside>

            {/* Main content — real documentation with highlight support */}
            <main className="flex-1 min-w-0 py-10 lg:pl-4">
              {activePage ? (
                <article style={{ maxWidth: `${local.contentMaxWidth}px` }}>
                  <h1
                    className="mb-6"
                    style={{
                      fontFamily: `'${local.headingFont}', sans-serif`,
                      fontWeight: local.headingWeight,
                      fontSize: `${local.headingFontSize + 6}px`,
                    }}
                  >
                    {activePage.title}
                  </h1>

                  {sections.map((section) => {
                    const sectionBlocks = blocks
                      .filter((b) => b.section_id === section.id)
                      .sort((a, b) => a.order_index - b.order_index);
                    return (
                      <section key={section.id} className="mb-10" id={`section-${section.id}`}>
                        <h2
                          className="flex items-center gap-3 mb-4"
                          style={{
                            fontFamily: `'${local.headingFont}', sans-serif`,
                            fontWeight: local.headingWeight,
                            fontSize: `${local.headingFontSize}px`,
                          }}
                        >
                          {section.title}
                          <span
                            className="flex-1 h-px opacity-50"
                            style={{ backgroundColor: `hsl(${local.sectionLineColor})` }}
                          />
                        </h2>
                        <div>
                          {sectionBlocks.map((block) => (
                            <DocBlockRenderer
                              key={block.id}
                              block={block}
                              settings={local}
                              highlightType={highlightedBlockType}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  {sections.length === 0 && (
                    <p style={{ color: `hsl(${local.mutedForegroundColor})` }}>This page has no content yet.</p>
                  )}
                </article>
              ) : (
                <p style={{ color: `hsl(${local.mutedForegroundColor})` }}>No pages in this project yet.</p>
              )}
            </main>
          </div>
        </DesignSettingsWrapper>
      </div>

      {/* ─── Floating Resizable Settings Panel ─── */}
      <div
        className="fixed z-[70] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          left: pos.x,
          top: pos.y,
          width: collapsed ? 220 : size.w,
          height: collapsed ? "auto" : size.h,
        }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing select-none bg-muted/50 rounded-t-xl shrink-0"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Design Settings</span>
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-secondary transition-colors">
            {collapsed ? <Maximize2 className="h-3 w-3 text-muted-foreground" /> : <Minimize2 className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Nav tabs */}
            <div className="border-b px-2 py-1.5 shrink-0 max-h-[140px] overflow-y-auto">
              <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-1 py-0.5">Global</div>
              <div className="flex flex-wrap gap-0.5 mb-1">
                {globalNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveNav(item.key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-1 py-0.5">Blocks</div>
              <div className="flex flex-wrap gap-0.5">
                {blockSections.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveNav(item.key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                {activeNav === "global" && <TypographyControls local={local} update={update} />}
                {activeNav === "colors" && <ColorControls local={local} update={update} />}
                {activeNav === "layout" && <LayoutControls local={local} update={update} />}
                {activeNav === "sidebar" && <SidebarControls local={local} update={update} />}
                {blockSections.some((b) => b.key === activeNav) && (
                  <BlockControls blockKey={activeNav as BlockKey} local={local} updateBlockStyle={updateBlockStyle} update={update} />
                )}
              </div>
            </ScrollArea>

            {/* Resize handle */}
            <div
              onMouseDown={onResizeStart}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              style={{ touchAction: "none" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" className="text-muted-foreground/50">
                <path d="M14 14L8 14L14 8Z" fill="currentColor" />
                <path d="M14 14L11 14L14 11Z" fill="currentColor" opacity="0.5" />
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Typography Controls ─────────────────────────────
function TypographyControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <h3 className="text-xs font-semibold text-foreground">Typography</h3>
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
      <h3 className="text-xs font-semibold text-foreground">Colors</h3>
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
      <h3 className="text-xs font-semibold text-foreground">Layout</h3>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Content Width: {local.contentMaxWidth}px</Label>
        <Slider value={[local.contentMaxWidth]} onValueChange={([v]) => update("contentMaxWidth", v)} min={500} max={900} step={10} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Sidebar Width: {local.sidebarWidth}px</Label>
        <Slider value={[local.sidebarWidth]} onValueChange={([v]) => update("sidebarWidth", v)} min={180} max={320} step={10} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Paragraph Spacing: {local.paragraphSpacing}px</Label>
        <Slider value={[local.paragraphSpacing]} onValueChange={([v]) => update("paragraphSpacing", v)} min={8} max={32} step={2} />
      </div>
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
      <h3 className="text-xs font-semibold text-foreground">Sidebar</h3>
      <ColorField label="Background" value={local.sidebarBg} onChange={(v) => update("sidebarBg", v)} />
      <ColorField label="Text Color" value={local.sidebarTextColor} onChange={(v) => update("sidebarTextColor", v)} />
      <ColorField label="Active Color" value={local.sidebarActiveColor} onChange={(v) => update("sidebarActiveColor", v)} />
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Font Size: {local.sidebarFontSize}px</Label>
        <Slider value={[local.sidebarFontSize]} onValueChange={([v]) => update("sidebarFontSize", v)} min={11} max={16} step={1} />
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
      <h3 className="text-xs font-semibold text-foreground">{label} Block</h3>
      <p className="text-[10px] text-muted-foreground">Customize {label.toLowerCase()} blocks. Leave empty for global defaults.</p>
      <Separator />
      <ColorField label="Text Color" value={resolvedColor} onChange={(v) => updateBlockStyle(blockKey, "color", v)} />
      {["code_block", "note", "callout"].includes(blockKey) && (
        <ColorField label="Background" value={resolvedBg} onChange={(v) => updateBlockStyle(blockKey, "backgroundColor", v)} />
      )}
      {["note", "callout", "code_block"].includes(blockKey) && (
        <ColorField label="Border" value={resolvedBorder} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />
      )}
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
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Font Size: {resolvedSize}px</Label>
        <Slider value={[resolvedSize]} onValueChange={([v]) => updateBlockStyle(blockKey, "fontSize", v)} min={10} max={32} step={1} />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Font Weight</Label>
        <Select value={resolvedWeight} onValueChange={(v) => updateBlockStyle(blockKey, "fontWeight", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{weightOptions.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {["code_block", "note", "callout", "image", "video", "youtube"].includes(blockKey) && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Border Radius: {resolvedRadius}px</Label>
          <Slider value={[resolvedRadius]} onValueChange={([v]) => updateBlockStyle(blockKey, "borderRadius", v)} min={0} max={20} step={1} />
        </div>
      )}
      {["code_block", "note", "callout"].includes(blockKey) && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Padding: {resolvedPadding}px</Label>
          <Slider value={[resolvedPadding]} onValueChange={([v]) => updateBlockStyle(blockKey, "padding", v)} min={4} max={32} step={2} />
        </div>
      )}
    </>
  );
}

export default DesignSettingsPage;
