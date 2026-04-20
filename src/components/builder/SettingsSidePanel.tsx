import { useEffect, useState } from "react";
import { X, Trash2, Type, Image as ImageIcon, Pipette, EyeOff, Globe, FileText, Tag as TagIcon, Hash, Sparkles, Layers as LayersIcon, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { supabase } from "@/integrations/supabase/client";
import type { Page, NavGroup, Tab } from "@/hooks/use-builder";

/**
 * Mintlify-style **side** settings panel.
 * Slides in next to the Navigation column (NOT a modal dialog).
 * Supports two targets:
 *   - kind "page"  → edit a Page
 *   - kind "group" → edit a NavGroup (label / text / dropdown)
 *
 * Auto-saves with debouncing — no Save button.
 */

export type SettingsTarget =
  | { kind: "page"; page: Page }
  | { kind: "group"; group: NavGroup };

interface Props {
  target: SettingsTarget | null;
  onClose: () => void;
  width?: number;
  projectSlug?: string;
  tabs?: Tab[];
  /** Sync newly-saved row back into builder state. */
  onPageUpdated?: (pageId: string, updates: Partial<Page>) => void;
  onGroupUpdated?: (groupId: string, updates: Partial<NavGroup>) => void;
  onDeletePage?: (pageId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
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

interface GroupMetadata {
  hidden?: boolean;
  expanded?: boolean;
  tag?: string;
  icon?: string;
  openapiSpec?: string;
  asyncapiSpec?: string;
  color?: string;
}

const SettingsSidePanel = ({
  target,
  onClose,
  width = 340,
  projectSlug,
  tabs = [],
  onPageUpdated,
  onGroupUpdated,
  onDeletePage,
  onDeleteGroup,
}: Props) => {
  if (!target) return null;

  const headerLabel =
    target.kind === "page"
      ? "Page settings"
      : target.kind === "group"
        ? target.group.type === "dropdown"
          ? "Dropdown settings"
          : target.group.type === "text"
            ? "Text settings"
            : "Group settings"
        : "Settings";

  return (
    <aside
      className="shrink-0 border-r border-border/40 bg-background flex flex-col h-screen sticky top-0 animate-slide-in-right"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-11 border-b border-border/40 shrink-0">
        <span className="text-[13px] font-medium text-foreground truncate">{headerLabel}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              if (target.kind === "page") onDeletePage?.(target.page.id);
              else onDeleteGroup?.(target.group.id);
              onClose();
            }}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {target.kind === "page" ? (
          <PageSettingsBody
            page={target.page}
            projectSlug={projectSlug}
            onPageUpdated={onPageUpdated}
          />
        ) : (
          <GroupSettingsBody
            group={target.group}
            tabs={tabs}
            onGroupUpdated={onGroupUpdated}
          />
        )}
      </div>
    </aside>
  );
};

/* ───────────────────────────────────────── PAGE BODY ───────────────────────────────────────── */

const PageSettingsBody = ({
  page,
  projectSlug,
  onPageUpdated,
}: {
  page: Page;
  projectSlug?: string;
  onPageUpdated?: (pageId: string, updates: Partial<Page>) => void;
}) => {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug || "");
  const [metaDesc, setMetaDesc] = useState(page.meta_description || "");
  const [meta, setMeta] = useState<PageMetadata>(((page as any).metadata || {}) as PageMetadata);

  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug || "");
    setMetaDesc(page.meta_description || "");
    setMeta(((page as any).metadata || {}) as PageMetadata);
  }, [page.id]);

  const saveTitle = useDebouncedCallback((v: string) => {
    supabase.from("pages").update({ title: v }).eq("id", page.id).then(() => {});
    onPageUpdated?.(page.id, { title: v });
  }, 500);
  const saveSlug = useDebouncedCallback((v: string) => {
    supabase.from("pages").update({ slug: v }).eq("id", page.id).then(() => {});
    onPageUpdated?.(page.id, { slug: v });
  }, 500);
  const saveMetaDesc = useDebouncedCallback((v: string) => {
    supabase.from("pages").update({ meta_description: v }).eq("id", page.id).then(() => {});
    onPageUpdated?.(page.id, { meta_description: v });
  }, 500);
  const saveMeta = useDebouncedCallback((next: PageMetadata) => {
    supabase.from("pages").update({ metadata: next as any }).eq("id", page.id).then(() => {});
    onPageUpdated?.(page.id, { metadata: next } as any);
  }, 500);

  const updateMeta = <K extends keyof PageMetadata>(key: K, value: PageMetadata[K]) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    saveMeta(next);
  };

  const filePath = `${projectSlug || "docs"}/${slug || "untitled"}.mdx`;

  return (
    <>
      <Row icon={Type} label="Title">
        <PlainInput
          value={title}
          onChange={(v) => { setTitle(v); saveTitle(v); }}
        />
      </Row>

      <Row icon={Hash} label="Slug">
        <PlainInput
          value={slug}
          onChange={(v) => { setSlug(v); saveSlug(v); }}
          mono
          placeholder="page-slug"
        />
      </Row>

      <Row icon={ImageIcon} label="Icon">
        <PlainInput
          value={meta.icon || ""}
          onChange={(v) => updateMeta("icon", v)}
          placeholder="lucide icon name"
        />
      </Row>

      <Row icon={TagIcon} label="Tag">
        <PlainInput
          value={meta.tag || ""}
          onChange={(v) => updateMeta("tag", v)}
          placeholder="NEW, Beta…"
        />
      </Row>

      <Divider />

      <Row icon={EyeOff} label="Hidden">
        <Switch checked={meta.hidden === true} onCheckedChange={(v) => updateMeta("hidden", v)} />
      </Row>

      <Row icon={Globe} label="External URL">
        <PlainInput
          value={meta.externalUrl || ""}
          onChange={(v) => updateMeta("externalUrl", v)}
          placeholder="https://example.com"
        />
      </Row>

      <Divider />

      <Row icon={FileText} label="Sidebar title">
        <PlainInput
          value={meta.sidebarTitle || ""}
          onChange={(v) => updateMeta("sidebarTitle", v)}
          placeholder="Defaults to page title"
        />
      </Row>

      <Row icon={Sparkles} label="Description" stack>
        <textarea
          value={metaDesc}
          onChange={(e) => { setMetaDesc(e.target.value); saveMetaDesc(e.target.value); }}
          rows={2}
          maxLength={160}
          className="w-full rounded-md bg-muted/40 border border-transparent hover:border-border/60 focus:border-border px-2.5 py-1.5 text-[12px] resize-none outline-none"
          placeholder="Brief page description…"
        />
        <div className="text-right text-[10px] text-muted-foreground mt-0.5">{metaDesc.length}/160</div>
      </Row>

      <Row icon={ImageIcon} label="OG image">
        <PlainInput
          value={meta.ogImage || ""}
          onChange={(v) => updateMeta("ogImage", v)}
          placeholder="https://…/og.png"
        />
      </Row>

      <Row icon={TagIcon} label="Keywords">
        <PlainInput
          value={meta.keywords || ""}
          onChange={(v) => updateMeta("keywords", v)}
          placeholder="comma, separated"
        />
      </Row>

      <Row icon={LayersIcon} label="Mode">
        <Select
          value={meta.mode || "default"}
          onValueChange={(v) => updateMeta("mode", v as PageMetadata["mode"])}
        >
          <SelectTrigger className="h-8 text-[12px] bg-muted/40 border-transparent hover:border-border/60 focus:border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default" className="text-[12px]">Default</SelectItem>
            <SelectItem value="wide" className="text-[12px]">Wide</SelectItem>
            <SelectItem value="custom" className="text-[12px]">Custom</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <div className="pt-3 mt-2 border-t border-border/40">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">File path</div>
        <div className="px-2 py-1.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground truncate">
          {filePath}
        </div>
      </div>
    </>
  );
};

