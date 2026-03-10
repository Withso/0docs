import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Page {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  order_index: number;
  meta_description?: string | null;
  version_id?: string | null;
  nav_group_id?: string | null;
  nav_title?: string | null;
}

export interface Section {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
  nav_title?: string | null;
}

export type BlockType = "heading" | "paragraph" | "code_block" | "image" | "video" | "youtube" | "ordered_list" | "unordered_list" | "note" | "callout" | "tabs" | "accordion" | "card" | "steps" | "table" | "divider" | "quote" | "api_endpoint" | "code_tabs" | "inline_editor";

export interface Block {
  id: string;
  section_id: string;
  type: BlockType;
  content: any;
  order_index: number;
}

export interface NavGroup {
  id: string;
  project_id: string;
  title: string;
  order_index: number;
  type: "label" | "text";
}

export function useBuilder(projectId: string | undefined, userId: string | undefined) {
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [navGroups, setNavGroups] = useState<NavGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Load project and pages
  useEffect(() => {
    if (!projectId || !userId) return;

    const load = async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (!proj) {
        setProject(null);
        setLoading(false);
        return;
      }
      setProject(proj);

      const { data: pagesData } = await supabase
        .from("pages")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");

      if (pagesData) {
        setPages(pagesData);
        if (pagesData.length > 0) setActivePage(pagesData[0]);
      }

      const { data: groupsData } = await supabase
        .from("nav_groups")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");

      if (groupsData) setNavGroups(groupsData as unknown as NavGroup[]);

      setLoading(false);
    };

    load();
  }, [projectId, userId]);

  // Load sections and blocks for active page
  const loadPageContent = useCallback(async () => {
    if (!activePage) {
      setSections([]);
      setBlocks([]);
      return;
    }

    const { data: sectionsData } = await supabase
      .from("sections")
      .select("*")
      .eq("page_id", activePage.id)
      .order("order_index");

    if (sectionsData) {
      setSections(sectionsData);

      if (sectionsData.length > 0) {
        const sectionIds = sectionsData.map((s) => s.id);
        const { data: blocksData } = await supabase
          .from("blocks")
          .select("*")
          .in("section_id", sectionIds)
          .order("order_index");

        if (blocksData) setBlocks(blocksData);
        else setBlocks([]);
      } else {
        setBlocks([]);
      }
    }
  }, [activePage]);

  useEffect(() => {
    loadPageContent();
  }, [loadPageContent]);

  const addPage = async (navGroupId?: string) => {
    if (!projectId) return;
    const title = "New Page";
    const slug = `page-${Date.now()}`;
    const insertData: any = { project_id: projectId, title, slug, order_index: pages.length };
    if (navGroupId) insertData.nav_group_id = navGroupId;
    const { data } = await supabase
      .from("pages")
      .insert(insertData)
      .select()
      .single();

    if (data) {
      setPages((p) => [...p, data]);
      setActivePage(data);
    }
  };

  const updatePage = async (pageId: string, updates: Partial<Page>) => {
    await supabase.from("pages").update(updates).eq("id", pageId);
    setPages((p) => p.map((pg) => (pg.id === pageId ? { ...pg, ...updates } : pg)));
    if (activePage?.id === pageId) setActivePage((prev) => prev ? { ...prev, ...updates } : prev);
  };

  const deletePage = async (pageId: string) => {
    await supabase.from("pages").delete().eq("id", pageId);
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (activePage?.id === pageId) {
      setActivePage(remaining[0] || null);
    }
  };

  const addSection = async () => {
    if (!activePage) return;
    const { data } = await supabase
      .from("sections")
      .insert({ page_id: activePage.id, title: "New Section", order_index: sections.length })
      .select()
      .single();

    if (data) setSections((s) => [...s, data]);
  };

  const updateSection = async (sectionId: string, updates: Partial<Section>) => {
    await supabase.from("sections").update(updates).eq("id", sectionId);
    setSections((s) => s.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)));
  };

  const deleteSection = async (sectionId: string) => {
    await supabase.from("sections").delete().eq("id", sectionId);
    setSections((s) => s.filter((sec) => sec.id !== sectionId));
    setBlocks((b) => b.filter((bl) => bl.section_id !== sectionId));
  };

  const addBlock = async (sectionId: string, type: string) => {
    const sectionBlocks = blocks.filter((b) => b.section_id === sectionId);
    const defaultContent = getDefaultContent(type);

    const { data } = await supabase
      .from("blocks")
      .insert({
        section_id: sectionId,
        type: type as any,
        content: defaultContent,
        order_index: sectionBlocks.length,
      })
      .select()
      .single();

    if (data) setBlocks((b) => [...b, data]);
  };

  const updateBlock = async (blockId: string, updates: Partial<Block>) => {
    const dbUpdates: any = { ...updates };
    await supabase.from("blocks").update(dbUpdates).eq("id", blockId);
    setBlocks((b) => b.map((bl) => (bl.id === blockId ? { ...bl, ...updates } : bl)));
  };

  const deleteBlock = async (blockId: string) => {
    await supabase.from("blocks").delete().eq("id", blockId);
    setBlocks((b) => b.filter((bl) => bl.id !== blockId));
  };

  const reloadPages = useCallback(async () => {
    if (!projectId) return;
    const { data: pagesData } = await supabase
      .from("pages")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index");

    if (pagesData) {
      setPages(pagesData);
      // Set active page to the last one (likely the newly imported one)
      if (pagesData.length > 0) {
        setActivePage(pagesData[pagesData.length - 1]);
      }
    }
  }, [projectId]);

  const addNavGroup = async (type: "label" | "text" = "label") => {
    if (!projectId) return;
    const title = type === "text" ? "Static text" : "New Label";
    const { data } = await supabase
      .from("nav_groups")
      .insert({ project_id: projectId, title, order_index: navGroups.length, type } as any)
      .select()
      .single();
    if (data) setNavGroups((g) => [...g, data as any]);
  };

  const updateNavGroup = async (groupId: string, updates: Partial<NavGroup>) => {
    await supabase.from("nav_groups").update(updates).eq("id", groupId);
    setNavGroups((g) => g.map((ng) => (ng.id === groupId ? { ...ng, ...updates } : ng)));
  };

  const deleteNavGroup = async (groupId: string) => {
    // Unassign pages from this group first
    await supabase.from("pages").update({ nav_group_id: null }).eq("nav_group_id", groupId);
    setPages((p) => p.map((pg) => (pg.nav_group_id === groupId ? { ...pg, nav_group_id: null } : pg)));
    await supabase.from("nav_groups").delete().eq("id", groupId);
    setNavGroups((g) => g.filter((ng) => ng.id !== groupId));
  };

  const reorderPages = async (reorderedPages: Page[]) => {
    setPages(reorderedPages);
    const updates = reorderedPages.map((p) => 
      supabase.from("pages").update({ order_index: p.order_index, nav_group_id: p.nav_group_id ?? null }).eq("id", p.id)
    );
    await Promise.all(updates);
  };

  const reorderNavGroups = async (reorderedGroups: NavGroup[]) => {
    setNavGroups(reorderedGroups);
    const updates = reorderedGroups.map((g, i) =>
      supabase.from("nav_groups").update({ order_index: i }).eq("id", g.id)
    );
    await Promise.all(updates);
  };

  const reorderSections = async (reorderedSections: Section[]) => {
    setSections(reorderedSections);
    const updates = reorderedSections.map((s, i) =>
      supabase.from("sections").update({ order_index: i }).eq("id", s.id)
    );
    await Promise.all(updates);
  };

  const reorderBlocks = async (updatedBlocks: Block[]) => {
    setBlocks((prev) => {
      const updatedIds = new Set(updatedBlocks.map((b) => b.id));
      const unchanged = prev.filter((b) => !updatedIds.has(b.id));
      return [...unchanged, ...updatedBlocks];
    });
    const updates = updatedBlocks.map((b) =>
      supabase.from("blocks").update({ order_index: b.order_index, section_id: b.section_id }).eq("id", b.id)
    );
    await Promise.all(updates);
  };

  return {
    project,
    pages,
    activePage,
    setActivePage,
    sections,
    blocks,
    navGroups,
    loading,
    addPage,
    updatePage,
    deletePage,
    addSection,
    updateSection,
    deleteSection,
    addBlock,
    updateBlock,
    deleteBlock,
    addNavGroup,
    updateNavGroup,
    deleteNavGroup,
    reloadPages,
    loadPageContent,
    reorderPages,
    reorderNavGroups,
    reorderSections,
    reorderBlocks,
  };
}

