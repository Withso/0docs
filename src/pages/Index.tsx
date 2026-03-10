import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { useVersions } from "@/hooks/use-versions";
import { useAuth } from "@/contexts/AuthContext";
import DocContentView from "@/components/docs/DocContentView";
import AskDocsChat from "@/components/docs/AskDocsChat";
import useSEOHead from "@/hooks/use-seo-head";
import { Button } from "@/components/ui/button";
import { LogIn, LayoutDashboard } from "lucide-react";

interface Page { id: string; title: string; slug: string; order_index: number; meta_description?: string | null; version_id?: string | null; }
interface Section { id: string; page_id: string; title: string; order_index: number; }
interface Block { id: string; section_id: string; type: string; content: any; order_index: number; }

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  // Load homepage project
  useEffect(() => {
    const load = async () => {
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("is_homepage" as any, true)
        .limit(1);

      if (!projects || projects.length === 0) {
        setLoading(false);
        return;
      }

      const proj = projects[0];
      setProject(proj);

      const { data: pagesData } = await supabase
        .from("pages")
        .select("*")
        .eq("project_id", proj.id)
        .order("order_index");

      if (pagesData) {
        setPages(pagesData as Page[]);
        setActivePage((pagesData[0] || null) as Page | null);

        const pageIds = pagesData.map((p) => p.id);
        if (pageIds.length > 0) {
          const { data: allSecs } = await supabase
            .from("sections")
            .select("*")
            .in("page_id", pageIds)
            .order("order_index");
          if (allSecs) {
            setAllSections(allSecs);
            const secIds = allSecs.map((s) => s.id);
            if (secIds.length > 0) {
              const { data: allBlks } = await supabase
                .from("blocks")
                .select("*")
                .in("section_id", secIds)
                .order("order_index");
              setAllBlocks(allBlks || []);
            }
          }
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // Load content for active page
  useEffect(() => {
    if (!activePage) return;
    const loadContent = async () => {
      const { data: secs } = await supabase
        .from("sections")
        .select("*")
        .eq("page_id", activePage.id)
        .order("order_index");
      if (secs) {
        setSections(secs);
        if (secs.length > 0) {
          const { data: blks } = await supabase
            .from("blocks")
            .select("*")
            .in("section_id", secs.map((s) => s.id))
            .order("order_index");
          setBlocks(blks || []);
        } else setBlocks([]);
      }
    };
    loadContent();
  }, [activePage]);

  // Track page view
  useEffect(() => {
    if (!activePage || !project) return;
    const trackView = async () => {
      const { data: existing } = await supabase
        .from("page_analytics")
        .select("id, view_count")
        .eq("page_id", activePage.id)
        .limit(1);

      const rows = existing || [];
      if (rows.length > 0) {
        await supabase.from("page_analytics").update({
          view_count: rows[0].view_count + 1,
          last_viewed_at: new Date().toISOString(),
        } as any).eq("id", rows[0].id);
      } else {
        await supabase.from("page_analytics").insert({
          page_id: activePage.id,
          project_id: project.id,
          view_count: 1,
          last_viewed_at: new Date().toISOString(),
        });
      }
    };
    trackView();
  }, [activePage?.id, project?.id]);

  const { versions, activeVersion, setActiveVersion } = useVersions(project?.id);
  const filteredPages = versions.length > 0 && activeVersion
    ? pages.filter((p) => p.version_id === activeVersion.id || !p.version_id)
    : pages;

  const { settings } = useDesignSettings(project?.id);

  useSEOHead({
    title: activePage?.title,
    description: activePage?.meta_description ?? undefined,
    projectName: project?.name || "DocBuilder",
    pageSlug: activePage?.slug,
    projectSlug: "home",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">DocBuilder</h1>
          <p className="text-muted-foreground mb-4">Documentation is being set up.</p>
          <Button onClick={() => navigate("/auth")} variant="outline">
            <LogIn className="h-4 w-4 mr-2" /> Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Auth/Dashboard button floating in doc header */}
      <div className="fixed top-0 right-0 z-50 p-2 pr-4 flex items-center gap-2" style={{ height: "48px" }}>
        {user ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[13px] rounded-lg gap-1.5"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[13px] rounded-lg gap-1.5"
            onClick={() => navigate("/auth")}
          >
            <LogIn className="h-3.5 w-3.5" /> Sign In
          </Button>
        )}
      </div>

      <DocContentView
        settings={settings}
        projectName={project?.name || ""}
        pages={filteredPages}
        activePage={activePage}
        sections={sections}
        blocks={blocks}
        onSelectPage={setActivePage}
        headerStickyTop={0}
        allSections={allSections}
        allBlocks={allBlocks}
        showFeedback
        pageId={activePage?.id}
        projectId={project?.id}
        versions={versions}
        activeVersion={activeVersion}
        onSelectVersion={setActiveVersion}
      />
      {project?.id && <AskDocsChat projectId={project.id} settings={settings} />}
    </div>
  );
};

export default Index;
