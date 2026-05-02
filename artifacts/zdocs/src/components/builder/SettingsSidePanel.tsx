import { useEffect, useState, useCallback } from "react";
import {
  X, Trash2, Type, Image as ImageIcon, Pipette, EyeOff, Globe,
  FileText, Tag as TagIcon, Hash, Sparkles, Layers as LayersIcon,
  ChevronDown, GripVertical, Plus, Languages, Box, GitBranch,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import type { Page, NavGroup, Tab, Section } from "@/hooks/use-builder";
import type { NavSettingsKind } from "./NavigationTree";

/**
 * Mintlify-style **side** settings panel.
 * Slides in next to the Navigation column. Auto-saves with debouncing.
 *
 * Now supports ALL nav item kinds:
 *   page | group | dropdown | tab | language | product | version
 *
 * Page settings additionally include an editable "Sections" list (the
 * sections of that page). Sections are NOT shown in the navigation tree
 * anymore — they live here.
 */

export type SettingsTarget =
  | { kind: "page"; page: Page }
  | { kind: "group" | "dropdown"; group: NavGroup }
  | { kind: "tab" | "language" | "product" | "version"; tab: Tab };

interface Props {
  target: SettingsTarget | null;
  onClose: () => void;
  width?: number;
  projectSlug?: string;
  tabs?: Tab[];
  onPageUpdated?: (pageId: string, updates: Partial<Page>) => void;
  onGroupUpdated?: (groupId: string, updates: Partial<NavGroup>) => void;
  onTabUpdated?: (tabId: string, updates: Partial<Tab>) => void;
  onDeletePage?: (pageId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onDeleteTab?: (tabId: string) => void;
}

const headerLabelFor = (target: SettingsTarget) => {
  switch (target.kind) {
    case "page":     return "Page settings";
    case "group":    return "Group settings";
    case "dropdown": return "Dropdown settings";
    case "tab":      return "Tab settings";
    case "language": return "Language settings";
    case "product":  return "Product settings";
    case "version":  return "Version settings";
  }
};

const SettingsSidePanel = ({
  target,
  onClose,
  width = 360,
  projectSlug,
  tabs = [],
  onPageUpdated,
  onGroupUpdated,
  onTabUpdated,
  onDeletePage,
  onDeleteGroup,
  onDeleteTab,
}: Props) => {
  if (!target) return null;

  const handleDelete = () => {
    if (target.kind === "page") onDeletePage?.(target.page.id);
    else if (target.kind === "group" || target.kind === "dropdown") onDeleteGroup?.(target.group.id);
    else if (target.kind === "tab" || target.kind === "language" || target.kind === "product" || target.kind === "version") onDeleteTab?.(target.tab.id);
    onClose();
  };

  return (
    /* Side panel fits the parent's height (workspace shell is h-screen).
       Internal body scrolls; header stays pinned. */
    <aside
      className="shrink-0 border-r border-border/40 bg-background flex flex-col self-stretch min-h-0 animate-slide-in-right"
      style={{ width }}
    >
      <div className="flex items-center justify-between px-3 h-10 border-b border-border/40 shrink-0">
        <span className="text-[12.5px] font-medium text-foreground truncate">{headerLabelFor(target)}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleDelete}
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

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {target.kind === "page" && (
          <PageBody page={target.page} projectSlug={projectSlug} onPageUpdated={onPageUpdated} />
        )}
        {(target.kind === "group" || target.kind === "dropdown") && (
          <GroupBody group={target.group} tabs={tabs} onGroupUpdated={onGroupUpdated} />
        )}
        {(target.kind === "tab" || target.kind === "language" || target.kind === "product" || target.kind === "version") && (
          <TabBody tab={target.tab} kind={target.kind} onTabUpdated={onTabUpdated} />
        )}
      </div>
    </aside>
  );
};

/* ───────────────────────── PAGE BODY ───────────────────────── */

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

const PageBody = ({
  page, projectSlug, onPageUpdated,
}: {
  page: Page;
  projectSlug?: string;
  onPageUpdated?: (id: string, u: Partial<Page>) => void;
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
    fetch(`/api/pages/${page.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: v }) }).catch(() => {});
    onPageUpdated?.(page.id, { title: v });
  }, 500);
  const saveSlug = useDebouncedCallback((v: string) => {
    fetch(`/api/pages/${page.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: v }) }).catch(() => {});
    onPageUpdated?.(page.id, { slug: v });
  }, 500);
  const saveMetaDesc = useDebouncedCallback((v: string) => {
    fetch(`/api/pages/${page.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metaDescription: v }) }).catch(() => {});
    onPageUpdated?.(page.id, { meta_description: v });
  }, 500);
  const saveMeta = useDebouncedCallback((next: PageMetadata) => {
    fetch(`/api/pages/${page.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metadata: next }) }).catch(() => {});
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
      <Section title="General">
        <Row icon={Type} label="Title">
          <PlainInput value={title} onChange={(v) => { setTitle(v); saveTitle(v); }} />
        </Row>
        <Row icon={Hash} label="Slug">
          <PlainInput value={slug} onChange={(v) => { setSlug(v); saveSlug(v); }} mono placeholder="page-slug" />
        </Row>
        <Row icon={ImageIcon} label="Icon">
          <PlainInput value={meta.icon || ""} onChange={(v) => updateMeta("icon", v)} placeholder="lucide name" />
        </Row>
        <Row icon={TagIcon} label="Tag">
          <PlainInput value={meta.tag || ""} onChange={(v) => updateMeta("tag", v)} placeholder="NEW, Beta…" />
        </Row>
        <Row icon={EyeOff} label="Hidden">
          <Switch checked={meta.hidden === true} onCheckedChange={(v) => updateMeta("hidden", v)} />
        </Row>
      </Section>

      <Section title="Sections">
        <SectionsList pageId={page.id} />
      </Section>

      <Section title="SEO">
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
          <PlainInput value={meta.ogImage || ""} onChange={(v) => updateMeta("ogImage", v)} placeholder="https://…/og.png" />
        </Row>
        <Row icon={TagIcon} label="Keywords">
          <PlainInput value={meta.keywords || ""} onChange={(v) => updateMeta("keywords", v)} placeholder="comma, separated" />
        </Row>
        <Row icon={FileText} label="Sidebar title">
          <PlainInput value={meta.sidebarTitle || ""} onChange={(v) => updateMeta("sidebarTitle", v)} placeholder="Defaults to title" />
        </Row>
      </Section>

      <Section title="Advanced">
        <Row icon={Globe} label="External URL">
          <PlainInput value={meta.externalUrl || ""} onChange={(v) => updateMeta("externalUrl", v)} placeholder="https://example.com" />
        </Row>
        <Row icon={LayersIcon} label="Mode">
          <Select value={meta.mode || "default"} onValueChange={(v) => updateMeta("mode", v as PageMetadata["mode"])}>
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
      </Section>

      <div className="pt-2 mt-2 border-t border-border/40">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">File path</div>
        <div className="px-2 py-1.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground truncate">
          {filePath}
        </div>
      </div>
    </>
  );
};

