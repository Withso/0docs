import { useState, useEffect } from "react";
import { defaultDesignSettings } from "@/hooks/use-design-settings";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import DocContentView from "@/components/docs/DocContentView";
import { ExamplesContent } from "@/components/builder/DesignExamplesView";
import type { DesignSubMode } from "@/components/builder/BuilderHeader";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save, RotateCcw, Type, Palette, Layout, Sidebar,
  PanelRightClose, PanelRight, PanelRight as TOCIcon, Minus as SectionIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import {
  SettingsSection, SliderField, ColorField, ToggleField,
  FontSelect, WeightSelect, ColorControls, LayoutControls,
  TOCControls, SectionControls, BlockControls, fontOptions, codeFontOptions,
  blockSections, type BlockKey,
} from "@/components/builder/DesignControls";

// ─── Interfaces ──────────────────────────────────────
interface DocPage { id: string; title: string; slug: string; order_index: number; }
interface DocSection { id: string; page_id: string; title: string; order_index: number; }
interface DocBlock { id: string; section_id: string; type: string; content: any; order_index: number; }
interface DocNavGroup { id: string; title: string; order_index: number; }

interface DesignPanelProps {
  projectId: string;
  projectName: string;
  settings: DS;
  saving: boolean;
  saveSettings: (s: DS) => Promise<void>;
  resetSettings: () => void;
  designSubMode: DesignSubMode;
  onDesignSubModeChange: (sub: DesignSubMode) => void;
}

