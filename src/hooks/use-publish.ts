import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Page, Section, Block, NavGroup } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";

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
  type: "page_added" | "page_removed" | "page_modified" | "section_added" | "section_removed" | "section_modified" | "block_added" | "block_removed" | "block_modified";
  label: string;
  details?: string;
}

export interface DesignChange {
  property: string;
  label: string;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
}

function computeEditorChanges(
  prevPages: Page[], currentPages: Page[],
  prevSections: Section[], currentSections: Section[],
  prevBlocks: Block[], currentBlocks: Block[],
): EditorChange[] {
  const changes: EditorChange[] = [];

  // Pages
  const prevPageIds = new Set(prevPages.map(p => p.id));
  const curPageIds = new Set(currentPages.map(p => p.id));
  
  for (const p of currentPages) {
    if (!prevPageIds.has(p.id)) {
      changes.push({ type: "page_added", label: `Added page "${p.title}"` });
    } else {
      const old = prevPages.find(op => op.id === p.id);
      if (old && (old.title !== p.title || old.slug !== p.slug || old.order_index !== p.order_index || old.meta_description !== p.meta_description)) {
        changes.push({ type: "page_modified", label: `Modified page "${p.title}"`, details: old.title !== p.title ? `Title: "${old.title}" → "${p.title}"` : undefined });
      }
    }
  }
  for (const p of prevPages) {
    if (!curPageIds.has(p.id)) {
      changes.push({ type: "page_removed", label: `Removed page "${p.title}"` });
    }
  }

  // Sections
  const prevSecIds = new Set(prevSections.map(s => s.id));
  const curSecIds = new Set(currentSections.map(s => s.id));
  
  for (const s of currentSections) {
    if (!prevSecIds.has(s.id)) {
      const page = currentPages.find(p => p.id === s.page_id);
      changes.push({ type: "section_added", label: `Added section in "${page?.title || "unknown"}"` });
    } else {
      const old = prevSections.find(os => os.id === s.id);
      if (old && old.title !== s.title) {
        changes.push({ type: "section_modified", label: `Modified section title`, details: `"${old.title}" → "${s.title}"` });
      }
    }
  }
  for (const s of prevSections) {
    if (!curSecIds.has(s.id)) {
      changes.push({ type: "section_removed", label: `Removed a section` });
    }
  }

  // Blocks
  const prevBlockIds = new Set(prevBlocks.map(b => b.id));
  const curBlockIds = new Set(currentBlocks.map(b => b.id));
  
  for (const b of currentBlocks) {
    if (!prevBlockIds.has(b.id)) {
      changes.push({ type: "block_added", label: `Added ${b.type.replace(/_/g, " ")} block` });
    } else {
      const old = prevBlocks.find(ob => ob.id === b.id);
      if (old && JSON.stringify(old.content) !== JSON.stringify(b.content)) {
        changes.push({ type: "block_modified", label: `Modified ${b.type.replace(/_/g, " ")} block` });
      }
    }
  }
  for (const b of prevBlocks) {
    if (!curBlockIds.has(b.id)) {
      changes.push({ type: "block_removed", label: `Removed ${b.type.replace(/_/g, " ")} block` });
    }
  }

  return changes;
}

function computeDesignChanges(
  prevDesign: DesignSettings | null,
  currentDesign: DesignSettings,
): DesignChange[] {
  if (!prevDesign) return [{ property: "all", label: "Initial design settings" }];
  
  const changes: DesignChange[] = [];
  const labelMap: Record<string, string> = {
    primaryColor: "Primary Color", backgroundColor: "Background Color", foregroundColor: "Text Color",
    bodyFont: "Body Font", headingFont: "Heading Font", codeFont: "Code Font",
    baseFontSize: "Base Font Size", headingFontSize: "Heading Font Size", lineHeight: "Line Height",
    contentMaxWidth: "Content Max Width", sidebarWidth: "Sidebar Width",
    borderColor: "Border Color", mutedForegroundColor: "Muted Text Color",
    codeBlockBg: "Code Block Background", sectionSpacing: "Section Spacing",
    pageTitleSize: "Page Title Size", headingWeight: "Heading Weight",
  };

  for (const key of Object.keys(currentDesign)) {
    if (key === "blockStyles") continue;
    const prev = (prevDesign as any)[key];
    const cur = (currentDesign as any)[key];
    if (prev !== cur) {
      changes.push({
        property: key,
        label: labelMap[key] || key.replace(/([A-Z])/g, " $1").trim(),
        oldValue: prev,
        newValue: cur,
      });
    }
  }

  // Block style changes
  if (JSON.stringify(prevDesign.blockStyles) !== JSON.stringify(currentDesign.blockStyles)) {
    changes.push({ property: "blockStyles", label: "Block style customizations updated" });
  }

  return changes;
}

