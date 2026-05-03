import { useState, useEffect } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import { defaultDesignSettings } from "@/hooks/use-design-settings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutGrid, Palette, Type as TypeIcon, PanelTop, PanelBottom,
  Sparkles,
  RotateCcw, Sidebar as SidebarIcon, Layout as LayoutIcon, Minus,
} from "lucide-react";
import {
  SettingsSection, SliderField, FontSelect, WeightSelect,
  ColorControls, LayoutControls, SidebarControls, TOCControls,
  SectionControls, BlockControls, AppearanceControls,
  fontOptions, codeFontOptions, blockSections,
} from "@/components/builder/DesignControls";

type CategoryId =
  | "overview"
  | "branding"
  | "typography"
  | "sidebar"
  | "header"
  | "footer"
  | "content";

const categories: { id: CategoryId; label: string; icon: any }[] = [
  { id: "overview",     label: "Overview",            icon: LayoutGrid },
  { id: "branding",     label: "Visual Branding",     icon: Palette },
  { id: "typography",   label: "Typography",          icon: TypeIcon },
  { id: "sidebar",      label: "Sidebar",             icon: SidebarIcon },
  { id: "header",       label: "Header & Topbar",     icon: PanelTop },
  { id: "footer",       label: "Footer",              icon: PanelBottom },
  { id: "content",      label: "Content Features",    icon: Sparkles },
];

interface Props {
  projectId: string;
  projectName: string;
  settings: DS;
  saving: boolean;
  saveSettings: (s: DS) => Promise<void>;
  resetSettings: () => void;
}

