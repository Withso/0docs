import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { supabase } from "@/integrations/supabase/client";
import type { Page } from "@/hooks/use-builder";

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

interface Props {
  page: Page | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug?: string;
}

/**
 * Mintlify-style per-page settings dialog.
 * Triggered from the gear icon on each page row in the editor sidebar.
 */
const PageSettingsDialog = ({ page, open, onOpenChange, projectSlug }: Props) => {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [meta, setMeta] = useState<PageMetadata>({});

  useEffect(() => {
    if (page) {
      setSlug(page.slug || "");
      setTitle(page.title || "");
      setMetaDesc(page.meta_description || "");
      setMeta(((page as any).metadata || {}) as PageMetadata);
    }
  }, [page?.id]);

  const saveTitle = useDebouncedCallback((v: string) => {
    if (!page) return;
    supabase.from("pages").update({ title: v }).eq("id", page.id).then(() => {});
  }, 600);
  const saveSlug = useDebouncedCallback((v: string) => {
    if (!page) return;
    supabase.from("pages").update({ slug: v }).eq("id", page.id).then(() => {});
  }, 600);
  const saveMetaDesc = useDebouncedCallback((v: string) => {
    if (!page) return;
    supabase.from("pages").update({ meta_description: v }).eq("id", page.id).then(() => {});
  }, 600);
  const saveMeta = useDebouncedCallback((next: PageMetadata) => {
    if (!page) return;
    supabase.from("pages").update({ metadata: next as any }).eq("id", page.id).then(() => {});
  }, 600);

  const updateMeta = <K extends keyof PageMetadata>(key: K, value: PageMetadata[K]) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    saveMeta(next);
  };

  if (!page) return null;
  const filePath = `${projectSlug || "docs"}/${slug || "untitled"}.mdx`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Page Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); saveTitle(e.target.value); }}
              className="h-9 text-[12px]"
            />
          </Field>

          <Field label="Slug">
            <Input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); saveSlug(e.target.value); }}
              className="h-9 text-[12px] font-mono"
              placeholder="page-slug"
            />
          </Field>

          <Field label="External URL">
            <Input
              value={meta.externalUrl || ""}
              onChange={(e) => updateMeta("externalUrl", e.target.value)}
              className="h-9 text-[12px]"
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
              className="h-9 text-[12px]"
              placeholder="Defaults to page title"
            />
          </Field>

          <Field label="Icon">
            <Input
              value={meta.icon || ""}
              onChange={(e) => updateMeta("icon", e.target.value)}
              className="h-9 text-[12px]"
              placeholder="lucide icon name"
            />
          </Field>

          <Field label="OG Image URL">
            <Input
              value={meta.ogImage || ""}
              onChange={(e) => updateMeta("ogImage", e.target.value)}
              className="h-9 text-[12px]"
              placeholder="https://.../og.png"
            />
          </Field>

          <Field label="Keywords">
            <Input
              value={meta.keywords || ""}
              onChange={(e) => updateMeta("keywords", e.target.value)}
              className="h-9 text-[12px]"
              placeholder="comma, separated, keywords"
            />
          </Field>

          <Field label="Tag">
            <Input
              value={meta.tag || ""}
              onChange={(e) => updateMeta("tag", e.target.value)}
              className="h-9 text-[12px]"
              placeholder="e.g. NEW, Beta"
            />
          </Field>

          <Field label="Mode">
            <Select
              value={meta.mode || "default"}
              onValueChange={(v) => updateMeta("mode", v as PageMetadata["mode"])}
            >
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default" className="text-[12px]">Default</SelectItem>
                <SelectItem value="wide" className="text-[12px]">Wide</SelectItem>
                <SelectItem value="custom" className="text-[12px]">Custom</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center justify-between pt-1">
            <Label className="text-[12px] font-medium">Hidden</Label>
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
      </DialogContent>
    </Dialog>
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

export default PageSettingsDialog;
