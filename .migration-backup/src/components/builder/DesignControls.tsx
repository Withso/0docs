/**
 * Shared design controls used in the Configurations panel.
 * This is the single source of truth for all design setting UI controls.
 */
import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Type, AlignLeft, Code, ImageIcon, Film, Youtube, ListOrdered, List, StickyNote, AlertCircle, Layout as LayoutIcon, Columns, CreditCard, Footprints, Table2, Minus, Quote, Globe, CodeSquare, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";

// ─── Helpers ─────────────────────────────────────────
export function hslToHex(hsl: string | null | undefined): string {
  if (typeof hsl !== "string" || hsl.trim().length === 0) return "#000000";
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([h, s, l].some((value) => Number.isNaN(value))) return "#000000";
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string | null | undefined): string {
  if (typeof hex !== "string") return "0 0% 0%";
  const raw = hex.trim().replace(/^#/, "");
  const normalized = /^[0-9a-fA-F]{3}$/.test(raw)
    ? raw.split("").map((char) => char + char).join("")
    : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "0 0% 0%";
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
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

// ─── Constants ───────────────────────────────────────
export const fontOptions = [
  "Inter", "System UI", "Georgia", "Merriweather", "Lora", "Playfair Display",
  "Roboto", "Open Sans", "Nunito", "DM Sans", "Space Grotesk", "Outfit", "Plus Jakarta Sans",
];
export const codeFontOptions = ["JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Cascadia Code", "monospace"];
export const weightOptions = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
];

export type BlockKey = keyof DS["blockStyles"];

export const blockSections: { key: BlockKey; label: string; icon: any }[] = [
  { key: "heading", label: "Heading", icon: Type },
  { key: "paragraph", label: "Paragraph", icon: AlignLeft },
  { key: "code_block", label: "Code Block", icon: Code },
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "video", label: "Video", icon: Film },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "ordered_list", label: "Numbered List", icon: ListOrdered },
  { key: "unordered_list", label: "Bullet List", icon: List },
  { key: "note", label: "Note", icon: StickyNote },
  { key: "callout", label: "Callout", icon: AlertCircle },
  { key: "tabs", label: "Tabs", icon: Columns },
  { key: "accordion", label: "Accordion", icon: ChevronDown },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "steps", label: "Steps", icon: Footprints },
  { key: "table", label: "Table", icon: Table2 },
  { key: "divider", label: "Divider", icon: Minus },
  { key: "quote", label: "Quote", icon: Quote },
  { key: "api_endpoint", label: "API Endpoint", icon: Globe },
  { key: "code_tabs", label: "Code Tabs", icon: CodeSquare },
  { key: "inline_editor", label: "Inline Editor", icon: FileEdit },
];

// ─── Shared Controls ─────────────────────────────────

