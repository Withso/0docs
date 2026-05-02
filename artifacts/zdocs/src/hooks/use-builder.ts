import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/lib/api-client";

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
  metadata?: any;
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
  type: "label" | "text" | "dropdown";
  tab_id?: string | null;
  metadata?: Record<string, any>;
}

export interface Tab {
  id: string;
  project_id: string;
  label: string;
  icon?: string | null;
  order_index: number;
  metadata?: Record<string, any>;
}

function toSnakeCase(row: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    projectId: "project_id",
    pageId: "page_id",
    sectionId: "section_id",
    orderIndex: "order_index",
    navGroupId: "nav_group_id",
    navTitle: "nav_title",
    metaDescription: "meta_description",
    tabId: "tab_id",
    versionId: "version_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] ?? k] = v;
  }
  return out;
}

function normPage(r: any): Page {
  return {
    id: r.id,
    project_id: r.projectId ?? r.project_id,
    title: r.title,
    slug: r.slug,
    order_index: r.orderIndex ?? r.order_index,
    meta_description: r.metaDescription ?? r.meta_description ?? null,
    version_id: r.versionId ?? r.version_id ?? null,
    nav_group_id: r.navGroupId ?? r.nav_group_id ?? null,
    nav_title: r.navTitle ?? r.nav_title ?? null,
    metadata: r.metadata ?? {},
  };
}

function normSection(r: any): Section {
  return {
    id: r.id,
    page_id: r.pageId ?? r.page_id,
    title: r.title,
    order_index: r.orderIndex ?? r.order_index,
    nav_title: r.navTitle ?? r.nav_title ?? null,
  };
}

function normBlock(r: any): Block {
  return {
    id: r.id,
    section_id: r.sectionId ?? r.section_id,
    type: r.type,
    content: r.content ?? {},
    order_index: r.orderIndex ?? r.order_index,
  };
}

function normNavGroup(r: any): NavGroup {
  return {
    id: r.id,
    project_id: r.projectId ?? r.project_id,
    title: r.title,
    order_index: r.orderIndex ?? r.order_index,
    type: r.type ?? "label",
    tab_id: r.tabId ?? r.tab_id ?? null,
    metadata: r.metadata ?? {},
  };
}

function normTab(r: any): Tab {
  return {
    id: r.id,
    project_id: r.projectId ?? r.project_id,
    label: r.label,
    icon: r.icon ?? null,
    order_index: r.orderIndex ?? r.order_index,
    metadata: r.metadata ?? {},
  };
}

