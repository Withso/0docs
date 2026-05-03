import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/lib/api-client";
import type { Page, Section, Block, NavGroup } from "@/hooks/use-builder";
import { defaultDesignSettings, type DesignSettings } from "@/hooks/use-design-settings";
import { areJsonEqual } from "@/lib/json-compare";

export interface PublishedVersion {
  id: string;
  project_id: string;
  version_number: string;
  is_active: boolean;
  published_at: string;
  published_by: string;
  pages_snapshot: Page[];
  sections_snapshot: Section[];
  blocks_snapshot: Block[];
  design_snapshot: DesignSettings;
  nav_groups_snapshot: NavGroup[];
  editor_changes: EditorChange[];
  design_changes: DesignChange[];
  notes: string | null;
}

export interface EditorChange {
  type:
    | "page_added" | "page_removed" | "page_modified"
    | "section_added" | "section_removed" | "section_modified"
    | "block_added" | "block_removed" | "block_modified"
    | "nav_group_added" | "nav_group_removed" | "nav_group_modified";
  label: string;
  details?: string;
  /** Structural page reference so consumers (e.g. PublishPopover's
   *  Mintlify-style file list) can roll section/block edits up to their
   *  parent page without parsing display labels. Undefined for nav-group
   *  changes (those map to docs.json instead). */
  pageId?: string;
  pageTitle?: string;
  pageSlug?: string;
}

export interface DesignChange {
  property: string;
  label: string;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
}

function normalizeDesignSettingsSnapshot(design: DesignSettings | null): DesignSettings | null {
  if (!design) return null;
  return {
    ...defaultDesignSettings, ...design,
    blockStyles: { ...defaultDesignSettings.blockStyles, ...(design.blockStyles || {}) },
  };
}

function computeEditorChanges(
  prevPages: Page[], currentPages: Page[],
  prevSections: Section[], currentSections: Section[],
  prevBlocks: Block[], currentBlocks: Block[],
  prevNavGroups: NavGroup[], currentNavGroups: NavGroup[],
): EditorChange[] {
  const changes: EditorChange[] = [];

  // Page lookup helpers used to resolve every section/block change back to
  // its owning page (Mintlify file-list rollup needs a stable page id/slug).
  const pageById = new Map<string, Page>();
  for (const p of currentPages) pageById.set(p.id, p);
  for (const p of prevPages) if (!pageById.has(p.id)) pageById.set(p.id, p);
  const sectionPageId = new Map<string, string>();
  for (const s of currentSections) sectionPageId.set(s.id, s.page_id);
  for (const s of prevSections) if (!sectionPageId.has(s.id)) sectionPageId.set(s.id, s.page_id);
  const blockSectionId = new Map<string, string>();
  for (const b of currentBlocks) blockSectionId.set(b.id, b.section_id);
  for (const b of prevBlocks) if (!blockSectionId.has(b.id)) blockSectionId.set(b.id, b.section_id);
  const pageRef = (pageId: string | undefined) => {
    if (!pageId) return {};
    const p = pageById.get(pageId);
    return p ? { pageId: p.id, pageTitle: p.title, pageSlug: p.slug } : { pageId };
  };
  const pageRefForSection = (sectionId: string) => pageRef(sectionPageId.get(sectionId));
  const pageRefForBlock = (blockId: string) => {
    const secId = blockSectionId.get(blockId);
    return secId ? pageRefForSection(secId) : {};
  };

  const prevPageIds = new Set(prevPages.map((p) => p.id));
  const curPageIds = new Set(currentPages.map((p) => p.id));
  for (const p of currentPages) {
    if (!prevPageIds.has(p.id)) {
      changes.push({ type: "page_added", label: `Added page "${p.title}"`, ...pageRef(p.id) });
    } else {
      const old = prevPages.find((op) => op.id === p.id);
      if (old && (old.title !== p.title || old.slug !== p.slug || old.order_index !== p.order_index || old.meta_description !== p.meta_description || old.nav_title !== p.nav_title || old.nav_group_id !== p.nav_group_id)) {
        changes.push({ type: "page_modified", label: `Modified page "${p.title}"`, details: old?.title !== p.title ? `Title: "${old?.title}" → "${p.title}"` : old?.nav_title !== p.nav_title ? "Updated sidebar label" : old?.nav_group_id !== p.nav_group_id ? "Moved page in sidebar" : undefined, ...pageRef(p.id) });
      }
    }
  }
  for (const p of prevPages) { if (!curPageIds.has(p.id)) changes.push({ type: "page_removed", label: `Removed page "${p.title}"`, ...pageRef(p.id) }); }
  const prevSecIds = new Set(prevSections.map((s) => s.id));
  const curSecIds = new Set(currentSections.map((s) => s.id));
  for (const s of currentSections) {
    if (!prevSecIds.has(s.id)) { const page = currentPages.find((p) => p.id === s.page_id); changes.push({ type: "section_added", label: `Added section in "${page?.title || "unknown"}"`, ...pageRefForSection(s.id) }); }
    else { const old = prevSections.find((os) => os.id === s.id); if (old && (old.title !== s.title || old.nav_title !== s.nav_title || old.order_index !== s.order_index)) changes.push({ type: "section_modified", label: "Modified section", details: old.title !== s.title ? `Title: "${old.title}" → "${s.title}"` : old.nav_title !== s.nav_title ? "Updated section sidebar label" : "Reordered sections", ...pageRefForSection(s.id) }); }
  }
  for (const s of prevSections) { if (!curSecIds.has(s.id)) changes.push({ type: "section_removed", label: "Removed a section", ...pageRefForSection(s.id) }); }
  const prevBlockIds = new Set(prevBlocks.map((b) => b.id));
  const curBlockIds = new Set(currentBlocks.map((b) => b.id));
  for (const b of currentBlocks) {
    if (!prevBlockIds.has(b.id)) changes.push({ type: "block_added", label: `Added ${b.type.replace(/_/g, " ")} block`, ...pageRefForBlock(b.id) });
    else { const old = prevBlocks.find((ob) => ob.id === b.id); if (old && !areJsonEqual(old.content, b.content)) changes.push({ type: "block_modified", label: `Modified ${b.type.replace(/_/g, " ")} block`, ...pageRefForBlock(b.id) }); }
  }
  for (const b of prevBlocks) { if (!curBlockIds.has(b.id)) changes.push({ type: "block_removed", label: `Removed ${b.type.replace(/_/g, " ")} block`, ...pageRefForBlock(b.id) }); }
  const prevGroupIds = new Set(prevNavGroups.map((g) => g.id));
  const curGroupIds = new Set(currentNavGroups.map((g) => g.id));
  for (const g of currentNavGroups) {
    if (!prevGroupIds.has(g.id)) changes.push({ type: "nav_group_added", label: `Added sidebar ${g.type === "text" ? "text" : "label"}` });
    else { const old = prevNavGroups.find((pg) => pg.id === g.id); if (old && (old.title !== g.title || old.type !== g.type || old.order_index !== g.order_index)) changes.push({ type: "nav_group_modified", label: "Modified sidebar grouping", details: old.title !== g.title ? "Updated label text" : old.order_index !== g.order_index ? "Reordered sidebar groups" : "Updated group type" }); }
  }
  for (const g of prevNavGroups) { if (!curGroupIds.has(g.id)) changes.push({ type: "nav_group_removed", label: `Removed sidebar ${g.type === "text" ? "text" : "label"}` }); }
  return changes;
}

