import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BuilderSidebar from "@/components/builder/BuilderSidebar";
import SectionEditor from "@/components/builder/SectionEditor";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Eye } from "lucide-react";

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

export interface Block {
  id: string;
  section_id: string;
  type: string;
  content: any;
  order_index: number;
}

const Builder = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  // Load project and pages
  useEffect(() => {
    if (!projectId || !user) return;

    const load = async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!proj) {
        navigate("/dashboard");
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
  }, [projectId, user]);

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
      } else {
        setBlocks([]);
      }
    }
  }, [activePage]);

  useEffect(() => {
    loadPageContent();
  }, [loadPageContent]);

  const addPage = async () => {
    const title = "New Page";
    const slug = `page-${Date.now()}`;
    const { data, error } = await supabase
      .from("pages")
      .insert({
        project_id: projectId!,
        title,
        slug,
        order_index: pages.length,
      })
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
      .insert({
        page_id: activePage.id,
        title: "New Section",
        order_index: sections.length,
      })
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
    await supabase.from("blocks").update(updates).eq("id", blockId);
    setBlocks((b) => b.map((bl) => (bl.id === blockId ? { ...bl, ...updates } : bl)));
  };

  const deleteBlock = async (blockId: string) => {
    await supabase.from("blocks").delete().eq("id", blockId);
    setBlocks((b) => b.filter((bl) => bl.id !== blockId));
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Builder header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-[980px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground text-sm">{project?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/docs/${project?.slug}`, "_blank")}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
            </Button>
          </div>
        </div>
      </header>

      {/* Builder body — same layout as docs */}
      <div className="max-w-[980px] mx-auto flex px-6">
        <BuilderSidebar
          projectName={project?.name || ""}
          pages={pages}
          activePage={activePage}
          sections={sections}
          onSelectPage={setActivePage}
          onAddPage={addPage}
          onUpdatePage={updatePage}
          onDeletePage={deletePage}
        />

        <main className="flex-1 min-w-0 py-10 lg:pl-4">
          {activePage ? (
            <article className="max-w-[680px]">
              {/* Page title — editable */}
              <input
                className="text-2xl font-bold text-foreground mb-2 w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
                value={activePage.title}
                onChange={(e) => updatePage(activePage.id, { title: e.target.value })}
                onBlur={(e) => {
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
                  updatePage(activePage.id, { slug });
                }}
              />

              {/* Sections */}
              {sections.map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  blocks={blocks.filter((b) => b.section_id === section.id)}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                  onAddBlock={addBlock}
                  onUpdateBlock={updateBlock}
                  onDeleteBlock={deleteBlock}
                />
              ))}

              {/* Add section button */}
              <button
                onClick={addSection}
                className="w-full border-2 border-dashed rounded-lg py-6 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors mt-6 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Section
              </button>
            </article>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No pages yet. Add a page to get started.</p>
              <Button onClick={addPage} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Add Page
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

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

export default Builder;