export function useBuilder(projectId: string | undefined, userId: string | undefined) {
  const api = useApi();
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [navGroups, setNavGroups] = useState<NavGroup[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProject = useCallback(async () => {
    if (!projectId || !userId) return;
    try {
      const proj = await api.get<any>(`/projects/${projectId}`);
      if (proj) setProject(proj);
    } catch (e) {
      console.error("Failed to refresh project", e);
    }
  }, [projectId, userId]);

  useEffect(() => {
    if (!projectId || !userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [proj, pagesData, groupsData, tabsData] = await Promise.all([
          api.get<any>(`/projects/${projectId}`),
          api.get<any[]>(`/projects/${projectId}/pages`),
          api.get<any[]>(`/projects/${projectId}/nav-groups`),
          api.get<any[]>(`/projects/${projectId}/tabs`),
        ]);

        setProject(proj);
        const nextPages = (pagesData || []).map(normPage);
        setPages(nextPages);
        setActivePage((prev) => {
          if (!nextPages.length) return null;
          if (prev) {
            const match = nextPages.find((p) => p.id === prev.id);
            if (match) return match;
          }
          return nextPages[0];
        });
        setNavGroups((groupsData || []).map(normNavGroup));
        setTabs((tabsData || []).map(normTab));
      } catch (error) {
        console.error("Failed to load builder project", error);
        setProject(null);
        setPages([]);
        setActivePage(null);
        setNavGroups([]);
        setTabs([]);
        setSections([]);
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId, userId]);

  const loadPageContent = useCallback(async () => {
    if (!activePage || !projectId) {
      setSections([]);
      setBlocks([]);
      return;
    }
    try {
      const { sections: sData, blocks: bData } = await api.get<{ sections: any[]; blocks: any[] }>(
        `/projects/${projectId}/pages/${activePage.id}/content`,
      );
      setSections((sData || []).map(normSection));
      setBlocks((bData || []).map(normBlock));
    } catch (error) {
      console.error("Failed to load page content", error);
      setSections([]);
      setBlocks([]);
    }
  }, [activePage, projectId]);

  useEffect(() => {
    setSections([]);
    setBlocks([]);
    loadPageContent();
  }, [loadPageContent]);

  const addPage = async (navGroupId?: string, _tabId?: string | null) => {
    if (!projectId) return;
    const title = "New Page";
    const slug = `page-${Date.now()}`;
    const body: any = { title, slug, orderIndex: pages.length };
    if (navGroupId) body.navGroupId = navGroupId;
    const data = await api.post<any>(`/projects/${projectId}/pages`, body);
    if (data) {
      const page = normPage(data);
      setPages((p) => [...p, page]);
      setActivePage(page);
    }
  };

  const updatePage = async (pageId: string, updates: Partial<Page>) => {
    const body: any = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.slug !== undefined) body.slug = updates.slug;
    if (updates.order_index !== undefined) body.orderIndex = updates.order_index;
    if (updates.nav_group_id !== undefined) body.navGroupId = updates.nav_group_id;
    if (updates.nav_title !== undefined) body.navTitle = updates.nav_title;
    if (updates.meta_description !== undefined) body.metaDescription = updates.meta_description;
    await api.patch<any>(`/projects/${projectId}/pages/${pageId}`, body);
    setPages((p) => p.map((pg) => (pg.id === pageId ? { ...pg, ...updates } : pg)));
    if (activePage?.id === pageId) setActivePage((prev) => prev ? { ...prev, ...updates } : prev);
  };

  const deletePage = async (pageId: string) => {
    await api.del(`/projects/${projectId}/pages/${pageId}`);
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (activePage?.id === pageId) setActivePage(remaining[0] || null);
  };

  const addSection = async () => {
    if (!activePage) return;
    const data = await api.post<any>("/sections", { pageId: activePage.id, title: "New Section", orderIndex: sections.length });
    if (data) setSections((s) => [...s, normSection(data)]);
  };

  const updateSection = async (sectionId: string, updates: Partial<Section>) => {
    const body: any = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.nav_title !== undefined) body.navTitle = updates.nav_title;
    if (updates.order_index !== undefined) body.orderIndex = updates.order_index;
    await api.patch<any>(`/sections/${sectionId}`, body);
    setSections((s) => s.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)));
  };

  const deleteSection = async (sectionId: string) => {
    await api.del(`/sections/${sectionId}`);
    setSections((s) => s.filter((sec) => sec.id !== sectionId));
    setBlocks((b) => b.filter((bl) => bl.section_id !== sectionId));
  };

  const addBlock = async (sectionId: string, type: string) => {
    const sectionBlocks = blocks.filter((b) => b.section_id === sectionId);
    const defaultContent = getDefaultContent(type);
    const data = await api.post<any>("/blocks", { sectionId, type, content: defaultContent, orderIndex: sectionBlocks.length });
    if (data) setBlocks((b) => [...b, normBlock(data)]);
  };

  const updateBlock = async (blockId: string, updates: Partial<Block>) => {
    const body: any = {};
    if (updates.content !== undefined) body.content = updates.content;
    if (updates.order_index !== undefined) body.orderIndex = updates.order_index;
    if (updates.section_id !== undefined) body.sectionId = updates.section_id;
    if (updates.type !== undefined) body.type = updates.type;
    await api.patch<any>(`/blocks/${blockId}`, body);
    setBlocks((b) => b.map((bl) => (bl.id === blockId ? { ...bl, ...updates } : bl)));
  };

  const deleteBlock = async (blockId: string) => {
    await api.del(`/blocks/${blockId}`);
    setBlocks((b) => b.filter((bl) => bl.id !== blockId));
  };

  const reloadPages = useCallback(async () => {
    if (!projectId) return;
    const pagesData = await api.get<any[]>(`/projects/${projectId}/pages`);
    if (pagesData) {
      const mapped = pagesData.map(normPage);
      setPages(mapped);
      if (mapped.length > 0) setActivePage(mapped[mapped.length - 1]);
    }
  }, [projectId]);

  const addNavGroup = async (type: "label" | "text" | "dropdown" = "label", tabId?: string | null) => {
    if (!projectId) return;
    const titleByType: Record<string, string> = { text: "Static text", dropdown: "New Dropdown", label: "New Label" };
    const title = titleByType[type] || "New Label";
    const body: any = { title, orderIndex: navGroups.length, type };
    if (tabId) body.tabId = tabId;
    const data = await api.post<any>(`/projects/${projectId}/nav-groups`, body);
    if (data) setNavGroups((g) => [...g, normNavGroup(data)]);
  };

  const updateNavGroup = async (groupId: string, updates: Partial<NavGroup>) => {
    const body: any = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.type !== undefined) body.type = updates.type;
    if (updates.order_index !== undefined) body.orderIndex = updates.order_index;
    if (updates.tab_id !== undefined) body.tabId = updates.tab_id;
    if (updates.metadata !== undefined) body.metadata = updates.metadata;
    await api.patch<any>(`/nav-groups/${groupId}`, body);
    setNavGroups((g) => g.map((ng) => (ng.id === groupId ? { ...ng, ...updates } : ng)));
  };

  const deleteNavGroup = async (groupId: string) => {
    await api.del(`/nav-groups/${groupId}`);
    setPages((p) => p.map((pg) => (pg.nav_group_id === groupId ? { ...pg, nav_group_id: null } : pg)));
    setNavGroups((g) => g.filter((ng) => ng.id !== groupId));
  };

  const reorderPages = async (reorderedPages: Page[]) => {
    setPages(reorderedPages);
    await api.post(`/projects/${projectId}/pages/reorder`, {
      pages: reorderedPages.map((p) => ({ id: p.id, orderIndex: p.order_index, navGroupId: p.nav_group_id ?? null })),
    });
  };

  const reorderNavGroups = async (reorderedGroups: NavGroup[]) => {
    setNavGroups(reorderedGroups);
    await api.post("/nav-groups/reorder", {
      groups: reorderedGroups.map((g, i) => ({ id: g.id, orderIndex: i })),
    });
  };

  const reorderSections = async (reorderedSections: Section[]) => {
    setSections(reorderedSections);
    await api.post("/sections/reorder", {
      sections: reorderedSections.map((s, i) => ({ id: s.id, orderIndex: i })),
    });
  };

  const reorderBlocks = async (updatedBlocks: Block[]) => {
    setBlocks((prev) => {
      const updatedIds = new Set(updatedBlocks.map((b) => b.id));
      const unchanged = prev.filter((b) => !updatedIds.has(b.id));
      return [...unchanged, ...updatedBlocks];
    });
    await api.post("/blocks/reorder", {
      blocks: updatedBlocks.map((b) => ({ id: b.id, orderIndex: b.order_index, sectionId: b.section_id })),
    });
  };

  const addTab = async (label = "New Tab", kind: "tab" | "language" | "product" | "version" = "tab") => {
    if (!projectId) return;
    const data = await api.post<any>(`/projects/${projectId}/tabs`, { label, orderIndex: tabs.length, metadata: { kind } });
    if (data) setTabs((t) => [...t, normTab(data)]);
  };

  const updateTab = async (tabId: string, updates: Partial<Tab>) => {
    const body: any = {};
    if (updates.label !== undefined) body.label = updates.label;
    if (updates.icon !== undefined) body.icon = updates.icon;
    if (updates.order_index !== undefined) body.orderIndex = updates.order_index;
    if (updates.metadata !== undefined) body.metadata = updates.metadata;
    await api.patch<any>(`/tabs/${tabId}`, body);
    setTabs((t) => t.map((tb) => (tb.id === tabId ? { ...tb, ...updates } : tb)));
  };

  const deleteTab = async (tabId: string) => {
    await api.del(`/tabs/${tabId}`);
    setNavGroups((g) => g.map((ng) => (ng.tab_id === tabId ? { ...ng, tab_id: null } : ng)));
    setTabs((t) => t.filter((tb) => tb.id !== tabId));
    if (activeTabId === tabId) setActiveTabId(null);
  };

  const reorderTabs = async (reordered: Tab[]) => {
    setTabs(reordered);
    await api.post("/tabs/reorder", { tabs: reordered.map((t, i) => ({ id: t.id, orderIndex: i })) });
  };

  return {
    project,
    pages,
    activePage,
    setActivePage,
    sections,
    blocks,
    navGroups,
    tabs,
    activeTabId,
    setActiveTabId,
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
    addTab,
    updateTab,
    deleteTab,
    reorderTabs,
    reloadPages,
    loadPageContent,
    reorderPages,
    reorderNavGroups,
    reorderSections,
    reorderBlocks,
    refreshProject,
  };
}

