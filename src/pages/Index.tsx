import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { useVersions } from "@/hooks/use-versions";
import { useAuth } from "@/contexts/AuthContext";
import DocContentView from "@/components/docs/DocContentView";
import AskDocsChat from "@/components/docs/AskDocsChat";
import useSEOHead from "@/hooks/use-seo-head";
import { LogIn, LayoutDashboard, Search } from "lucide-react";
import MadeWithBanner from "@/components/docs/MadeWithBanner";

interface Page {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  meta_description?: string | null;
  version_id?: string | null;
}
interface Section {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
}
interface Block {
  id: string;
  section_id: string;
  type: string;
  content: any;
  order_index: number;
}

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
  const [publishedDesign, setPublishedDesign] = useState<any>(null);
  const [navGroups, setNavGroups] = useState<any[]>([]);
  const [usingPublished, setUsingPublished] = useState(false);

  // Load homepage project
  useEffect(() => {
    const load = async () => {
      const { data: projects } = await (supabase
        .from("projects")
        .select("*") as any)
        .eq("is_homepage", true)
        .limit(1);

      if (!projects || projects.length === 0) {
        setLoading(false);
        return;
      }

      const proj = projects[0];
      setProject(proj);

      // Check for published version first — serve published snapshot if available
      if (proj.published_version_id) {
        const { data: published } = await supabase
          .from("published_versions")
          .select("*")
          .eq("id", proj.published_version_id)
          .single();

        if (published && published.is_active) {
          const snapPages =
            ((published.pages_snapshot as unknown as Page[]) || []).slice();
          const snapSections =
            ((published.sections_snapshot as unknown as Section[]) || []).slice();
          const snapBlocks =
            ((published.blocks_snapshot as unknown as Block[]) || []).slice();
          const snapNavGroups =
            ((published.nav_groups_snapshot as unknown as any[]) || []).slice();

          snapPages.sort((a, b) => a.order_index - b.order_index);
          snapSections.sort((a, b) => a.order_index - b.order_index);
          snapBlocks.sort((a, b) => a.order_index - b.order_index);
          snapNavGroups.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

          setPages(snapPages);
          setAllSections(snapSections);
          setAllBlocks(snapBlocks);
          setNavGroups(snapNavGroups);
          if (published.design_snapshot) setPublishedDesign(published.design_snapshot);
          setUsingPublished(true);

          const active = snapPages[0] || null;
          setActivePage(active);

          if (active) {
            const pageSecs = snapSections.filter((s) => s.page_id === active.id);
            setSections(pageSecs);
            const secIds = new Set(pageSecs.map((s) => s.id));
            setBlocks(snapBlocks.filter((b) => secIds.has(b.section_id)));
          }

          setLoading(false);
          return;
        }
      }

      // Fallback to live data if no published version
      const { data: pagesData } = await supabase
        .from("pages")
        .select("*")
        .eq("project_id", proj.id)
        .order("nav_group_id", { ascending: true, nullsFirst: true })
        .order("order_index");

      if (pagesData && pagesData.length > 0) {
        setPages(pagesData as Page[]);
        const firstPage = pagesData[0] as Page;
        setActivePage(firstPage);

        const pageIds = pagesData.map((p) => p.id);

        const [allSecsRes, firstPageSecsRes] = await Promise.all([
          supabase
            .from("sections")
            .select("*")
            .in("page_id", pageIds)
            .order("order_index"),
          supabase
            .from("sections")
            .select("*")
            .eq("page_id", firstPage.id)
            .order("order_index"),
        ]);

        const allSecs = allSecsRes.data || [];
        setAllSections(allSecs);

        if (firstPageSecsRes.data) {
          setSections(firstPageSecsRes.data);
          const firstSecIds = firstPageSecsRes.data.map((s) => s.id);
          const allSecIds = allSecs.map((s) => s.id);

          const [firstBlksRes, allBlksRes] = await Promise.all([
            firstSecIds.length > 0
              ? supabase
                  .from("blocks")
                  .select("*")
                  .in("section_id", firstSecIds)
                  .order("order_index")
              : Promise.resolve({ data: [] }),
            allSecIds.length > 0
              ? supabase
                  .from("blocks")
                  .select("*")
                  .in("section_id", allSecIds)
                  .order("order_index")
              : Promise.resolve({ data: [] }),
          ]);

          setBlocks((firstBlksRes.data || []) as Block[]);
          setAllBlocks((allBlksRes.data || []) as Block[]);
        }

        // Load nav groups for live data
        const { data: groups } = await supabase
          .from("nav_groups")
          .select("*")
          .eq("project_id", proj.id)
          .order("order_index");
        if (groups) setNavGroups(groups);
      } else if (pagesData) {
        setPages([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Load content for active page
  useEffect(() => {
    if (!activePage) return;

    if (usingPublished) {
      const pageSecs = allSections.filter((s) => s.page_id === activePage.id);
      setSections(pageSecs);
      const secIds = new Set(pageSecs.map((s) => s.id));
      setBlocks(allBlocks.filter((b) => secIds.has(b.section_id)));
      return;
    }

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
            .in(
              "section_id",
              secs.map((s) => s.id),
            )
            .order("order_index");
          setBlocks(blks || []);
        } else setBlocks([]);
      }
    };
    loadContent();
  }, [activePage, usingPublished, allSections, allBlocks]);

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
        await supabase
          .from("page_analytics")
          .update({
            view_count: rows[0].view_count + 1,
            last_viewed_at: new Date().toISOString(),
          } as any)
          .eq("id", rows[0].id);
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
  const filteredPages =
    usingPublished || !(versions.length > 0 && activeVersion)
      ? pages
      : pages.filter((p) => p.version_id === activeVersion.id || !p.version_id);

  const { settings: liveSettings } = useDesignSettings(project?.id);
  const settings = publishedDesign || liveSettings;

  const [searchOpen, setSearchOpen] = useState(false);

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
          <h1 className="text-2xl font-bold text-foreground mb-2">0docs</h1>
          <p className="text-muted-foreground mb-4">Documentation is being set up.</p>
          <button
            onClick={() => navigate("/auth")}
            className="h-10 px-4 rounded-lg inline-flex items-center gap-2 font-medium text-sm border border-border hover:bg-accent transition-colors"
          >
            <LogIn className="h-4 w-4" /> Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Header bar */}
      <div
        className="sticky top-0 z-50 h-12"
        style={{ backgroundColor: `hsl(${settings.backgroundColor})` }}
      >
        <div
          className="mx-auto h-full flex items-center justify-between px-6"
          style={{
            maxWidth: `${settings.contentMaxWidth + settings.sidebarWidth + 200 + 48}px`,
          }}
        >
          <div className="flex items-center" style={{ width: `${settings.sidebarWidth}px`, flexShrink: 0 }}>
            <span className="font-semibold text-[15px] tracking-tight text-foreground">0docs</span>
          </div>
          <div className="flex-1 min-w-0 lg:pl-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors hover:bg-accent/80"
              style={{
                borderColor: `hsl(${settings.borderColor})`,
                color: `hsl(${settings.mutedForegroundColor})`,
                fontSize: "13px",
                fontFamily: `'${settings.bodyFont}', sans-serif`,
                minWidth: "220px",
                maxWidth: "280px",
              }}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd
                className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px]"
                style={{ borderColor: `hsl(${settings.borderColor})` }}
              >
                ⌘K
              </kbd>
            </button>
          </div>

          {user ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="h-8 px-3 text-[13px] rounded-lg gap-1.5 inline-flex items-center font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="h-8 px-3 text-[13px] rounded-lg gap-1.5 inline-flex items-center font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
          )}
        </div>
      </div>

      <DocContentView
        settings={settings}
        projectName={project?.name || ""}
        pages={filteredPages}
        activePage={activePage}
        sections={sections}
        blocks={blocks}
        onSelectPage={setActivePage}
        hideHeader
        headerStickyTop={0}
        allSections={allSections}
        allBlocks={allBlocks}
        showFeedback
        pageId={activePage?.id}
        projectId={project?.id}
        versions={usingPublished ? [] : versions}
        activeVersion={usingPublished ? undefined : activeVersion}
        onSelectVersion={usingPublished ? undefined : setActiveVersion}
        externalSearchOpen={searchOpen}
        onExternalSearchOpenChange={setSearchOpen}
        navGroups={navGroups}
        hideHeaderLabel
      />
      {project?.id && <AskDocsChat projectId={project.id} settings={settings} />}
      <MadeWithBanner />
    </div>
  );
};

export default Index;
