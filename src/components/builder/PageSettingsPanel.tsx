import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import type { Page } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";

interface Props {
  page: Page;
  settings: DesignSettings;
  projectSlug?: string;
  /** When true, render as a bottom-pinned bar inside the navigation column (Mintlify style). */
  variant?: "floating" | "bottomBar";
}

interface PageMetadata {
  externalUrl?: string;
  sidebarTitle?: string;
  ogImage?: string;
  keywords?: string;
  mode?: "default" | "wide" | "custom";
  tag?: string;
  icon?: string;
  hidden?: boolean;
}

/** Per-page settings panel — supports floating (legacy) and bottomBar (Mintlify-style) variants. */
const PageSettingsPanel = ({ page, settings, projectSlug, variant = "floating" }: Props) => {
  const [collapsed, setCollapsed] = useState(true);

  const [slug, setSlug] = useState(page.slug || "");
  const [metaDesc, setMetaDesc] = useState(page.meta_description || "");
  const [meta, setMeta] = useState<PageMetadata>(((page as any).metadata || {}) as PageMetadata);

  useEffect(() => {
    setSlug(page.slug || "");
    setMetaDesc(page.meta_description || "");
    setMeta(((page as any).metadata || {}) as PageMetadata);
  }, [page.id, page.slug, page.meta_description, (page as any).metadata]);

  const saveSlug = useDebouncedCallback((v: string) => {
    supabase.from("pages").update({ slug: v }).eq("id", page.id).then(() => {});
  }, 700);
  const saveMetaDesc = useDebouncedCallback((v: string) => {
    supabase.from("pages").update({ meta_description: v }).eq("id", page.id).then(() => {});
  }, 700);
  const saveMeta = useDebouncedCallback((next: PageMetadata) => {
    supabase.from("pages").update({ metadata: next as any }).eq("id", page.id).then(() => {});
  }, 700);

  const updateMeta = <K extends keyof PageMetadata>(key: K, value: PageMetadata[K]) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    saveMeta(next);
  };

  const filePath = `${projectSlug || "docs"}/${slug || "untitled"}.mdx`;

  /* ─────────────────────────────────────────
   * Variant: bottomBar (Mintlify-style)
   * Pinned to the bottom of the navigation column. Expands upward on click.
   * ───────────────────────────────────────── */
  if (variant === "bottomBar") {
    return (
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="truncate flex-1 text-left">Page Settings</span>
          {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {!collapsed && (
          <div
            className="overflow-y-auto px-3 pb-3 pt-1 space-y-3 animate-fade-in"
            style={{ maxHeight: "55vh" }}
          >
            <PageSettingsForm
              page={page}
              slug={slug}
              setSlug={setSlug}
              saveSlug={saveSlug}
              metaDesc={metaDesc}
              setMetaDesc={setMetaDesc}
              saveMetaDesc={saveMetaDesc}
              meta={meta}
              updateMeta={updateMeta}
              filePath={filePath}
            />
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────
   * Variant: floating (legacy)
   * ───────────────────────────────────────── */
  return (
    <div className="fixed z-50 hidden lg:block" style={{ top: "80px", left: "76px" }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-accent/80"
        style={{
          backgroundColor: collapsed ? `hsl(${settings.borderColor} / 0.15)` : `hsl(${settings.borderColor} / 0.25)`,
          color: `hsl(${settings.mutedForegroundColor})`,
        }}
      >
        <FileText className="h-3 w-3" />
        Page Settings
        {collapsed ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />}
      </button>

      {!collapsed && (
        <div
          className="mt-1.5 rounded-xl shadow-lg border animate-fade-in overflow-hidden flex flex-col"
          style={{
            width: "320px",
            maxHeight: "calc(100vh - 120px)",
            backgroundColor: `hsl(${settings.backgroundColor})`,
            borderColor: `hsl(${settings.borderColor} / 0.4)`,
          }}
        >
          <div className="overflow-y-auto p-4 space-y-3">
            <Field label="Title">
              <Input
                value={page.title}
                onChange={(e) => {
                  supabase.from("pages").update({ title: e.target.value }).eq("id", page.id).then(() => {});
                }}
                className="h-8 text-[12px]"
              />
            </Field>

            <Field label="Slug">
              <Input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); saveSlug(e.target.value); }}
                className="h-8 text-[12px] font-mono"
                placeholder="page-slug"
              />
            </Field>

            <Field label="External URL">
              <Input
                value={meta.externalUrl || ""}
                onChange={(e) => updateMeta("externalUrl", e.target.value)}
                className="h-8 text-[12px]"
                placeholder="https://example.com"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={metaDesc}
                onChange={(e) => { setMetaDesc(e.target.value); saveMetaDesc(e.target.value); }}
                rows={2}
                maxLength={160}
                className="flex w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] resize-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                placeholder="Brief page description..."
              />
              <div className="text-right text-[10px] text-muted-foreground mt-0.5">{metaDesc.length}/160</div>
            </Field>

            <Field label="Sidebar Title">
              <Input
                value={meta.sidebarTitle || ""}
                onChange={(e) => updateMeta("sidebarTitle", e.target.value)}
                className="h-8 text-[12px]"
                placeholder="Defaults to page title"
              />
            </Field>

            <Field label="Icon">
              <Input
                value={meta.icon || ""}
                onChange={(e) => updateMeta("icon", e.target.value)}
                className="h-8 text-[12px]"
                placeholder="lucide icon name"
              />
            </Field>

            <Field label="OG Image URL">
              <Input
                value={meta.ogImage || ""}
                onChange={(e) => updateMeta("ogImage", e.target.value)}
                className="h-8 text-[12px]"
                placeholder="https://.../og.png"
              />
            </Field>

            <Field label="Keywords">
              <Input
                value={meta.keywords || ""}
                onChange={(e) => updateMeta("keywords", e.target.value)}
                className="h-8 text-[12px]"
                placeholder="comma, separated, keywords"
              />
            </Field>

            <Field label="Tag">
              <Input
                value={meta.tag || ""}
                onChange={(e) => updateMeta("tag", e.target.value)}
                className="h-8 text-[12px]"
                placeholder="e.g. NEW, Beta"
              />
            </Field>

            <Field label="Mode">
              <Select
                value={meta.mode || "default"}
                onValueChange={(v) => updateMeta("mode", v as PageMetadata["mode"])}
              >
                <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-[12px]">Default</SelectItem>
                  <SelectItem value="wide" className="text-[12px]">Wide</SelectItem>
                  <SelectItem value="custom" className="text-[12px]">Custom</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center justify-between pt-1">
              <Label className="text-[11px] font-medium text-foreground">Hidden</Label>
              <Switch
                checked={meta.hidden === true}
                onCheckedChange={(v) => updateMeta("hidden", v)}
              />
            </div>

            <div className="pt-2 border-t border-border/40">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">File Path</Label>
              <div className="mt-1 px-2 py-1.5 rounded-md bg-muted/50 text-[11px] font-mono text-muted-foreground truncate">
                {filePath}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
      {label}
    </Label>
    {children}
  </div>
);

export default PageSettingsPanel;