const ConfigurationsPanel = ({ projectName, settings, saving, saveSettings, resetSettings }: Props) => {
  const { toast } = useToast();
  const [active, setActive] = useState<CategoryId>("overview");
  const [local, setLocal] = useState<DS>(settings);

  useEffect(() => setLocal(settings), [settings]);

  const hasChanges = JSON.stringify(local) !== JSON.stringify(settings);
  const debouncedSave = useDebouncedCallback((next: DS) => {
    saveSettings(next);
  }, 700);
  const updateAndSave = (next: DS) => {
    setLocal(next);
    debouncedSave(next);
  };
  const update = <K extends keyof DS>(key: K, value: DS[K]) =>
    updateAndSave({ ...local, [key]: value });
  /** Atomic multi-field update — required for theme presets (avoids
   *  the stale-closure bug where successive `update` calls overwrite
   *  each other because they all read the same captured `local`). */
  const applyPatch = (patch: Partial<DS>) => updateAndSave({ ...local, ...patch });
  const updateBlockStyle = (
    block: keyof DS["blockStyles"],
    key: keyof BlockStyleSettings,
    value: any,
  ) =>
    updateAndSave({
      ...local,
      blockStyles: { ...local.blockStyles, [block]: { ...local.blockStyles[block], [key]: value } },
    });
  const handleReset = () => {
    setLocal(defaultDesignSettings);
    resetSettings();
    toast({ title: "Reset to defaults" });
  };

  return (
    <div className="flex flex-1 h-full min-h-0 min-w-0 bg-background">
      {/* Left: Category nav */}
      <aside className="w-[224px] shrink-0 border-r border-border/40 py-3 px-2 overflow-y-auto bg-muted/10">
        <div className="px-2 pb-3">
          <h2 className="text-[13px] font-semibold text-foreground">Configurations</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{projectName}</p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {categories.map((c) => {
            const Icon = c.icon;
            const isActive = active === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors text-left ${
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {isActive && <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-primary" />}
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right: Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header bar */}
        <div className="h-12 px-5 flex items-center justify-between border-b border-border/40 shrink-0">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">
              {categories.find((c) => c.id === active)?.label}
            </h3>
            <p className="text-[11px] text-muted-foreground">{saving ? "Saving…" : hasChanges ? "Autosave pending" : "Saved"}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg gap-1" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-[640px] mx-auto p-6">
            {active === "overview" && <OverviewView local={local} />}

            {active === "branding" && (
              <>
                <SettingsSection title="Appearance" icon={Palette} defaultOpen>
                  <AppearanceControls local={local} update={update} applyPatch={applyPatch} />
                </SettingsSection>
                <SettingsSection title="Advanced Colors" icon={Palette}>
                  <ColorControls local={local} update={update} />
                </SettingsSection>
              </>
            )}

            {active === "typography" && (
              <SettingsSection title="Typography" icon={TypeIcon} defaultOpen>
                <FontSelect label="Heading Font" value={local.headingFont} onChange={(v) => update("headingFont", v)} options={fontOptions} />
                <FontSelect label="Body Font" value={local.bodyFont} onChange={(v) => update("bodyFont", v)} options={fontOptions} />
                <FontSelect label="Code Font" value={local.codeFont} onChange={(v) => update("codeFont", v)} options={codeFontOptions} />
                <WeightSelect label="Heading Weight" value={local.headingWeight} onChange={(v) => update("headingWeight", v)} />
                <SliderField label="Base Font Size" value={local.baseFontSize} onChange={(v) => update("baseFontSize", v)} min={12} max={20} step={1} />
                <SliderField label="Heading Size" value={local.headingFontSize} onChange={(v) => update("headingFontSize", v)} min={14} max={32} step={1} />
                <SliderField label="Line Height" value={local.lineHeight} onChange={(v) => update("lineHeight", v)} min={1.2} max={2.2} step={0.1} unit="" />
              </SettingsSection>
            )}

            {active === "sidebar" && (
              <SettingsSection title="Sidebar" icon={SidebarIcon} defaultOpen>
                <SidebarControls local={local} update={update} />
              </SettingsSection>
            )}

            {active === "header" && (
              <EmptyView
                title="Header & Topbar"
                description="Logo, navigation links, and topbar styling. Coming soon."
              />
            )}

            {active === "footer" && (
              <EmptyView
                title="Footer"
                description="Footer customization is coming soon. Configure links, copyright, social icons, and more."
              />
            )}

            {active === "content" && (
              <>
                <SettingsSection title="Layout" icon={LayoutIcon} defaultOpen>
                  <LayoutControls local={local} update={update} />
                </SettingsSection>
                <SettingsSection title="On This Page" icon={LayoutIcon}>
                  <TOCControls local={local} update={update} />
                </SettingsSection>
                <SettingsSection title="Section Border" icon={Minus}>
                  <SectionControls local={local} update={update} />
                </SettingsSection>
                <div className="mt-4 mb-2 px-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Block Styles</span>
                </div>
                {blockSections.map((item) => (
                  <SettingsSection key={item.key} title={item.label} icon={item.icon}>
                    <BlockControls blockKey={item.key} local={local} updateBlockStyle={updateBlockStyle} />
                  </SettingsSection>
                ))}
              </>
            )}

            <div className="h-12" />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const OverviewView = ({ local }: { local: DS }) => (
  <div className="space-y-3">
    <p className="text-[13px] text-muted-foreground mb-5">
      Configure your documentation site appearance and behavior. Changes are saved per project.
    </p>
    {[
      { label: "Body Font", value: local.bodyFont },
      { label: "Heading Font", value: local.headingFont },
      { label: "Base Font Size", value: `${local.baseFontSize}px` },
      { label: "Content Width", value: `${local.contentMaxWidth}px` },
      { label: "Sidebar Width", value: `${local.sidebarWidth}px` },
      { label: "Show On This Page", value: local.tocVisible ? "Yes" : "No" },
    ].map((row) => (
      <div
        key={row.label}
        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
        style={{ backgroundColor: "hsl(var(--foreground) / 0.04)" }}
      >
        <span className="text-[12px] text-muted-foreground">{row.label}</span>
        <span className="text-[12px] font-medium text-foreground">{row.value}</span>
      </div>
    ))}
  </div>
);

const EmptyView = ({ title, description }: { title: string; description: string }) => (
  <div className="text-center py-16">
    <h3 className="text-[15px] font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-[12.5px] text-muted-foreground max-w-md mx-auto">{description}</p>
  </div>
);

export default ConfigurationsPanel;