function getDefaultContent(type: string): any {
  switch (type) {
    case "heading":
      return { text: "New Heading", level: 2 };
    case "paragraph":
      return { text: "Start typing here..." };
    case "code_block":
      return { code: "// Your code here", language: "typescript" };
    case "image":
      return { url: "", alt: "Image description", caption: "" };
    case "video":
      return { url: "" };
    case "youtube":
      return { videoId: "", title: "" };
    case "ordered_list":
      return { items: ["Item 1", "Item 2", "Item 3"] };
    case "unordered_list":
      return { items: ["Item 1", "Item 2", "Item 3"] };
    case "note":
      return { text: "Add a note here..." };
    case "callout":
      return { text: "Important information...", type: "info" };
    case "tabs":
      return { tabs: [{ label: "Tab 1", content: "Content for tab 1" }, { label: "Tab 2", content: "Content for tab 2" }] };
    case "accordion":
      return { items: [{ title: "Accordion Item", content: "Content goes here..." }] };
    case "card":
      return { title: "Card Title", description: "Card description", link: "" };
    case "steps":
      return { items: [{ title: "Step 1", description: "Description..." }, { title: "Step 2", description: "Description..." }] };
    case "table":
      return { headers: ["Column 1", "Column 2", "Column 3"], rows: [["Cell 1", "Cell 2", "Cell 3"]] };
    case "divider":
      return {};
    case "quote":
      return { text: "Quote text here...", attribution: "" };
    case "api_endpoint":
      return { method: "GET", path: "/api/endpoint", description: "", parameters: [], response: "" };
    case "code_tabs":
      return { tabs: [{ label: "JavaScript", language: "javascript", code: "// JS code" }, { label: "Python", language: "python", code: "# Python code" }] };
    case "inline_editor":
      return { html: "<p>Start writing rich content here...</p>" };
    default:
      return { text: "" };
  }
}
