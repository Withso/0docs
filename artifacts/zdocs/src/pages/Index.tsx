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
  nav_group_id?: string | null;
  nav_title?: string | null;
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
interface Tab {
  id: string;
  label: string;
  order_index: number;
  metadata?: Record<string, any>;
}
interface NavGroup {
  id: string;
  title: string;
  order_index: number;
  type?: string;
  tab_id?: string | null;
  metadata?: Record<string, any>;
}

// Normalize API response rows from Drizzle camelCase to frontend snake_case convention
function normPage(r: any): Page {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    order_index: r.orderIndex ?? r.order_index ?? 0,
    meta_description: r.metaDescription ?? r.meta_description ?? null,
    version_id: r.versionId ?? r.version_id ?? null,
    nav_group_id: r.navGroupId ?? r.nav_group_id ?? null,
    nav_title: r.navTitle ?? r.nav_title ?? null,
  };
}
function normTab(r: any): Tab {
  return {
    id: r.id,
    label: r.label,
    order_index: r.orderIndex ?? r.order_index ?? 0,
    metadata: r.metadata ?? {},
  };
}
function normSection(r: any): Section {
  return {
    id: r.id,
    page_id: r.pageId ?? r.page_id,
    title: r.title,
    order_index: r.orderIndex ?? r.order_index ?? 0,
  };
}
function normBlock(r: any): Block {
  return {
    id: r.id,
    section_id: r.sectionId ?? r.section_id,
    type: r.type,
    content: r.content ?? {},
    order_index: r.orderIndex ?? r.order_index ?? 0,
  };
}
function normNavGroup(r: any): NavGroup {
  return {
    id: r.id,
    title: r.title,
    order_index: r.orderIndex ?? r.order_index ?? 0,
    type: r.type ?? "label",
    tab_id: r.tabId ?? r.tab_id ?? null,
    metadata: r.metadata ?? {},
  };
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
  const [navGroups, setNavGroups] = useState<NavGroup[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
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

        // Load tabs in parallel — public endpoint returns tabs for published projects.
        // Default activeTabId to the first tab so users see content immediately when
        // every nav group is assigned to a tab.
        fetch(`/api/tabs?projectId=${proj.id}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((rows: any[]) => {
            const normalized = (rows || []).map(normTab)
              .sort((a, b) => a.order_index - b.order_index);
            setTabs(normalized);
            // Default to the first VISIBLE tab — hidden tabs aren't selectable in the UI
            const firstVisible = normalized.find((t) => !t.metadata?.hidden);
            if (firstVisible) setActiveTabId(firstVisible.id);
          })
          .catch(() => setTabs([]));

        // Check for published version first — serve published snapshot if available
        if (proj.publishedVersionId || proj.published_version_id) {
          const verId = proj.publishedVersionId || proj.published_version_id;
          const pubRes = await fetch(`/api/versions/${verId}`);
          if (pubRes.ok) {
            const published = await pubRes.json();
            if (published && published.isActive) {
              // Normalize snapshot data — may be stored in either camelCase or snake_case
              const snapPages = ((published.pagesSnapshot || []) as any[]).map(normPage);
              const snapSections = ((published.sectionsSnapshot || []) as any[]).map(normSection);
              const snapBlocks = ((published.blocksSnapshot || []) as any[]).map(normBlock);
              const snapNavGroups = ((published.navGroupsSnapshot || []) as any[]).map(normNavGroup);

              snapPages.sort((a, b) => a.order_index - b.order_index);
              snapSections.sort((a, b) => a.order_index - b.order_index);
              snapBlocks.sort((a, b) => a.order_index - b.order_index);
              snapNavGroups.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

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

        // Fallback to live data if no published version — normalize Drizzle camelCase to snake_case
        const pagesRes = await fetch(`/api/pages?projectId=${proj.id}`);
        const pagesRaw: any[] = pagesRes.ok ? await pagesRes.json() : [];
        const pagesData: Page[] = pagesRaw.map(normPage);

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

          const allSecs: Section[] = allSecsRes.ok
            ? ((await allSecsRes.json()) as any[]).map(normSection) : [];
          const firstPageSecs: Section[] = firstPageSecsRes.ok
            ? ((await firstPageSecsRes.json()) as any[]).map(normSection) : [];

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

            const firstBlks: Block[] = firstBlksRes.ok
              ? ((await firstBlksRes.json()) as any[]).map(normBlock) : [];
            const allBlks: Block[] = allBlksRes.ok
              ? ((await allBlksRes.json()) as any[]).map(normBlock) : [];

            setBlocks(firstBlks);
            setAllBlocks(allBlks);
          }

          // Load nav groups for live data
          const groupsRes = await fetch(`/api/navgroups?projectId=${proj.id}`);
          if (groupsRes.ok) {
            const groupsRaw: any[] = await groupsRes.json();
            setNavGroups((groupsRaw || []).map(normNavGroup));
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
      const secs: Section[] = secsRes.ok
        ? ((await secsRes.json()) as any[]).map(normSection) : [];
      setSections(secs);
      if (secs.length > 0) {
        const secIds = secs.map((s) => s.id);
        const blksRes = await fetch(`/api/blocks?sectionIds=${secIds.join(",")}`);
        const blks: Block[] = blksRes.ok
          ? ((await blksRes.json()) as any[]).map(normBlock) : [];
        setBlocks(blks);
      } else {
        setBlocks([]);
      }
    };
    loadContent();
  }, [activePage, usingPublished, allSections, allBlocks]);

  const { versions, activeVersion, setActiveVersion } = useVersions(project?.id);
  const versionFilteredPages =
    usingPublished || !(versions.length > 0 && activeVersion)
      ? pages
      : pages.filter((p) => p.version_id === activeVersion.id || !p.version_id);

  // Filter pages by active tab: a page belongs to a tab when its nav group's tab_id matches.
  // Pages without a nav group, or whose nav group has no tab_id, only show when no tab is active.
  const filteredPages = activeTabId
    ? versionFilteredPages.filter((p) => {
        const group = navGroups.find((g) => g.id === p.nav_group_id);
        return group?.tab_id === activeTabId;
      })
    : versionFilteredPages.filter((p) => {
        if (!p.nav_group_id) return true;
        const group = navGroups.find((g) => g.id === p.nav_group_id);
        return !group?.tab_id;
      });

  // Keep activePage in sync with filtered pages — switch to first available when tab changes,
  // when version switches, or whenever the filtered membership changes (not just length).
  const filteredPageIdsKey = filteredPages.map((p) => p.id).join("|");
  useEffect(() => {
    if (filteredPages.length === 0) return;
    if (!activePage || !filteredPages.some((p) => p.id === activePage.id)) {
      setActivePage(filteredPages[0]);
    }
  }, [filteredPageIdsKey]);

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
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-border/80 bg-background/60 text-[12px] text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Documentation is being set up
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">
            No docs published yet
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Once a project is published and marked as the homepage, it will
            appear here.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="h-10 px-4 rounded-lg text-[13px] font-medium border border-border hover:bg-accent transition-colors"
            >
              Back to home
            </button>
            <button
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="h-10 px-4 rounded-lg text-[13px] font-medium inline-flex items-center gap-2 bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5" />
              {user ? "Open dashboard" : "Sign in"}
            </button>
          </div>
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
          {tabs.length > 0 && (
            <div className="hidden md:flex items-center gap-1 mr-4">
              {[...tabs]
                .filter((tab) => !tab.metadata?.hidden)
                .sort((a, b) => a.order_index - b.order_index)
                .map((tab) => {
                  const isActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(isActive ? null : tab.id)}
                      className="px-3.5 py-1.5 rounded-full transition-colors text-[13px]"
                      style={{
                        color: isActive
                          ? `hsl(${settings.foregroundColor})`
                          : `hsl(${settings.mutedForegroundColor})`,
                        fontWeight: isActive ? 500 : 400,
                        fontFamily: `'${settings.bodyFont}', sans-serif`,
                        backgroundColor: isActive ? `hsl(${settings.mutedColor})` : "transparent",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
            </div>
          )}
          <div className="flex-1 min-w-0 lg:pl-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 transition-colors hover:bg-accent/80"
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
                className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded border border-border/40 px-1.5 py-0.5 text-[10px]"
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
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
      />
      {project?.id && <AskDocsChat projectId={project.id} settings={settings} />}
      <MadeWithBanner />
    </div>
  );
};

export default Index;