export function usePublish(projectId: string | undefined, userId: string | undefined) {
  const [versions, setVersions] = useState<PublishedVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Load all published versions
  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("published_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("published_at", { ascending: false });
      setVersions((data || []) as unknown as PublishedVersion[]);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const getNextVersion = useCallback(() => {
    if (versions.length === 0) return "0.01";
    const nums = versions.map(v => parseFloat(v.version_number)).filter(n => !isNaN(n));
    if (nums.length === 0) return "0.01";
    const max = Math.max(...nums);
    return (max + 0.01).toFixed(2);
  }, [versions]);

  const getLastPublished = useCallback((): PublishedVersion | null => {
    return versions.find(v => v.is_active) || versions[0] || null;
  }, [versions]);

  const publish = useCallback(async (
    pages: Page[],
    sections: Section[],
    blocks: Block[],
    designSettings: DesignSettings,
    navGroups: NavGroup[],
    notes?: string,
  ) => {
    if (!projectId || !userId) return null;
    setPublishing(true);

    const lastPublished = getLastPublished();
    const versionNumber = getNextVersion();

    // Compute changes
    const editorChanges = computeEditorChanges(
      (lastPublished?.pages_snapshot || []) as Page[],
      pages,
      (lastPublished?.sections_snapshot || []) as Section[],
      sections,
      (lastPublished?.blocks_snapshot || []) as Block[],
      blocks,
    );
    const designChanges = computeDesignChanges(
      lastPublished?.design_snapshot as DesignSettings | null,
      designSettings,
    );

    // Deactivate all previous active versions
    await supabase
      .from("published_versions")
      .update({ is_active: false } as any)
      .eq("project_id", projectId);

    // Insert new version
    const { data, error } = await supabase
      .from("published_versions")
      .insert({
        project_id: projectId,
        version_number: versionNumber,
        is_active: true,
        published_by: userId,
        pages_snapshot: pages as any,
        sections_snapshot: sections as any,
        blocks_snapshot: blocks as any,
        design_snapshot: designSettings as any,
        nav_groups_snapshot: navGroups as any,
        editor_changes: editorChanges as any,
        design_changes: designChanges as any,
        notes: notes || null,
      } as any)
      .select()
      .single();

    if (data) {
      // Update project's published_version_id
      await supabase
        .from("projects")
        .update({ published_version_id: data.id } as any)
        .eq("id", projectId);

      const version = data as unknown as PublishedVersion;
      setVersions(prev => [version, ...prev.map(v => ({ ...v, is_active: false }))]);
      setPublishing(false);
      return { version, editorChanges, designChanges };
    }

    setPublishing(false);
    return null;
  }, [projectId, userId, getLastPublished, getNextVersion]);

  const revertToVersion = useCallback(async (versionId: string) => {
    if (!projectId) return null;
    const version = versions.find(v => v.id === versionId);
    if (!version) return null;

    // Deactivate all
    await supabase
      .from("published_versions")
      .update({ is_active: false } as any)
      .eq("project_id", projectId);

    // Set this version as active
    await supabase
      .from("published_versions")
      .update({ is_active: true } as any)
      .eq("id", versionId);

    // Update project reference
    await supabase
      .from("projects")
      .update({ published_version_id: versionId } as any)
      .eq("id", projectId);

    setVersions(prev => prev.map(v => ({ ...v, is_active: v.id === versionId })));
    return version;
  }, [projectId, versions]);

  const previewChanges = useCallback((
    pages: Page[],
    sections: Section[],
    blocks: Block[],
    designSettings: DesignSettings,
  ) => {
    const lastPublished = getLastPublished();
    const editorChanges = computeEditorChanges(
      (lastPublished?.pages_snapshot || []) as Page[],
      pages,
      (lastPublished?.sections_snapshot || []) as Section[],
      sections,
      (lastPublished?.blocks_snapshot || []) as Block[],
      blocks,
    );
    const designChanges = computeDesignChanges(
      lastPublished?.design_snapshot as DesignSettings | null,
      designSettings,
    );
    return { editorChanges, designChanges, nextVersion: getNextVersion(), isFirstPublish: versions.length === 0 };
  }, [getLastPublished, getNextVersion, versions.length]);

  return {
    versions,
    loading,
    publishing,
    publish,
    revertToVersion,
    previewChanges,
    getNextVersion,
    getLastPublished,
  };
}