export function SettingsSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon?: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl mb-1.5" style={{ backgroundColor: 'hsl(var(--foreground) / 0.025)' }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 group rounded-xl hover:bg-muted/60 transition-colors">
          <span className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />}
            {title}
          </span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground/50 transition-transform duration-200", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3.5 px-3 pb-3 pt-0.5">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function SliderField({ label, value, onChange, min, max, step, unit = "px" }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string;
}) {
  const filledPercent = ((value - min) / (max - min)) * 100;
  const range = max - min;
  const totalSteps = Math.round(range / step);
  const dotCount = Math.min(totalSteps - 1, 5);
  const dots = Array.from({ length: dotCount }, (_, i) => ((i + 1) / (dotCount + 1)) * 100);

  return (
    <div
      className="relative rounded-xl h-[34px] overflow-hidden cursor-ew-resize"
      style={{ backgroundColor: 'hsl(var(--foreground) / 0.06)' }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-xl transition-[width] duration-75"
        style={{ width: `${filledPercent}%`, backgroundColor: 'hsl(var(--foreground) / 0.08)' }}
      >
        <div
          className="absolute top-[28%] bottom-[28%] w-[2px] rounded-full"
          style={{ right: '6px', backgroundColor: 'hsl(var(--foreground) / 0.15)' }}
        />
      </div>
      {dots.map((pos, i) => (
        <div
          key={i}
          className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full pointer-events-none"
          style={{ left: `${pos}%`, backgroundColor: 'hsl(var(--foreground) / 0.12)' }}
        />
      ))}
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium pointer-events-none select-none z-[2]" style={{ color: 'hsl(var(--foreground) / 0.4)' }}>
        {label}
      </span>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] font-semibold pointer-events-none select-none z-[2] tabular-nums" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
        {value}{unit}
      </span>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="absolute inset-0 ds-bar-slider"
      />
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hexValue = hslToHex(value);
  const [localHex, setLocalHex] = useState(hexValue);
  const [hexInput, setHexInput] = useState(hexValue);

  useEffect(() => {
    const h = hslToHex(value);
    setLocalHex(h);
    setHexInput(h);
  }, [value]);

  const handlePickerChange = (hex: string) => {
    setLocalHex(hex);
    setHexInput(hex);
    onChange(hexToHsl(hex));
  };

  const handleHexInput = (raw: string) => {
    setHexInput(raw);
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      setLocalHex(raw);
      onChange(hexToHsl(raw));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="relative rounded-xl h-[34px] flex items-center px-3.5 cursor-pointer"
          style={{ backgroundColor: 'hsl(var(--foreground) / 0.06)' }}
        >
          <span className="text-[11px] font-medium select-none flex-1" style={{ color: 'hsl(var(--foreground) / 0.4)' }}>
            {label}
          </span>
          <span className="text-[10px] font-mono mr-2.5 tabular-nums" style={{ color: 'hsl(var(--foreground) / 0.35)' }}>
            {localHex}
          </span>
          <div
            className="w-5 h-5 rounded-full shrink-0"
            style={{
              backgroundColor: localHex,
              boxShadow: 'inset 0 0 0 1px hsl(var(--foreground) / 0.08)',
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        className="w-auto p-0 border-0 shadow-none bg-transparent"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--foreground) / 0.08)',
            boxShadow: '0 8px 32px -4px hsl(var(--foreground) / 0.12), 0 2px 8px -2px hsl(var(--foreground) / 0.06)',
            padding: '14px',
            width: '232px',
          }}
        >
          <HexColorPicker color={localHex} onChange={handlePickerChange} style={{ width: '100%', height: '160px' }} />
          <div className="flex items-center gap-2 mt-3">
            <div
              className="w-8 h-8 rounded-lg shrink-0"
              style={{
                backgroundColor: localHex,
                boxShadow: 'inset 0 0 0 1px hsl(var(--foreground) / 0.1)',
              }}
            />
            <input
              className="flex-1 rounded-lg h-8 px-2.5 text-[11px] font-mono outline-none"
              style={{
                backgroundColor: 'hsl(var(--foreground) / 0.06)',
                color: 'hsl(var(--foreground) / 0.6)',
                border: '1px solid hsl(var(--foreground) / 0.08)',
              }}
              value={hexInput}
              onChange={(e) => handleHexInput(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="relative rounded-xl h-[34px] flex items-center px-3.5"
      style={{ backgroundColor: 'hsl(var(--foreground) / 0.06)' }}
    >
      <span className="text-[11px] font-medium select-none flex-1" style={{ color: 'hsl(var(--foreground) / 0.4)' }}>
        {label}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="h-5 w-9 border-0"
        style={{ backgroundColor: 'hsl(var(--foreground) / 0.08)' }}
        thumbClassName={cn(
          "h-4 w-4 shadow-none data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        )}
        thumbStyle={{ backgroundColor: checked ? 'hsl(var(--foreground) / 0.35)' : 'hsl(var(--foreground) / 0.15)' }}
      />
    </div>
  );
}

export function InlineSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string; style?: React.CSSProperties }[];
}) {
  return (
    <div
      className="relative rounded-xl h-[34px] flex items-center cursor-pointer"
      style={{ backgroundColor: 'hsl(var(--foreground) / 0.06)' }}
    >
      <span className="absolute left-3.5 text-[11px] font-medium pointer-events-none select-none" style={{ color: 'hsl(var(--foreground) / 0.4)' }}>
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-full bg-transparent border-0 shadow-none rounded-xl pl-3.5 pr-3 focus:ring-0 focus-visible:ring-0">
          <span className="ml-auto text-[11.5px] font-medium" style={{
            color: 'hsl(var(--foreground) / 0.7)',
            fontFamily: options.find(o => o.value === value)?.style?.fontFamily || undefined,
          }}>
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-[11px]" style={o.style}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FontSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <InlineSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options.map((f) => ({ value: f, label: f, style: { fontFamily: f } }))}
    />
  );
}

