import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Page {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  order_index: number;
}

export interface Section {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
}

export type BlockType = "heading" | "paragraph" | "code_block" | "image" | "video" | "youtube" | "ordered_list" | "unordered_list" | "note" | "callout" | "tabs" | "accordion" | "card" | "steps" | "table" | "divider" | "quote" | "api_endpoint" | "code_tabs";

export interface Block {
  id: string;
  section_id: string;
  type: BlockType;
  content: any;
  order_index: number;
}

export function useBuilder(projectId: string | undefined, userId: string | undefined) {
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
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

  const addPage = async () => {
    if (!projectId) return;
    const title = "New Page";
    const slug = `page-${Date.now()}`;
    const { data } = await supabase
      .from("pages")
      .insert({ project_id: projectId, title, slug, order_index: pages.length })
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

  return {
    project,
    pages,
    activePage,
    setActivePage,
    sections,
    blocks,
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
    default:
      return { text: "" };
  }
}