// ─── Mode Switcher ───────────────────────────────────
const ModeSwitcher = ({ value, onChange }: { value: DesignSubMode; onChange: (v: DesignSubMode) => void }) => (
  <div className="flex items-center rounded-xl p-0.5" style={{ backgroundColor: 'hsl(var(--foreground) / 0.06)' }}>
    {(["live", "examples"] as DesignSubMode[]).map((mode) => (
      <button
        key={mode}
        onClick={() => onChange(mode)}
        className={`flex-1 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
          value === mode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {mode === "live" ? "Live" : "Examples"}
      </button>
    ))}
  </div>
);

// ─── Main Panel ──────────────────────────────────────
const DesignPanel = ({ projectId, projectName, settings, saving, saveSettings, resetSettings, designSubMode, onDesignSubModeChange }: DesignPanelProps) => {
  const { toast } = useToast();
  const [local, setLocal] = useState<DS>(defaultDesignSettings);
  const [panelOpen, setPanelOpen] = useState(true);
  const [pages, setPages] = useState<DocPage[]>([]);
  const [activePage, setActivePage] = useState<DocPage | null>(null);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [navGroups, setNavGroups] = useState<DocNavGroup[]>([]);
  // Examples mode state
  const [activeNav, setActiveNav] = useState("typography");

  useEffect(() => { setLocal(settings); }, [settings]);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      const { data: pagesData } = await supabase.from("pages").select("*").eq("project_id", projectId).order("order_index");
      if (pagesData && pagesData.length > 0) { setPages(pagesData); setActivePage(pagesData[0]); }
      const { data: groupsData } = await supabase.from("nav_groups").select("*").eq("project_id", projectId).order("order_index");
      if (groupsData) setNavGroups(groupsData);
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

  const isLive = designSubMode === "live";

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: Content area — switches between live preview and examples */}
      <div className="flex-1 overflow-auto bg-muted/30">
        {isLive ? (
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
            navGroups={navGroups}
            hideHeaderLabel
          />
        ) : (
          <ExamplesContent
            settings={local}
            activeNav={activeNav}
            update={update}
            updateBlockStyle={updateBlockStyle}
          />
        )}
      </div>

      {/* Right: Unified settings panel — fixed width, always 340px */}
      {panelOpen && (
        <div className="shrink-0 p-2 pl-0">
          <aside
            className="w-[340px] h-full rounded-2xl flex flex-col overflow-hidden shadow-platform-md"
            style={{
              backgroundColor: "hsl(var(--background) / 0.92)",
              backdropFilter: "blur(20px)",
              border: "1px solid hsl(var(--border) / 0.5)",
            }}
          >
            {/* Mode Switcher */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <ModeSwitcher value={designSubMode} onChange={onDesignSubModeChange} />
            </div>

            {/* Header */}
            <div className="px-4 py-2 shrink-0 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-foreground">
                {isLive ? "Customize" : "Style Guide"}
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[10px] rounded-lg gap-1 text-muted-foreground hover:text-foreground" onClick={handleReset}>
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[10px] rounded-lg gap-1"
                  disabled={!hasChanges || saving}
                  onClick={handleSave}
                >
                  <Save className="h-3 w-3" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>

            <div className="mx-4 h-px bg-border/40" />

            <ScrollArea className="flex-1">
              <div className="p-3">
                {isLive ? (
                  /* ─── Live mode: collapsible sections ─── */
                  <>
                    <div className="mb-2 px-1">
                      <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em]">Global</span>
                    </div>

                    <SettingsSection title="Typography" icon={Type} defaultOpen>
                      <FontSelect label="Heading Font" value={local.headingFont} onChange={(v) => update("headingFont", v)} options={fontOptions} />
                      <FontSelect label="Body Font" value={local.bodyFont} onChange={(v) => update("bodyFont", v)} options={fontOptions} />
                      <FontSelect label="Code Font" value={local.codeFont} onChange={(v) => update("codeFont", v)} options={codeFontOptions} />
                      <WeightSelect label="Heading Weight" value={local.headingWeight} onChange={(v) => update("headingWeight", v)} />
                      <SliderField label="Base Font Size" value={local.baseFontSize} onChange={(v) => update("baseFontSize", v)} min={12} max={20} step={1} />
                      <SliderField label="Heading Size" value={local.headingFontSize} onChange={(v) => update("headingFontSize", v)} min={14} max={32} step={1} />
                      <SliderField label="Line Height" value={local.lineHeight} onChange={(v) => update("lineHeight", v)} min={1.2} max={2.2} step={0.1} unit="" />
                    </SettingsSection>

                    <SettingsSection title="Colors" icon={Palette}><ColorControls local={local} update={update} /></SettingsSection>
                    <SettingsSection title="Layout" icon={Layout}><LayoutControls local={local} update={update} /></SettingsSection>
                    <SettingsSection title="On This Page" icon={TOCIcon}><TOCControls local={local} update={update} /></SettingsSection>
                    <SettingsSection title="Section" icon={SectionIcon}><SectionControls local={local} update={update} /></SettingsSection>

                    <div className="mt-4 mb-2 px-1">
                      <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em]">Block Styles</span>
                    </div>

                    {blockSections.map((item) => (
                      <SettingsSection key={item.key} title={item.label} icon={item.icon}>
                        <BlockControls blockKey={item.key} local={local} updateBlockStyle={updateBlockStyle} />
                      </SettingsSection>
                    ))}
                  </>
                ) : (
                  /* ─── Examples mode: nav list ─── */
                  <>
                    <div className="px-1 mb-1">
                      <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em]">Global</span>
                    </div>
                    {[
                      { id: "typography", label: "Typography", icon: Type },
                      { id: "colors", label: "Colors", icon: Palette },
                      { id: "layout", label: "Layout", icon: Layout },
                      { id: "toc", label: "On This Page", icon: TOCIcon },
                      { id: "section", label: "Section", icon: SectionIcon },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-[12px] rounded-lg transition-colors ${
                          activeNav === item.id
                            ? "text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        style={activeNav === item.id ? { backgroundColor: 'hsl(var(--foreground) / 0.06)' } : undefined}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </button>
                    ))}

                    <div className="px-1 mt-4 mb-1">
                      <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em]">Block Styles</span>
                    </div>
                    {blockSections.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setActiveNav(item.key)}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-[12px] rounded-lg transition-colors ${
                          activeNav === item.key
                            ? "text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        style={activeNav === item.key ? { backgroundColor: 'hsl(var(--foreground) / 0.06)' } : undefined}
                      >
                        {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0" />}
                        {item.label}
                      </button>
                    ))}
                  </>
                )}

                <div className="h-4" />
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

export default DesignPanel;