export function WeightSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <InlineSelect
      label={label}
      value={value}
      onChange={onChange}
      options={weightOptions.map((w) => ({ value: w.value, label: w.label }))}
    />
  );
}

// ─── Grouped Controls ────────────────────────────────

/** Mintlify-style appearance: brand colours + light/dark mode behaviour. */
export function AppearanceControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  const colors = local.colors || {};
  const updateColor = (k: "primary" | "light" | "dark", hex: string) => {
    update("colors" as keyof DS, { ...colors, [k]: hex } as any);
  };
  const appearance = local.appearance || { default: "system", strict: false };
  const updateAppearance = (patch: Partial<typeof appearance>) => {
    update("appearance" as keyof DS, { ...appearance, ...patch } as any);
  };
  const bgColors = local.backgroundColors || {};
  const updateBg = (mode: "light" | "dark", hex: string) => {
    update("backgroundColors" as keyof DS, { ...bgColors, [mode]: hex } as any);
  };

  // Mintlify-style controls take HEX directly (not HSL strings).
  const HexColorRow = ({ label, hex, onChange }: { label: string; hex: string; onChange: (h: string) => void }) => (
    <ColorField
      label={label}
      value={hexToHsl(hex || "#000000")}
      onChange={(hsl) => onChange(hslToHex(hsl))}
    />
  );

  return (
    <>
      <HexColorRow label="Primary" hex={colors.primary || "#0a0a0a"} onChange={(h) => updateColor("primary", h)} />
      <HexColorRow label="Light Accent" hex={colors.light || "#ffffff"} onChange={(h) => updateColor("light", h)} />
      <HexColorRow label="Dark Accent" hex={colors.dark || "#0a0a0a"} onChange={(h) => updateColor("dark", h)} />
      <HexColorRow label="BG (Light)" hex={bgColors.light || "#ffffff"} onChange={(h) => updateBg("light", h)} />
      <HexColorRow label="BG (Dark)" hex={bgColors.dark || "#0d0d0d"} onChange={(h) => updateBg("dark", h)} />
      <InlineSelect
        label="Default Mode"
        value={appearance.default}
        onChange={(v) => updateAppearance({ default: v as any })}
        options={[
          { value: "system", label: "System" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
      />
      <ToggleField label="Strict (hide toggle)" checked={appearance.strict} onChange={(v) => updateAppearance({ strict: v })} />
    </>
  );
}

/**
 * Per-mode color editor (Light + Dark side-by-side).
 * Writes to `colorsLight` / `colorsDark` in DesignSettings; the resolver
 * picks the right palette per active theme.
 */
export function ColorControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  const fields: { label: string; key: keyof import("@/lib/theme/resolve-doc-theme").PerModeColors; lightDefault: string; darkDefault: string }[] = [
    { label: "Background",      key: "background",        lightDefault: "#ffffff", darkDefault: "#0d0d0d" },
    { label: "Text",            key: "foreground",        lightDefault: "#0a0a0a", darkDefault: "#f0f0f0" },
    { label: "Primary",         key: "primary",           lightDefault: "#0a0a0a", darkDefault: "#ffffff" },
    { label: "Primary Text",    key: "primaryForeground", lightDefault: "#ffffff", darkDefault: "#0d0d0d" },
    { label: "Muted",           key: "muted",             lightDefault: "#f4f4f5", darkDefault: "#1e1e1e" },
    { label: "Muted Text",      key: "mutedForeground",   lightDefault: "#71717a", darkDefault: "#707070" },
    { label: "Accent",          key: "accent",            lightDefault: "#f4f4f5", darkDefault: "#1e1e1e" },
    { label: "Border",          key: "border",            lightDefault: "#ececee", darkDefault: "#2a2a2a" },
    { label: "Links",           key: "link",              lightDefault: "#3b82f6", darkDefault: "#a1a1aa" },
    { label: "Section Line",    key: "sectionLine",       lightDefault: "#e4e4e7", darkDefault: "#303030" },
    { label: "Code Block BG",   key: "codeBg",            lightDefault: "#f4f4f5", darkDefault: "#161616" },
    { label: "Note BG",         key: "noteBg",            lightDefault: "#fafafa", darkDefault: "#161616" },
    { label: "Note Border",     key: "noteBorder",        lightDefault: "#e4e4e7", darkDefault: "#2a2a2a" },
  ];

  const colorsLight = (local.colorsLight || {}) as Record<string, string>;
  const colorsDark = (local.colorsDark || {}) as Record<string, string>;

  const setMode = (mode: "light" | "dark", key: string, hex: string) => {
    const current = mode === "light" ? colorsLight : colorsDark;
    const next = { ...current, [key]: hex };
    update((mode === "light" ? "colorsLight" : "colorsDark") as keyof DS, next as any);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 pb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider flex-1" style={{ color: 'hsl(var(--foreground) / 0.4)' }}>Token</span>
        <span className="text-[10px] font-medium uppercase tracking-wider w-[88px] text-center" style={{ color: 'hsl(var(--foreground) / 0.4)' }}>Light</span>
        <span className="text-[10px] font-medium uppercase tracking-wider w-[88px] text-center" style={{ color: 'hsl(var(--foreground) / 0.4)' }}>Dark</span>
      </div>
      {fields.map((f) => {
        const lightHex = colorsLight[f.key] || f.lightDefault;
        const darkHex = colorsDark[f.key] || f.darkDefault;
        return (
          <div key={f.key} className="flex items-center gap-2">
            <span className="text-[11px] flex-1 px-1" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>{f.label}</span>
            <div className="w-[88px]">
              <ColorField label="" value={hexToHsl(lightHex)} onChange={(hsl) => setMode("light", f.key, hslToHex(hsl))} />
            </div>
            <div className="w-[88px]">
              <ColorField label="" value={hexToHsl(darkHex)} onChange={(hsl) => setMode("dark", f.key, hslToHex(hsl))} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LayoutControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <SliderField label="Content Width" value={local.contentMaxWidth} onChange={(v) => update("contentMaxWidth", v)} min={500} max={900} step={10} />
      <SliderField label="Sidebar Width" value={local.sidebarWidth} onChange={(v) => update("sidebarWidth", v)} min={180} max={320} step={10} />
      <SliderField label="Page Title Size" value={local.pageTitleSize} onChange={(v) => update("pageTitleSize", v)} min={18} max={42} step={1} />
      <SliderField label="Section Spacing" value={local.sectionSpacing} onChange={(v) => update("sectionSpacing", v)} min={16} max={80} step={4} />
      <SliderField label="Paragraph Spacing" value={local.paragraphSpacing} onChange={(v) => update("paragraphSpacing", v)} min={8} max={32} step={2} />
      <ToggleField label="Rounded Images" checked={local.imageRounded} onChange={(v) => update("imageRounded", v)} />
      <SliderField label="Code Border Radius" value={local.codeBlockBorderRadius} onChange={(v) => update("codeBlockBorderRadius", v)} min={0} max={16} step={1} />
      <SliderField label="Note Border Width" value={local.noteBorderWidth} onChange={(v) => update("noteBorderWidth", v)} min={1} max={6} step={1} />
    </>
  );
}

export function SidebarControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <ColorField label="Background" value={local.sidebarBg} onChange={(v) => update("sidebarBg", v)} />
      <ColorField label="Text Color" value={local.sidebarTextColor} onChange={(v) => update("sidebarTextColor", v)} />
      <ColorField label="Active Color" value={local.sidebarActiveColor} onChange={(v) => update("sidebarActiveColor", v)} />
      <ColorField label="Indicator Color" value={local.sidebarIndicatorColor} onChange={(v) => update("sidebarIndicatorColor", v)} />
      <SliderField label="Font Size" value={local.sidebarFontSize} onChange={(v) => update("sidebarFontSize", v)} min={11} max={16} step={1} />
      <SliderField label="Page Gap" value={local.sidebarPageGap} onChange={(v) => update("sidebarPageGap", v)} min={0} max={12} step={1} />
      <ToggleField label="Section Scroll Tracker" checked={local.sidebarShowSectionTracker} onChange={(v) => update("sidebarShowSectionTracker", v)} />
      <SliderField label="Label Font Size" value={local.sidebarLabelFontSize} onChange={(v) => update("sidebarLabelFontSize", v)} min={8} max={14} step={1} />
      <ColorField label="Label Color" value={local.sidebarLabelColor} onChange={(v) => update("sidebarLabelColor", v)} />
      <SliderField label="Section Font Size" value={local.sidebarSectionFontSize} onChange={(v) => update("sidebarSectionFontSize", v)} min={10} max={16} step={1} />
      <ColorField label="Section Color" value={local.sidebarSectionColor} onChange={(v) => update("sidebarSectionColor", v)} />
    </>
  );
}

export function TOCControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <ToggleField label="Show On This Page" checked={local.tocVisible} onChange={(v) => update("tocVisible", v)} />
      <SliderField label="Gap from Content" value={local.tocGap} onChange={(v) => update("tocGap", v)} min={0} max={64} step={4} />
    </>
  );
}

export function SectionControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
  return (
    <>
      <ToggleField label="Show Border Line" checked={local.sectionBorderVisible} onChange={(v) => update("sectionBorderVisible", v)} />
      <ColorField label="Border Color" value={local.sectionBorderColor} onChange={(v) => update("sectionBorderColor", v)} />
      <SliderField label="Border Thickness" value={local.sectionBorderThickness} onChange={(v) => update("sectionBorderThickness", v)} min={1} max={6} step={1} />
    </>
  );
}