function computeDesignChanges(prevDesign: DesignSettings | null, currentDesign: DesignSettings): DesignChange[] {
  if (!prevDesign) return [{ property: "all", label: "Initial design settings" }];
  const normalizedPrev = normalizeDesignSettingsSnapshot(prevDesign);
  const normalizedCurrent = normalizeDesignSettingsSnapshot(currentDesign);
  if (!normalizedPrev || !normalizedCurrent) return [{ property: "all", label: "Initial design settings" }];
  const changes: DesignChange[] = [];
  const labelMap: Record<string, string> = { primaryColor: "Primary Color", backgroundColor: "Background Color", foregroundColor: "Text Color", bodyFont: "Body Font", headingFont: "Heading Font", codeFont: "Code Font", baseFontSize: "Base Font Size", headingFontSize: "Heading Font Size", lineHeight: "Line Height", contentMaxWidth: "Content Max Width", sidebarWidth: "Sidebar Width", borderColor: "Border Color", mutedForegroundColor: "Muted Text Color", codeBlockBg: "Code Block Background", sectionSpacing: "Section Spacing", pageTitleSize: "Page Title Size", headingWeight: "Heading Weight", sidebarPageGap: "Sidebar Page Gap", sidebarFontSize: "Sidebar Font Size", sidebarShowSectionTracker: "Sidebar Section Tracker" };
  for (const key of Object.keys(normalizedCurrent)) {
    if (key === "blockStyles") continue;
    const prev = (normalizedPrev as any)[key];
    const cur = (normalizedCurrent as any)[key];
    if (!areJsonEqual(prev, cur)) changes.push({ property: key, label: labelMap[key] || key.replace(/([A-Z])/g, " $1").trim(), oldValue: prev, newValue: cur });
  }
  if (!areJsonEqual(normalizedPrev.blockStyles, normalizedCurrent.blockStyles)) changes.push({ property: "blockStyles", label: "Block style customizations updated" });
  return changes;
}