/* ───────────────────────────────────────── GROUP BODY ───────────────────────────────────────── */

const GroupSettingsBody = ({
  group,
  tabs,
  onGroupUpdated,
}: {
  group: NavGroup;
  tabs: Tab[];
  onGroupUpdated?: (groupId: string, updates: Partial<NavGroup>) => void;
}) => {
  const [title, setTitle] = useState(group.title);
  const [type, setType] = useState<"label" | "text" | "dropdown">((group.type as any) || "label");
  const [tabId, setTabId] = useState<string>((group.tab_id as string) || "__none__");
  const [meta, setMeta] = useState<GroupMetadata>(((group as any).metadata || {}) as GroupMetadata);

  useEffect(() => {
    setTitle(group.title);
    setType((group.type as any) || "label");
    setTabId((group.tab_id as string) || "__none__");
    setMeta(((group as any).metadata || {}) as GroupMetadata);
  }, [group.id]);

  const saveTitle = useDebouncedCallback((v: string) => {
    supabase.from("nav_groups").update({ title: v }).eq("id", group.id).then(() => {});
    onGroupUpdated?.(group.id, { title: v });
  }, 500);
  const saveType = (v: "label" | "text" | "dropdown") => {
    setType(v);
    supabase.from("nav_groups").update({ type: v }).eq("id", group.id).then(() => {});
    onGroupUpdated?.(group.id, { type: v });
  };
  const saveTab = (v: string) => {
    setTabId(v);
    const next = v === "__none__" ? null : v;
    (supabase as any).from("nav_groups").update({ tab_id: next }).eq("id", group.id).then(() => {});
    onGroupUpdated?.(group.id, { tab_id: next as any });
  };
  const saveMeta = useDebouncedCallback((next: GroupMetadata) => {
    (supabase as any).from("nav_groups").update({ metadata: next }).eq("id", group.id).then(() => {});
    onGroupUpdated?.(group.id, { metadata: next } as any);
  }, 500);

  const updateMeta = <K extends keyof GroupMetadata>(key: K, value: GroupMetadata[K]) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    saveMeta(next);
  };

  return (
    <>
      <Row icon={Type} label="Title">
        <PlainInput value={title} onChange={(v) => { setTitle(v); saveTitle(v); }} />
      </Row>

      <Row icon={LayersIcon} label="Type">
        <Select value={type} onValueChange={(v) => saveType(v as any)}>
          <SelectTrigger className="h-8 text-[12px] bg-muted/40 border-transparent hover:border-border/60 focus:border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="label" className="text-[12px]">Label (header)</SelectItem>
            <SelectItem value="text" className="text-[12px]">Text (plain row)</SelectItem>
            <SelectItem value="dropdown" className="text-[12px]">Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row icon={ImageIcon} label="Icon">
        <PlainInput
          value={meta.icon || ""}
          onChange={(v) => updateMeta("icon", v)}
          placeholder="lucide icon name"
        />
      </Row>

      <Row icon={Pipette} label="Color">
        <div className="flex items-center gap-1.5 w-full">
          <div
            className="h-6 w-7 rounded-md border border-border/60 shrink-0"
            style={{ background: meta.color || "transparent" }}
          />
          <PlainInput
            value={meta.color || ""}
            onChange={(v) => updateMeta("color", v)}
            placeholder="#16A34A"
            mono
          />
        </div>
      </Row>

      <Divider />

      <Row icon={EyeOff} label="Hidden">
        <Switch checked={meta.hidden === true} onCheckedChange={(v) => updateMeta("hidden", v)} />
      </Row>

      <Row icon={ChevronDown} label="Expanded by default">
        <Switch checked={meta.expanded !== false} onCheckedChange={(v) => updateMeta("expanded", v)} />
      </Row>

      <Row icon={TagIcon} label="Tag">
        <PlainInput
          value={meta.tag || ""}
          onChange={(v) => updateMeta("tag", v)}
          placeholder="NEW, Beta…"
        />
      </Row>

      {tabs.length > 0 && (
        <Row icon={LayersIcon} label="Belongs to tab">
          <Select value={tabId} onValueChange={saveTab}>
            <SelectTrigger className="h-8 text-[12px] bg-muted/40 border-transparent hover:border-border/60 focus:border-border">
              <SelectValue placeholder="No tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-[12px]">— None —</SelectItem>
              {tabs.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-[12px]">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      )}

      <Divider />

      <Row icon={Globe} label="OpenAPI spec">
        <PlainInput
          value={meta.openapiSpec || ""}
          onChange={(v) => updateMeta("openapiSpec", v)}
          placeholder="https://…/openapi.json"
        />
      </Row>

      <Row icon={Globe} label="AsyncAPI spec">
        <PlainInput
          value={meta.asyncapiSpec || ""}
          onChange={(v) => updateMeta("asyncapiSpec", v)}
          placeholder="https://…/asyncapi.json"
        />
      </Row>
    </>
  );
};

/* ───────────────────────────────────────── PRIMITIVES ───────────────────────────────────────── */

const Row = ({
  icon: Icon,
  label,
  children,
  stack,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  stack?: boolean;
}) => (
  <div className={`flex ${stack ? "flex-col gap-1.5" : "items-center gap-3"} py-1.5 px-1`}>
    <div className={`flex items-center gap-2 text-[12px] text-muted-foreground ${stack ? "" : "w-[110px] shrink-0"}`}>
      <Icon className="h-3.5 w-3.5 opacity-70" />
      <span className="truncate">{label}</span>
    </div>
    <div className={stack ? "" : "flex-1 min-w-0"}>{children}</div>
  </div>
);

const Divider = () => <div className="h-px bg-border/40 my-1.5 -mx-1" />;

const PlainInput = ({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) => (
  <Input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`h-8 text-[12px] bg-muted/40 border-transparent hover:border-border/60 focus:border-border focus-visible:ring-0 ${mono ? "font-mono" : ""}`}
  />
);

export default SettingsSidePanel;