export function BlockControls({
  blockKey, local, updateBlockStyle,
}: {
  blockKey: BlockKey; local: DS;
  updateBlockStyle: (block: BlockKey, key: keyof BlockStyleSettings, value: any) => void;
}) {
  const bs = local.blockStyles[blockKey];

  // Common resolvers
  const resolvedColor = bs.color || local.foregroundColor;
  const resolvedBg = bs.backgroundColor || (blockKey === "code_block" ? local.codeBlockBg : blockKey === "note" ? local.noteBg : blockKey === "callout" ? local.accentColor : "0 0% 100%");
  const resolvedBorder = bs.borderColor || (blockKey === "note" ? local.noteBorderColor : local.borderColor);
  const resolvedFont = bs.fontFamily || (blockKey === "heading" ? local.headingFont : blockKey === "code_block" || blockKey === "code_tabs" ? local.codeFont : local.bodyFont);
  const resolvedSize = bs.fontSize || (blockKey === "heading" ? local.headingFontSize : local.baseFontSize);
  const resolvedWeight = bs.fontWeight || (blockKey === "heading" ? local.headingWeight : "400");
  const resolvedRadius = bs.borderRadius ?? (blockKey === "code_block" || blockKey === "code_tabs" ? local.codeBlockBorderRadius : 8);
  const resolvedPadding = bs.padding ?? (["code_block", "note", "callout"].includes(blockKey) ? 16 : 0);

  // What controls each block type supports
  const commonTextBlocks = ["heading", "paragraph", "code_block", "ordered_list", "unordered_list", "note", "callout", "image", "quote", "card", "steps", "tabs", "accordion", "api_endpoint", "code_tabs", "table", "inline_editor"];
  const commonBgBlocks = ["code_block", "note", "callout", "image", "video", "youtube", "card", "accordion", "tabs", "table", "api_endpoint", "code_tabs"];
  const commonBorderBlocks = ["note", "callout", "code_block", "image", "video", "youtube", "card", "accordion", "table", "api_endpoint", "code_tabs", "quote"];
  const commonRadiusBlocks = ["code_block", "note", "callout", "image", "video", "youtube", "card", "accordion", "table", "api_endpoint", "code_tabs"];
  const commonPaddingBlocks = ["code_block", "note", "callout", "image", "video", "youtube", "card", "accordion", "table", "api_endpoint", "code_tabs"];

  const supportsText = commonTextBlocks.includes(blockKey);
  const supportsBg = commonBgBlocks.includes(blockKey);
  const supportsBorder = commonBorderBlocks.includes(blockKey);
  const supportsRadius = commonRadiusBlocks.includes(blockKey);
  const supportsPadding = commonPaddingBlocks.includes(blockKey);

  return (
    <>
      {/* Common controls */}
      {supportsText && <ColorField label="Text Color" value={resolvedColor} onChange={(v) => updateBlockStyle(blockKey, "color", v)} />}
      {supportsBg && <ColorField label="Background" value={resolvedBg} onChange={(v) => updateBlockStyle(blockKey, "backgroundColor", v)} />}
      {supportsBorder && <ColorField label="Border" value={resolvedBorder} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />}
      {supportsText && <FontSelect label="Font" value={resolvedFont} onChange={(v) => updateBlockStyle(blockKey, "fontFamily", v)} options={["code_block", "code_tabs"].includes(blockKey) ? codeFontOptions : fontOptions} />}
      {supportsText && <SliderField label="Font Size" value={resolvedSize} onChange={(v) => updateBlockStyle(blockKey, "fontSize", v)} min={10} max={32} step={1} />}
      {supportsText && <WeightSelect label="Font Weight" value={resolvedWeight} onChange={(v) => updateBlockStyle(blockKey, "fontWeight", v)} />}
      {supportsRadius && <SliderField label="Border Radius" value={resolvedRadius} onChange={(v) => updateBlockStyle(blockKey, "borderRadius", v)} min={0} max={20} step={1} />}
      {supportsPadding && <SliderField label="Padding" value={resolvedPadding} onChange={(v) => updateBlockStyle(blockKey, "padding", v)} min={0} max={32} step={2} />}

      {/* ─── Per-block-type specific controls ─── */}

      {blockKey === "table" && (
        <>
          <ColorField label="Header Background" value={bs.headerBg || local.accentColor} onChange={(v) => updateBlockStyle(blockKey, "headerBg", v)} />
          <WeightSelect label="Header Weight" value={bs.headerFontWeight || "600"} onChange={(v) => updateBlockStyle(blockKey, "headerFontWeight", v)} />
          <SliderField label="Cell Padding" value={bs.cellPadding ?? 10} onChange={(v) => updateBlockStyle(blockKey, "cellPadding", v)} min={4} max={24} step={2} />
          <ToggleField label="Cell Borders" checked={bs.showCellBorders !== false} onChange={(v) => updateBlockStyle(blockKey, "showCellBorders", v)} />
          <ToggleField label="Striped Rows" checked={bs.stripedRows === true} onChange={(v) => updateBlockStyle(blockKey, "stripedRows", v)} />
          {bs.stripedRows && <ColorField label="Stripe Color" value={bs.stripedRowBg || local.accentColor} onChange={(v) => updateBlockStyle(blockKey, "stripedRowBg", v)} />}
        </>
      )}

      {blockKey === "api_endpoint" && (
        <>
          <ColorField label="Header BG" value={bs.headerBgColor || local.accentColor} onChange={(v) => updateBlockStyle(blockKey, "headerBgColor", v)} />
          <ColorField label="Response BG" value={bs.responseBg || local.codeBlockBg} onChange={(v) => updateBlockStyle(blockKey, "responseBg", v)} />
          <SliderField label="Badge Radius" value={bs.methodBadgeRadius ?? 4} onChange={(v) => updateBlockStyle(blockKey, "methodBadgeRadius", v)} min={0} max={12} step={1} />
          <SliderField label="Param Font Size" value={bs.paramFontSize ?? 13} onChange={(v) => updateBlockStyle(blockKey, "paramFontSize", v)} min={10} max={16} step={1} />
        </>
      )}

      {blockKey === "steps" && (
        <>
          <SliderField label="Circle Size" value={bs.circleSize ?? 28} onChange={(v) => updateBlockStyle(blockKey, "circleSize", v)} min={20} max={40} step={2} />
          <ColorField label="Circle BG" value={bs.circleBg || local.primaryColor} onChange={(v) => updateBlockStyle(blockKey, "circleBg", v)} />
          <ColorField label="Circle Text" value={bs.circleColor || local.primaryForegroundColor} onChange={(v) => updateBlockStyle(blockKey, "circleColor", v)} />
          <ColorField label="Connector" value={bs.connectorColor || local.borderColor} onChange={(v) => updateBlockStyle(blockKey, "connectorColor", v)} />
          <SliderField label="Connector Width" value={bs.connectorWidth ?? 2} onChange={(v) => updateBlockStyle(blockKey, "connectorWidth", v)} min={1} max={4} step={1} />
        </>
      )}

      {blockKey === "quote" && (
        <>
          <SliderField label="Border Width" value={bs.borderWidth ?? 3} onChange={(v) => updateBlockStyle(blockKey, "borderWidth", v)} min={1} max={8} step={1} />
          <ToggleField label="Italic" checked={bs.italic !== false} onChange={(v) => updateBlockStyle(blockKey, "italic", v)} />
          <ColorField label="Attribution Color" value={bs.attributionColor || local.mutedForegroundColor} onChange={(v) => updateBlockStyle(blockKey, "attributionColor", v)} />
        </>
      )}

      {blockKey === "divider" && (
        <>
          <ColorField label="Color" value={bs.borderColor || local.borderColor} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />
          <SliderField label="Thickness" value={bs.thickness ?? 1} onChange={(v) => updateBlockStyle(blockKey, "thickness", v)} min={1} max={6} step={1} />
          <InlineSelect label="Style" value={bs.dividerStyle || "solid"} onChange={(v) => updateBlockStyle(blockKey, "dividerStyle", v)} options={[
            { value: "solid", label: "Solid" },
            { value: "dashed", label: "Dashed" },
            { value: "dotted", label: "Dotted" },
          ]} />
          <SliderField label="Spacing" value={bs.spacing ?? 24} onChange={(v) => updateBlockStyle(blockKey, "spacing", v)} min={8} max={64} step={4} />
        </>
      )}

      {blockKey === "card" && (
        <>
          <SliderField label="Title Size" value={bs.titleFontSize ?? local.baseFontSize} onChange={(v) => updateBlockStyle(blockKey, "titleFontSize", v)} min={12} max={24} step={1} />
          <WeightSelect label="Title Weight" value={bs.titleWeight || local.headingWeight} onChange={(v) => updateBlockStyle(blockKey, "titleWeight", v)} />
          <ToggleField label="Shadow" checked={bs.showShadow === true} onChange={(v) => updateBlockStyle(blockKey, "showShadow", v)} />
        </>
      )}

      {blockKey === "accordion" && (
        <>
          <ColorField label="Header BG" value={bs.headerBgAccordion || "0 0% 100%"} onChange={(v) => updateBlockStyle(blockKey, "headerBgAccordion", v)} />
          <ColorField label="Content BG" value={bs.contentBg || "0 0% 100%"} onChange={(v) => updateBlockStyle(blockKey, "contentBg", v)} />
          <SliderField label="Icon Size" value={bs.iconSize ?? 12} onChange={(v) => updateBlockStyle(blockKey, "iconSize", v)} min={8} max={18} step={1} />
        </>
      )}

      {blockKey === "tabs" && (
        <>
          <ColorField label="Active Tab" value={bs.activeColor || local.primaryColor} onChange={(v) => updateBlockStyle(blockKey, "activeColor", v)} />
          <ColorField label="Inactive Tab" value={bs.inactiveColor || local.mutedForegroundColor} onChange={(v) => updateBlockStyle(blockKey, "inactiveColor", v)} />
          <ColorField label="Indicator" value={bs.indicatorColor || local.primaryColor} onChange={(v) => updateBlockStyle(blockKey, "indicatorColor", v)} />
          <SliderField label="Tab Padding" value={bs.tabPadding ?? 8} onChange={(v) => updateBlockStyle(blockKey, "tabPadding", v)} min={4} max={20} step={2} />
        </>
      )}

      {blockKey === "code_tabs" && (
        <>
          <ColorField label="Tab Bar BG" value={bs.tabBarBg || local.accentColor} onChange={(v) => updateBlockStyle(blockKey, "tabBarBg", v)} />
          <ColorField label="Active Tab" value={bs.activeTabColor || local.primaryColor} onChange={(v) => updateBlockStyle(blockKey, "activeTabColor", v)} />
        </>
      )}
    </>
  );
}
