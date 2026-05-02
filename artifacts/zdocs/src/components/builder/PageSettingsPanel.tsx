import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { useApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, FileText, AlertCircle } from "lucide-react";
import type { Page } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";

// Slugs must be lowercase URL-safe identifiers. Empty or invalid slugs would
// 404 the published page so we block save until the field is well-formed.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

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

/** Per-page settings panel — supports floating (legacy) and bottomBar (Mintlify-style) variants.
 *  All writes go through the authenticated API client so cookies + error handling are consistent. */
const PageSettingsPanel = ({ page, settings, projectSlug, variant = "floating" }: Props) => {
  const [collapsed, setCollapsed] = useState(true);
  const api = useApi();
  const { toast } = useToast();

  const [slug, setSlug] = useState(page.slug || "");
  const [metaDesc, setMetaDesc] = useState(page.meta_description || "");
  const [meta, setMeta] = useState<PageMetadata>(((page as any).metadata || {}) as PageMetadata);

  const slugIsValid = useMemo(() => !slug || SLUG_RE.test(slug), [slug]);

  useEffect(() => {
    setSlug(page.slug || "");
    setMetaDesc(page.meta_description || "");
    setMeta(((page as any).metadata || {}) as PageMetadata);
  }, [page.id, page.slug, page.meta_description, (page as any).metadata]);

  // All saves go through useApi so cookies are sent and errors surface as toasts.
  const saveSlug = useDebouncedCallback((v: string) => {
    if (!v || !SLUG_RE.test(v)) return; // never persist a malformed slug
    api.patch(`/pages/${page.id}`, { slug: v })
      .catch((e: any) => toast({ title: "Couldn't save slug", description: e?.message, variant: "destructive" }));
  }, 700);
  const saveMetaDesc = useDebouncedCallback((v: string) => {
    api.patch(`/pages/${page.id}`, { metaDescription: v })
      .catch((e: any) => toast({ title: "Couldn't save description", description: e?.message, variant: "destructive" }));
  }, 700);
  const saveMeta = useDebouncedCallback((next: PageMetadata) => {
    api.patch(`/pages/${page.id}`, { metadata: next })
      .catch((e: any) => toast({ title: "Couldn't save metadata", description: e?.message, variant: "destructive" }));
  }, 700);
  const saveTitle = useDebouncedCallback((v: string) => {
    const title = v.trim();
    if (!title) return; // titles must not be empty
    api.patch(`/pages/${page.id}`, { title })
      .catch((e: any) => toast({ title: "Couldn't save title", description: e?.message, variant: "destructive" }));
  }, 500);

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
              saveTitle={saveTitle}
              slugIsValid={slugIsValid}
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
            <PageSettingsForm
              page={page}
              slug={slug}
              setSlug={setSlug}
              saveSlug={saveSlug}
              saveTitle={saveTitle}
              slugIsValid={slugIsValid}
              metaDesc={metaDesc}
              setMetaDesc={setMetaDesc}
              saveMetaDesc={saveMetaDesc}
              meta={meta}
              updateMeta={updateMeta}
              filePath={filePath}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface FormProps {
  page: Page;
  slug: string;
  setSlug: (v: string) => void;
  saveSlug: (v: string) => void;
  saveTitle: (v: string) => void;
  slugIsValid: boolean;
  metaDesc: string;
  setMetaDesc: (v: string) => void;
  saveMetaDesc: (v: string) => void;
  meta: PageMetadata;
  updateMeta: <K extends keyof PageMetadata>(key: K, value: PageMetadata[K]) => void;
  filePath: string;
}

const PageSettingsForm = ({
  page, slug, setSlug, saveSlug, saveTitle, slugIsValid, metaDesc, setMetaDesc, saveMetaDesc, meta, updateMeta, filePath,
}: FormProps) => {
  // Local mirror so the input is responsive even though saves are debounced.
  const [titleLocal, setTitleLocal] = useState(page.title);
  useEffect(() => { setTitleLocal(page.title); }, [page.id, page.title]);
  const titleInvalid = !titleLocal.trim();

  return (
  <>
    <Field label="Title">
      <Input
        value={titleLocal}
        onChange={(e) => { setTitleLocal(e.target.value); saveTitle(e.target.value); }}
        className={`h-8 text-[12px] ${titleInvalid ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
      />
      {titleInvalid && (
        <p className="mt-1 text-[10.5px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Title is required
        </p>
      )}
    </Field>

    <Field label="Slug">
      <Input
        value={slug}
        onChange={(e) => { setSlug(e.target.value); saveSlug(e.target.value); }}
        className={`h-8 text-[12px] font-mono ${!slugIsValid ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
        placeholder="page-slug"
      />
      {!slugIsValid && (
        <p className="mt-1 text-[10.5px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Lowercase letters, numbers, and hyphens only
        </p>
      )}
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
  </>
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
