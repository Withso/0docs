import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Palette, RotateCcw, Save } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { defaultDesignSettings } from "@/hooks/use-design-settings";

const fontOptions = [
  "Inter",
  "System UI",
  "Georgia",
  "Merriweather",
  "Lora",
  "Playfair Display",
  "Roboto",
  "Open Sans",
  "Nunito",
  "DM Sans",
  "Space Grotesk",
  "Outfit",
  "Plus Jakarta Sans",
];

const codeFontOptions = [
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
  "IBM Plex Mono",
  "Cascadia Code",
  "monospace",
];

const weightOptions = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
];

interface DesignSettingsPanelProps {
  settings: DesignSettings;
  saving: boolean;
  onSave: (settings: DesignSettings) => void;
  onReset: () => void;
}

/** HSL string "H S% L%" → hex for color input */
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

/** Hex → HSL string "H S% L%" */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-8 h-8 rounded border cursor-pointer bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[140px] text-xs h-8 font-mono"
          placeholder="0 0% 100%"
        />
      </div>
    </div>
  );
}

const DesignSettingsPanel = ({ settings, saving, onSave, onReset }: DesignSettingsPanelProps) => {
  const [local, setLocal] = useState<DesignSettings>(settings);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const update = <K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = JSON.stringify(local) !== JSON.stringify(settings);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className="h-3.5 w-3.5 mr-1.5" /> Design
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[440px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-base">Design Settings</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            <Tabs defaultValue="typography">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="typography" className="flex-1 text-xs">Typography</TabsTrigger>
                <TabsTrigger value="colors" className="flex-1 text-xs">Colors</TabsTrigger>
                <TabsTrigger value="layout" className="flex-1 text-xs">Layout</TabsTrigger>
                <TabsTrigger value="blocks" className="flex-1 text-xs">Blocks</TabsTrigger>
              </TabsList>

              <TabsContent value="typography" className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Heading Font</Label>
                  <Select value={local.headingFont} onValueChange={(v) => update("headingFont", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Body Font</Label>
                  <Select value={local.bodyFont} onValueChange={(v) => update("bodyFont", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Code Font</Label>
                  <Select value={local.codeFont} onValueChange={(v) => update("codeFont", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {codeFontOptions.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Heading Weight</Label>
                  <Select value={local.headingWeight} onValueChange={(v) => update("headingWeight", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {weightOptions.map((w) => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Base Font Size: {local.baseFontSize}px
                  </Label>
                  <Slider
                    value={[local.baseFontSize]}
                    onValueChange={([v]) => update("baseFontSize", v)}
                    min={12}
                    max={20}
                    step={1}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Heading Font Size: {local.headingFontSize}px
                  </Label>
                  <Slider
                    value={[local.headingFontSize]}
                    onValueChange={([v]) => update("headingFontSize", v)}
                    min={14}
                    max={28}
                    step={1}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Line Height: {local.lineHeight}
                  </Label>
                  <Slider
                    value={[local.lineHeight]}
                    onValueChange={([v]) => update("lineHeight", v)}
                    min={1.2}
                    max={2.2}
                    step={0.1}
                  />
                </div>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4">
                <ColorField label="Background" value={local.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
                <ColorField label="Text" value={local.foregroundColor} onChange={(v) => update("foregroundColor", v)} />
                <ColorField label="Primary" value={local.primaryColor} onChange={(v) => update("primaryColor", v)} />
                <ColorField label="Primary Text" value={local.primaryForegroundColor} onChange={(v) => update("primaryForegroundColor", v)} />
                <ColorField label="Muted" value={local.mutedColor} onChange={(v) => update("mutedColor", v)} />
                <ColorField label="Muted Text" value={local.mutedForegroundColor} onChange={(v) => update("mutedForegroundColor", v)} />
                <ColorField label="Accent" value={local.accentColor} onChange={(v) => update("accentColor", v)} />
                <ColorField label="Border" value={local.borderColor} onChange={(v) => update("borderColor", v)} />
                <ColorField label="Links" value={local.linkColor} onChange={(v) => update("linkColor", v)} />
                <ColorField label="Section Line" value={local.sectionLineColor} onChange={(v) => update("sectionLineColor", v)} />
                <ColorField label="Code Block BG" value={local.codeBlockBg} onChange={(v) => update("codeBlockBg", v)} />
                <ColorField label="Note BG" value={local.noteBg} onChange={(v) => update("noteBg", v)} />
                <ColorField label="Note Border" value={local.noteBorderColor} onChange={(v) => update("noteBorderColor", v)} />
              </TabsContent>

              <TabsContent value="layout" className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Content Max Width: {local.contentMaxWidth}px
                  </Label>
                  <Slider
                    value={[local.contentMaxWidth]}
                    onValueChange={([v]) => update("contentMaxWidth", v)}
                    min={500}
                    max={900}
                    step={10}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Sidebar Width: {local.sidebarWidth}px
                  </Label>
                  <Slider
                    value={[local.sidebarWidth]}
                    onValueChange={([v]) => update("sidebarWidth", v)}
                    min={180}
                    max={320}
                    step={10}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Paragraph Spacing: {local.paragraphSpacing}px
                  </Label>
                  <Slider
                    value={[local.paragraphSpacing]}
                    onValueChange={([v]) => update("paragraphSpacing", v)}
                    min={8}
                    max={32}
                    step={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="blocks" className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Code Block Border Radius: {local.codeBlockBorderRadius}px
                  </Label>
                  <Slider
                    value={[local.codeBlockBorderRadius]}
                    onValueChange={([v]) => update("codeBlockBorderRadius", v)}
                    min={0}
                    max={16}
                    step={1}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Note Border Width: {local.noteBorderWidth}px
                  </Label>
                  <Slider
                    value={[local.noteBorderWidth]}
                    onValueChange={([v]) => update("noteBorderWidth", v)}
                    min={1}
                    max={6}
                    step={1}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Rounded Images</Label>
                  <Switch
                    checked={local.imageRounded}
                    onCheckedChange={(v) => update("imageRounded", v)}
                  />
                </div>

                {/* Preview */}
                <div className="border rounded-lg p-4 mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preview</p>
                  <div
                    style={{
                      fontFamily: `'${local.headingFont}', sans-serif`,
                      fontWeight: local.headingWeight,
                      fontSize: `${local.headingFontSize}px`,
                      color: `hsl(${local.foregroundColor})`,
                    }}
                  >
                    Sample Heading
                  </div>
                  <div
                    style={{
                      fontFamily: `'${local.bodyFont}', sans-serif`,
                      fontSize: `${local.baseFontSize}px`,
                      lineHeight: local.lineHeight,
                      color: `hsl(${local.foregroundColor})`,
                    }}
                  >
                    This is how your body text will look with the current settings.
                  </div>
                  <div
                    style={{
                      fontFamily: `'${local.codeFont}', monospace`,
                      fontSize: `${local.baseFontSize - 1}px`,
                      background: `hsl(${local.codeBlockBg})`,
                      borderRadius: `${local.codeBlockBorderRadius}px`,
                      padding: "12px",
                      border: `1px solid hsl(${local.borderColor})`,
                    }}
                  >
                    const hello = "world";
                  </div>
                  <div
                    style={{
                      background: `hsl(${local.noteBg})`,
                      borderLeft: `${local.noteBorderWidth}px solid hsl(${local.noteBorderColor})`,
                      borderRadius: "0 8px 8px 0",
                      padding: "12px",
                      fontSize: `${local.baseFontSize - 1}px`,
                      fontFamily: `'${local.bodyFont}', sans-serif`,
                    }}
                  >
                    📝 This is a sample note block.
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-4 flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLocal(defaultDesignSettings);
              onReset();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
          <Button
            size="sm"
            className="ml-auto"
            disabled={!hasChanges || saving}
            onClick={() => onSave(local)}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DesignSettingsPanel;
