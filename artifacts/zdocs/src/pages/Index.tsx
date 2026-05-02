import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { useVersions } from "@/hooks/use-versions";
import { useAuth } from "@/contexts/AuthContext";
import DocContentView from "@/components/docs/DocContentView";
import AskDocsChat from "@/components/docs/AskDocsChat";
import useSEOHead from "@/hooks/use-seo-head";
import { LogIn, LayoutDashboard, Search, Sun, Moon } from "lucide-react";
import MadeWithBanner from "@/components/docs/MadeWithBanner";
import DocMobileNavComponent from "@/components/docs/DocMobileNav";
import { useResolvedDesignSettings } from "@/components/docs/DesignSettingsWrapper";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import { getAppearance } from "@/lib/theme/resolve-doc-theme";

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
      try {
        const res = await fetch("/api/projects?homepage=true");
        if (!res.ok) { setLoading(false); return; }
        const projects = await res.json();

        if (!projects || projects.length === 0) {
          setLoading(false);
          return;
        }

        const proj = projects[0];
        setProject(proj);

        // Check for published version first — serve published snapshot if available
        if (proj.publishedVersionId || proj.published_version_id) {
          const verId = proj.publishedVersionId || proj.published_version_id;
          const pubRes = await fetch(`/api/versions/${verId}`);
          if (pubRes.ok) {
            const published = await pubRes.json();
            if (published && published.isActive) {
              const snapPages = ((published.pagesSnapshot || []) as Page[]).slice();
              const snapSections = ((published.sectionsSnapshot || []) as Section[]).slice();
              const snapBlocks = ((published.blocksSnapshot || []) as Block[]).slice();
              const snapNavGroups = ((published.navGroupsSnapshot || []) as any[]).slice();

              snapPages.sort((a, b) => a.order_index - b.order_index);
              snapSections.sort((a, b) => a.order_index - b.order_index);
              snapBlocks.sort((a, b) => a.order_index - b.order_index);
              snapNavGroups.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

              setPages(snapPages);
              setAllSections(snapSections);
              setAllBlocks(snapBlocks);
              setNavGroups(snapNavGroups);
              if (published.designSnapshot) setPublishedDesign(published.designSnapshot);
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
        }

        // Fallback to live data if no published version
        const pagesRes = await fetch(`/api/pages?projectId=${proj.id}`);
        const pagesData: Page[] = pagesRes.ok ? await pagesRes.json() : [];

        if (pagesData && pagesData.length > 0) {
          const sorted = [...pagesData].sort((a, b) => a.order_index - b.order_index);
          setPages(sorted);
          const firstPage = sorted[0];
          setActivePage(firstPage);

          const pageIds = sorted.map((p) => p.id);

          const [allSecsRes, firstPageSecsRes] = await Promise.all([
            fetch(`/api/sections?pageIds=${pageIds.join(",")}`),
            fetch(`/api/sections?pageId=${firstPage.id}`),
          ]);

          const allSecs: Section[] = allSecsRes.ok ? await allSecsRes.json() : [];
          const firstPageSecs: Section[] = firstPageSecsRes.ok ? await firstPageSecsRes.json() : [];

          setAllSections(allSecs);
          setSections(firstPageSecs);

          if (firstPageSecs.length > 0) {
            const firstSecIds = firstPageSecs.map((s) => s.id);
            const allSecIds = allSecs.map((s) => s.id);

            const [firstBlksRes, allBlksRes] = await Promise.all([
              firstSecIds.length > 0
                ? fetch(`/api/blocks?sectionIds=${firstSecIds.join(",")}`)
                : Promise.resolve(new Response("[]")),
              allSecIds.length > 0
                ? fetch(`/api/blocks?sectionIds=${allSecIds.join(",")}`)
                : Promise.resolve(new Response("[]")),
            ]);

            const firstBlks: Block[] = firstBlksRes.ok ? await firstBlksRes.json() : [];
            const allBlks: Block[] = allBlksRes.ok ? await allBlksRes.json() : [];

            setBlocks(firstBlks);
            setAllBlocks(allBlks);
          }

          // Load nav groups for live data
          const groupsRes = await fetch(`/api/navgroups?projectId=${proj.id}`);
          if (groupsRes.ok) {
            const groups = await groupsRes.json();
            setNavGroups(groups || []);
          }
        } else {
          setPages([]);
        }
      } catch (e) {
        console.error("Index load error:", e);
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
      const secsRes = await fetch(`/api/sections?pageId=${activePage.id}`);
      const secs: Section[] = secsRes.ok ? await secsRes.json() : [];
      setSections(secs);
      if (secs.length > 0) {
        const secIds = secs.map((s) => s.id);
        const blksRes = await fetch(`/api/blocks?sectionIds=${secIds.join(",")}`);
        const blks: Block[] = blksRes.ok ? await blksRes.json() : [];
        setBlocks(blks);
      } else {
        setBlocks([]);
      }
    };
    loadContent();
  }, [activePage, usingPublished, allSections, allBlocks]);

  const { versions, activeVersion, setActiveVersion } = useVersions(project?.id);
  const filteredPages =
    usingPublished || !(versions.length > 0 && activeVersion)
      ? pages
      : pages.filter((p) => p.version_id === activeVersion.id || !p.version_id);

  const { settings: liveSettings } = useDesignSettings(project?.id);
  const rawSettings = publishedDesign || liveSettings;
  const { resolved: settings } = useResolvedDesignSettings(rawSettings);
  const { theme: platformTheme, toggle: togglePlatformTheme } = usePlatformTheme();
  const showThemeToggle = !getAppearance(rawSettings).strict;

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
          <div className="flex items-center gap-2" style={{ width: `${settings.sidebarWidth}px`, flexShrink: 0 }}>
            <div className="lg:hidden">
              <DocMobileNavComponent
                settings={settings}
                pages={filteredPages}
                activePage={activePage}
                sections={allSections}
                onSelectPage={setActivePage}
                onSearchOpen={() => setSearchOpen(true)}
                navGroups={navGroups}
                projectName="0docs"
              />
            </div>
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

          <div className="flex items-center gap-1.5">
            {showThemeToggle && (
              <button
                onClick={togglePlatformTheme}
                aria-label="Toggle theme"
                title={`Switch to ${platformTheme === "dark" ? "light" : "dark"} theme`}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors hover:bg-accent"
                style={{ color: `hsl(${settings.mutedForegroundColor})` }}
              >
                {platformTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            )}
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
