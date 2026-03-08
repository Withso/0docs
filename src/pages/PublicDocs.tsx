import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDesignSettings } from "@/hooks/use-design-settings";
import DocContentView from "@/components/docs/DocContentView";

interface Page { id: string; title: string; slug: string; order_index: number; }
interface Section { id: string; page_id: string; title: string; order_index: number; }
interface Block { id: string; section_id: string; type: string; content: any; order_index: number; }

const PublicDocs = () => {
  const { slug, pageSlug } = useParams<{ slug: string; pageSlug?: string }>();
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: projects } = await supabase.from("projects").select("*").eq("slug", slug!).limit(1);
      if (!projects || projects.length === 0) { setNotFound(true); setLoading(false); return; }
      const proj = projects[0];
      setProject(proj);
      const { data: pagesData } = await supabase.from("pages").select("*").eq("project_id", proj.id).order("order_index");
      if (pagesData) {
        setPages(pagesData);
        const target = pageSlug ? pagesData.find((p) => p.slug === pageSlug) : pagesData[0];
        setActivePage(target || pagesData[0] || null);

        // Load all sections & blocks for search
        const pageIds = pagesData.map((p) => p.id);
        if (pageIds.length > 0) {
          const { data: allSecs } = await supabase.from("sections").select("*").in("page_id", pageIds).order("order_index");
          if (allSecs) {
            setAllSections(allSecs);
            const secIds = allSecs.map((s) => s.id);
            if (secIds.length > 0) {
              const { data: allBlks } = await supabase.from("blocks").select("*").in("section_id", secIds).order("order_index");
              setAllBlocks(allBlks || []);
            }
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [slug, pageSlug]);

  useEffect(() => {
    if (!activePage) return;
    const loadContent = async () => {
      const { data: secs } = await supabase.from("sections").select("*").eq("page_id", activePage.id).order("order_index");
      if (secs) {
        setSections(secs);
        if (secs.length > 0) {
          const { data: blks } = await supabase.from("blocks").select("*").in("section_id", secs.map((s) => s.id)).order("order_index");
          setBlocks(blks || []);
        } else setBlocks([]);
      }
    };
    loadContent();
  }, [activePage]);

  const { settings } = useDesignSettings(project?.id);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Documentation not found</h1>
          <p className="text-muted-foreground">This documentation doesn't exist or has been removed.</p>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground mt-4 inline-block">← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DocContentView
        settings={settings}
        projectName={project?.name || ""}
        pages={pages}
        activePage={activePage}
        sections={sections}
        blocks={blocks}
        onSelectPage={setActivePage}
        headerStickyTop={0}
        allSections={allSections}
        allBlocks={allBlocks}
      />
    </div>
  );
};

export default PublicDocs;