function normVersion(r: any): PublishedVersion {
  return {
    id: r.id,
    project_id: r.projectId ?? r.project_id,
    version_number: r.versionNumber ?? r.version_number,
    is_active: r.isActive ?? r.is_active,
    published_at: r.publishedAt ?? r.published_at,
    published_by: r.publishedBy ?? r.published_by,
    pages_snapshot: r.pagesSnapshot ?? r.pages_snapshot ?? [],
    sections_snapshot: r.sectionsSnapshot ?? r.sections_snapshot ?? [],
    blocks_snapshot: r.blocksSnapshot ?? r.blocks_snapshot ?? [],
    design_snapshot: r.designSnapshot ?? r.design_snapshot ?? {},
    nav_groups_snapshot: r.navGroupsSnapshot ?? r.nav_groups_snapshot ?? [],
    editor_changes: r.editorChanges ?? r.editor_changes ?? [],
    design_changes: r.designChanges ?? r.design_changes ?? [],
    notes: r.notes ?? null,
  };
}

export function usePublish(projectId: string | undefined, userId: string | undefined) {
  const api = useApi();
  const [versions, setVersions] = useState<PublishedVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await api.get<any[]>(`/projects/${projectId}/published-versions`);
        setVersions((data || []).map(normVersion));
      } catch (e) {
        console.error("Failed to load versions", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const getNextVersion = useCallback(() => {
    if (versions.length === 0) return "0.01";
    const nums = versions.map((v) => parseFloat(v.version_number)).filter((n) => !isNaN(n));
    if (nums.length === 0) return "0.01";
    const max = Math.max(...nums);
    return (max + 0.01).toFixed(2);
  }, [versions]);

  const getLastPublished = useCallback((): PublishedVersion | null => {
    return versions.find((v) => v.is_active) || versions[0] || null;
  }, [versions]);

  const publish = useCallback(async (pages: Page[], sections: Section[], blocks: Block[], designSettings: DesignSettings, navGroups: NavGroup[], notes?: string) => {
    if (!projectId || !userId) return null;
    setPublishing(true);
    const normalizedDesignSettings = normalizeDesignSettingsSnapshot(designSettings) || designSettings;
    const lastPublished = getLastPublished();
    const versionNumber = getNextVersion();
    const editorChanges = computeEditorChanges((lastPublished?.pages_snapshot || []) as Page[], pages, (lastPublished?.sections_snapshot || []) as Section[], sections, (lastPublished?.blocks_snapshot || []) as Block[], blocks, (lastPublished?.nav_groups_snapshot || []) as NavGroup[], navGroups);
    const designChanges = computeDesignChanges(normalizeDesignSettingsSnapshot((lastPublished?.design_snapshot as DesignSettings | null) || null), normalizedDesignSettings);
    try {
      const data = await api.post<any>(`/projects/${projectId}/published-versions`, { versionNumber, isActive: true, publishedBy: userId, pagesSnapshot: pages, sectionsSnapshot: sections, blocksSnapshot: blocks, designSnapshot: normalizedDesignSettings, navGroupsSnapshot: navGroups, editorChanges, designChanges, notes: notes || null });
      const version = normVersion(data);
      setVersions((prev) => [version, ...prev.map((v) => ({ ...v, is_active: false }))]);
      setPublishing(false);
      return { version, editorChanges, designChanges };
    } catch (e) {
      console.error("Failed to publish", e);
      setPublishing(false);
      return null;
    }
  }, [projectId, userId, getLastPublished, getNextVersion]);

  const revertToVersion = useCallback(async (versionId: string) => {
    if (!projectId) return null;
    const version = versions.find((v) => v.id === versionId);
    if (!version) return null;
    await api.post(`/projects/${projectId}/published-versions/${versionId}/revert`, {});
    setVersions((prev) => prev.map((v) => ({ ...v, is_active: v.id === versionId })));
    return version;
  }, [projectId, versions]);

  const previewChanges = useCallback((pages: Page[], sections: Section[], blocks: Block[], designSettings: DesignSettings, navGroups: NavGroup[]) => {
    const normalizedDesignSettings = normalizeDesignSettingsSnapshot(designSettings) || designSettings;
    const lastPublished = getLastPublished();
    const editorChanges = computeEditorChanges((lastPublished?.pages_snapshot || []) as Page[], pages, (lastPublished?.sections_snapshot || []) as Section[], sections, (lastPublished?.blocks_snapshot || []) as Block[], blocks, (lastPublished?.nav_groups_snapshot || []) as NavGroup[], navGroups);
    const designChanges = computeDesignChanges(normalizeDesignSettingsSnapshot((lastPublished?.design_snapshot as DesignSettings | null) || null), normalizedDesignSettings);
    return { editorChanges, designChanges, nextVersion: getNextVersion(), isFirstPublish: versions.length === 0 };
  }, [getLastPublished, getNextVersion, versions.length]);

  return { versions, loading, publishing, publish, revertToVersion, previewChanges, getNextVersion, getLastPublished };
}
