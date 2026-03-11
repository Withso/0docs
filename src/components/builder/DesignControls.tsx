/**
 * Shared design controls used across DesignPanel (live mode) and DesignExamplesView (examples mode).
 * This is the single source of truth for all design setting UI controls.
 */
import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";

// ─── Helpers ─────────────────────────────────────────
export function hslToHex(hsl: string): string {
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

export function hexToHsl(hex: string): string {
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
  { key: "heading", label: "Heading", icon: null },
  { key: "paragraph", label: "Paragraph", icon: null },
  { key: "code_block", label: "Code Block", icon: null },
  { key: "image", label: "Image", icon: null },
  { key: "video", label: "Video", icon: null },
  { key: "youtube", label: "YouTube Embed", icon: null },
  { key: "ordered_list", label: "Numbered List", icon: null },
  { key: "unordered_list", label: "Bullet List", icon: null },
  { key: "note", label: "Note", icon: null },
  { key: "callout", label: "Callout", icon: null },
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

export function ColorControls({ local, update }: { local: DS; update: <K extends keyof DS>(k: K, v: DS[K]) => void }) {
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
      {supportsTextStyle && <ColorField label="Text Color" value={resolvedColor} onChange={(v) => updateBlockStyle(blockKey, "color", v)} />}
      {supportsBackground && <ColorField label="Background" value={resolvedBg} onChange={(v) => updateBlockStyle(blockKey, "backgroundColor", v)} />}
      {supportsBorder && <ColorField label="Border" value={resolvedBorder} onChange={(v) => updateBlockStyle(blockKey, "borderColor", v)} />}
      {supportsTextStyle && <FontSelect label="Font" value={resolvedFont} onChange={(v) => updateBlockStyle(blockKey, "fontFamily", v)} options={blockKey === "code_block" ? codeFontOptions : fontOptions} />}
      {supportsTextStyle && <SliderField label="Font Size" value={resolvedSize} onChange={(v) => updateBlockStyle(blockKey, "fontSize", v)} min={10} max={32} step={1} />}
      {supportsTextStyle && <WeightSelect label="Font Weight" value={resolvedWeight} onChange={(v) => updateBlockStyle(blockKey, "fontWeight", v)} />}
      {supportsRadius && <SliderField label="Border Radius" value={resolvedRadius} onChange={(v) => updateBlockStyle(blockKey, "borderRadius", v)} min={0} max={20} step={1} />}
      {supportsPadding && <SliderField label="Padding" value={resolvedPadding} onChange={(v) => updateBlockStyle(blockKey, "padding", v)} min={0} max={32} step={2} />}
    </>
  );
}