function getDefaultContent(type: string): any {
  switch (type) {
    case "heading": return { text: "New Heading", level: 2 };
    case "paragraph": return { text: "Start typing here..." };
    case "code_block": return { code: "// Your code here", language: "typescript" };
    case "image": return { url: "", alt: "Image description", caption: "" };
    case "video": return { url: "" };
    case "youtube": return { videoId: "", title: "" };
    case "ordered_list": return { items: ["Item 1", "Item 2", "Item 3"] };
    case "unordered_list": return { items: ["Item 1", "Item 2", "Item 3"] };
    case "note": return { text: "Add a note here..." };
    case "callout": return { text: "Important information...", type: "info" };
    case "tabs": return { tabs: [{ label: "Tab 1", content: "Content for tab 1" }, { label: "Tab 2", content: "Content for tab 2" }] };
    case "accordion": return { items: [{ title: "Accordion Item", content: "Content goes here..." }] };
    case "card": return { title: "Card Title", description: "Card description", link: "" };
    case "steps": return { items: [{ title: "Step 1", description: "Description..." }, { title: "Step 2", description: "Description..." }] };
    case "table": return { headers: ["Column 1", "Column 2", "Column 3"], rows: [["Cell 1", "Cell 2", "Cell 3"]] };
    case "divider": return {};
    case "quote": return { text: "Quote text here...", attribution: "" };
    case "api_endpoint": return { method: "GET", path: "/api/endpoint", description: "", parameters: [], response: "" };
    case "code_tabs": return { tabs: [{ label: "JavaScript", language: "javascript", code: "// JS code" }, { label: "Python", language: "python", code: "# Python code" }] };
    case "inline_editor": return { html: "<p>Start writing rich content here...</p>" };
    default: return { text: "" };
  }
}