/* ─── Sections list (inside Page settings) ─── */
const SectionsList = ({ pageId }: { pageId: string }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sections?pageId=${pageId}`);
      const data = res.ok ? await res.json() : [];
      setSections((data || []) as Section[]);
    } catch {
      setSections([]);
    }
    setLoading(false);
  }, [pageId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const addSection = async () => {
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, title: "New Section", orderIndex: sections.length }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections((s) => [...s, data as Section]);
        window.dispatchEvent(new CustomEvent("builder:reloadActivePage"));
      }
    } catch {}
  };

  const renameSection = useDebouncedCallback(async (id: string, title: string) => {
    await fetch(`/api/sections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }).catch(() => {});
    window.dispatchEvent(new CustomEvent("builder:updateSection", { detail: { id, updates: { title } } }));
  }, 500);

  const deleteSection = async (id: string) => {
    await fetch(`/api/sections/${id}`, { method: "DELETE" }).catch(() => {});
    setSections((s) => s.filter((x) => x.id !== id));
    window.dispatchEvent(new CustomEvent("builder:reloadActivePage"));
  };

  if (loading) {
    return <div className="text-[11.5px] text-muted-foreground/70 px-1 py-2">Loading…</div>;
  }

  return (
    <div className="space-y-1">
      {sections.length === 0 && (
        <div className="text-[11.5px] text-muted-foreground/70 italic px-1 py-1">
          No sections yet on this page.
        </div>
      )}
      {sections.map((sec) => (
        <div key={sec.id} className="group flex items-center gap-1 px-1 py-0.5 rounded-md hover:bg-muted/40">
          <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <input
            defaultValue={sec.title.replace(/<[^>]+>/g, "")}
            onChange={(e) => renameSection(sec.id, e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[12px] outline-none border-none focus:bg-background/50 rounded px-1"
          />
          <button
            onClick={() => deleteSection(sec.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive"
            title="Delete section"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        onClick={addSection}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <Plus className="h-3 w-3" /> Add section
      </button>
    </div>
  );
};

/* ───────────────────────── GROUP BODY ───────────────────────── */

interface GroupMetadata {
  hidden?: boolean;
  expanded?: boolean;
  tag?: string;
  icon?: string;
  openapiSpec?: string;
  asyncapiSpec?: string;
  color?: string;
  description?: string;
  link?: string;
}

const GroupBody = ({
  group, tabs, onGroupUpdated,
}: {
  group: NavGroup;
  tabs: Tab[];
  onGroupUpdated?: (id: string, u: Partial<NavGroup>) => void;
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
    fetch(`/api/navgroups/${group.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: v }) }).catch(() => {});
    onGroupUpdated?.(group.id, { title: v });
  }, 500);
  const saveType = (v: "label" | "text" | "dropdown") => {
    setType(v);
    fetch(`/api/navgroups/${group.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: v }) }).catch(() => {});
    onGroupUpdated?.(group.id, { type: v });
  };
  const saveTab = (v: string) => {
    setTabId(v);
    const next = v === "__none__" ? null : v;
    fetch(`/api/navgroups/${group.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tabId: next }) }).catch(() => {});
    onGroupUpdated?.(group.id, { tab_id: next as any });
  };
  const saveMeta = useDebouncedCallback((next: GroupMetadata) => {
    fetch(`/api/navgroups/${group.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metadata: next }) }).catch(() => {});
    onGroupUpdated?.(group.id, { metadata: next } as any);
  }, 500);

  const updateMeta = <K extends keyof GroupMetadata>(key: K, value: GroupMetadata[K]) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    saveMeta(next);
  };

  const isDropdown = group.type === "dropdown";

  return (
    <>
      <Section title="General">
        <Row icon={Type} label="Title">
          <PlainInput value={title} onChange={(v) => { setTitle(v); saveTitle(v); }} />
        </Row>
        {isDropdown && (
          <Row icon={FileText} label="Description" stack>
            <textarea
              value={meta.description || ""}
              onChange={(e) => updateMeta("description", e.target.value)}
              rows={2}
              className="w-full rounded-md bg-muted/40 border border-transparent hover:border-border/60 focus:border-border px-2.5 py-1.5 text-[12px] resize-none outline-none"
              placeholder="Enter description"
            />
          </Row>
        )}
        <Row icon={LayersIcon} label="Type">
          <Select value={type} onValueChange={(v) => saveType(v as any)}>
            <SelectTrigger className="h-8 text-[12px] bg-muted/40 border-transparent hover:border-border/60 focus:border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="label" className="text-[12px]">Label</SelectItem>
              <SelectItem value="text" className="text-[12px]">Text</SelectItem>
              <SelectItem value="dropdown" className="text-[12px]">Dropdown</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row icon={ImageIcon} label="Icon">
          <PlainInput value={meta.icon || ""} onChange={(v) => updateMeta("icon", v)} placeholder="lucide name" />
        </Row>
        <Row icon={Pipette} label="Color">
          <div className="flex items-center gap-1.5 w-full">
            <div className="h-6 w-7 rounded-md border border-border/60 shrink-0" style={{ background: meta.color || "transparent" }} />
            <PlainInput value={meta.color || ""} onChange={(v) => updateMeta("color", v)} placeholder="#16A34A" mono />
          </div>
        </Row>
        <Row icon={EyeOff} label="Hidden">
          <Switch checked={meta.hidden === true} onCheckedChange={(v) => updateMeta("hidden", v)} />
        </Row>
        {!isDropdown && (
          <Row icon={ChevronDown} label="Expanded">
            <Switch checked={meta.expanded !== false} onCheckedChange={(v) => updateMeta("expanded", v)} />
          </Row>
        )}
        <Row icon={TagIcon} label="Tag">
          <PlainInput value={meta.tag || ""} onChange={(v) => updateMeta("tag", v)} placeholder="NEW, Beta…" />
        </Row>
      </Section>

      {tabs.length > 0 && (
        <Section title="Placement">
          <Row icon={LayersIcon} label="Belongs to">
            <Select value={tabId} onValueChange={saveTab}>
              <SelectTrigger className="h-8 text-[12px] bg-muted/40 border-transparent hover:border-border/60 focus:border-border">
                <SelectValue placeholder="Root" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[12px]">— Root —</SelectItem>
                {tabs.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-[12px]">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </Section>
      )}

      <Section title="API specs">
        <Row icon={Globe} label="OpenAPI">
          <PlainInput value={meta.openapiSpec || ""} onChange={(v) => updateMeta("openapiSpec", v)} placeholder="https://…/openapi.json" />
        </Row>
        <Row icon={Globe} label="AsyncAPI">
          <PlainInput value={meta.asyncapiSpec || ""} onChange={(v) => updateMeta("asyncapiSpec", v)} placeholder="https://…/asyncapi.json" />
        </Row>
      </Section>
    </>
  );
};

/* ───────────────────────── TAB BODY (Tab/Language/Product/Version) ───────────────────────── */

interface TabMetadata {
  kind?: "tab" | "language" | "product" | "version";
  hidden?: boolean;
  isDefault?: boolean;
  locale?: string;            // language only
  badge?: string;
  link?: string;
  description?: string;
  icon?: string;
  color?: string;
}

const TabBody = ({
  tab, kind, onTabUpdated,
}: {
  tab: Tab;
  kind: NavSettingsKind;
  onTabUpdated?: (id: string, u: Partial<Tab>) => void;
}) => {
  const [label, setLabel] = useState(tab.label);
  const [meta, setMeta] = useState<TabMetadata>(((tab.metadata as any) || {}) as TabMetadata);

  useEffect(() => {
    setLabel(tab.label);
    setMeta(((tab.metadata as any) || {}) as TabMetadata);
  }, [tab.id]);

  const saveLabel = useDebouncedCallback((v: string) => {
    fetch(`/api/tabs/${tab.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: v }) }).catch(() => {});
    onTabUpdated?.(tab.id, { label: v });
  }, 500);
  const saveMeta = useDebouncedCallback((next: TabMetadata) => {
    fetch(`/api/tabs/${tab.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metadata: next }) }).catch(() => {});
    onTabUpdated?.(tab.id, { metadata: next } as any);
  }, 500);

  const updateMeta = <K extends keyof TabMetadata>(key: K, value: TabMetadata[K]) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    saveMeta(next);
  };

  const KindIcon = kind === "language" ? Languages
    : kind === "product" ? Box
    : kind === "version" ? GitBranch
    : LayersIcon;

  return (
    <>
      <Section title="General">
        <Row icon={Type} label="Title">
          <PlainInput value={label} onChange={(v) => { setLabel(v); saveLabel(v); }} />
        </Row>
        <Row icon={KindIcon} label="Kind">
          <Select
            value={meta.kind || (kind === "group" ? "tab" : kind)}
            onValueChange={(v) => updateMeta("kind", v as TabMetadata["kind"])}
          >
            <SelectTrigger className="h-8 text-[12px] bg-muted/40 border-transparent hover:border-border/60 focus:border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tab" className="text-[12px]">Tab</SelectItem>
              <SelectItem value="language" className="text-[12px]">Language</SelectItem>
              <SelectItem value="product" className="text-[12px]">Product</SelectItem>
              <SelectItem value="version" className="text-[12px]">Version</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row icon={ImageIcon} label="Icon">
          <PlainInput value={meta.icon || ""} onChange={(v) => updateMeta("icon", v)} placeholder="lucide name" />
        </Row>
        <Row icon={Pipette} label="Color">
          <div className="flex items-center gap-1.5 w-full">
            <div className="h-6 w-7 rounded-md border border-border/60 shrink-0" style={{ background: meta.color || "transparent" }} />
            <PlainInput value={meta.color || ""} onChange={(v) => updateMeta("color", v)} placeholder="#3B82F6" mono />
          </div>
        </Row>
        <Row icon={EyeOff} label="Hidden">
          <Switch checked={meta.hidden === true} onCheckedChange={(v) => updateMeta("hidden", v)} />
        </Row>
      </Section>

      {kind === "language" && (
        <Section title="Language">
          <Row icon={Globe} label="Locale">
            <PlainInput
              value={meta.locale || ""}
              onChange={(v) => updateMeta("locale", v)}
              placeholder="en, ja, es-MX…"
              mono
            />
          </Row>
          <Row icon={Sparkles} label="Default">
            <Switch checked={meta.isDefault === true} onCheckedChange={(v) => updateMeta("isDefault", v)} />
          </Row>
        </Section>
      )}

      {kind === "version" && (
        <Section title="Version">
          <Row icon={Sparkles} label="Default">
            <Switch checked={meta.isDefault === true} onCheckedChange={(v) => updateMeta("isDefault", v)} />
          </Row>
          <Row icon={TagIcon} label="Badge">
            <PlainInput
              value={meta.badge || ""}
              onChange={(v) => updateMeta("badge", v)}
              placeholder="latest, beta…"
            />
          </Row>
        </Section>
      )}

      {kind === "product" && (
        <Section title="Product">
          <Row icon={FileText} label="Description" stack>
            <textarea
              value={meta.description || ""}
              onChange={(e) => updateMeta("description", e.target.value)}
              rows={2}
              className="w-full rounded-md bg-muted/40 border border-transparent hover:border-border/60 focus:border-border px-2.5 py-1.5 text-[12px] resize-none outline-none"
              placeholder="Short product description…"
            />
          </Row>
        </Section>
      )}

      <Section title="Link">
        <Row icon={Globe} label="External URL">
          <PlainInput
            value={meta.link || ""}
            onChange={(v) => updateMeta("link", v)}
            placeholder="https://…"
          />
        </Row>
      </Section>
    </>
  );
};

/* ───────────────────────── PRIMITIVES ───────────────────────── */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="pb-2 mb-2 border-b border-border/30 last:border-0">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1 mb-1">
      {title}
    </div>
    <div className="space-y-0.5">{children}</div>
  </div>
);

const Row = ({
  icon: Icon, label, children, stack,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  stack?: boolean;
}) => (
  <div className={`flex ${stack ? "flex-col gap-1.5" : "items-center gap-3"} py-1 px-1`}>
    <div className={`flex items-center gap-2 text-[12px] text-muted-foreground ${stack ? "" : "w-[110px] shrink-0"}`}>
      <Icon className="h-3.5 w-3.5 opacity-70" />
      <span className="truncate">{label}</span>
    </div>
    <div className={stack ? "" : "flex-1 min-w-0"}>{children}</div>
  </div>
);

const PlainInput = ({
  value, onChange, placeholder, mono,
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
