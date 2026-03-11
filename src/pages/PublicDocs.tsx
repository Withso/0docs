import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { useVersions, type DocVersion } from "@/hooks/use-versions";
import DocContentView from "@/components/docs/DocContentView";
import AskDocsChat from "@/components/docs/AskDocsChat";
import useSEOHead from "@/hooks/use-seo-head";

interface Page { id: string; title: string; slug: string; order_index: number; meta_description?: string | null; version_id?: string | null; }
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
  const [publishedDesign, setPublishedDesign] = useState<any>(null);
  const [navGroups, setNavGroups] = useState<any[]>([]);
  const [usingPublished, setUsingPublished] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: projects } = await supabase.from("projects").select("*").eq("slug", slug!).limit(1);
      if (!projects || projects.length === 0) { setNotFound(true); setLoading(false); return; }
      const proj = projects[0];
      setProject(proj);

      // Check for published version - serve published snapshot if available
      if (proj.published_version_id) {
        const { data: published } = await supabase
          .from("published_versions")
          .select("*")
          .eq("id", proj.published_version_id)
          .single();

        if (published && published.is_active) {
          // Use published snapshot
          const snapPages = (published.pages_snapshot as unknown as Page[]) || [];
          const snapSections = (published.sections_snapshot as unknown as Section[]) || [];
          const snapBlocks = (published.blocks_snapshot as unknown as Block[]) || [];
          const snapNavGroups = (published.nav_groups_snapshot as unknown as any[]) || [];

          setPages(snapPages);
          setAllSections(snapSections);
          setAllBlocks(snapBlocks);
          setNavGroups(snapNavGroups);
          if (published.design_snapshot) setPublishedDesign(published.design_snapshot);
          setUsingPublished(true);

          const target = pageSlug ? snapPages.find((p) => p.slug === pageSlug) : snapPages[0];
          const active = (target || snapPages[0] || null) as Page | null;
          setActivePage(active);

          if (active) {
            const pageSecs = snapSections.filter(s => s.page_id === active.id);
            setSections(pageSecs);
            const secIds = new Set(pageSecs.map(s => s.id));
            setBlocks(snapBlocks.filter(b => secIds.has(b.section_id)));
          }

          setLoading(false);
          return;
        }
      }

      // Fallback to live data if no published version
      const { data: pagesData } = await supabase.from("pages").select("*").eq("project_id", proj.id).order("order_index");
      if (pagesData) {
        setPages(pagesData as Page[]);
        const target = pageSlug ? pagesData.find((p) => p.slug === pageSlug) : pagesData[0];
        setActivePage((target || pagesData[0] || null) as Page | null);

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

        // Load nav groups
        const { data: groups } = await supabase.from("nav_groups").select("*").eq("project_id", proj.id).order("order_index");
        if (groups) setNavGroups(groups);
      }
      setLoading(false);
    };
    load();
  }, [slug, pageSlug]);

  // Version support
  const { versions, activeVersion, setActiveVersion } = useVersions(project?.id);

  // Filter pages by active version
  const filteredPages = versions.length > 0 && activeVersion
    ? pages.filter((p) => p.version_id === activeVersion.id || !p.version_id)
    : pages;

  // SEO
  useSEOHead({
    title: activePage?.title,
    description: activePage?.meta_description ?? undefined,
    projectName: project?.name,
    pageSlug: activePage?.slug,
    projectSlug: slug,
  });

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

  // Load content when switching pages (for published snapshot mode, use snapshot data)
  useEffect(() => {
    if (!activePage) return;

    if (usingPublished) {
      const pageSecs = allSections.filter(s => s.page_id === activePage.id);
      setSections(pageSecs);
      const secIds = new Set(pageSecs.map(s => s.id));
      setBlocks(allBlocks.filter(b => secIds.has(b.section_id)));
      return;
    }

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
  }, [activePage, usingPublished, allSections, allBlocks]);

  const { settings: liveSettings } = useDesignSettings(project?.id);
  // Use published design if available, otherwise live
  const settings = publishedDesign || liveSettings;

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
        navGroups={navGroups}
      />
      {project?.id && <AskDocsChat projectId={project.id} settings={settings} />}
    </div>
  );
};

export default PublicDocs;