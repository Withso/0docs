import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { useVersions } from "@/hooks/use-versions";
import { useAuth } from "@/contexts/AuthContext";
import DocContentView from "@/components/docs/DocContentView";
import AskDocsChat from "@/components/docs/AskDocsChat";
import useSEOHead from "@/hooks/use-seo-head";
import { LogIn, LayoutDashboard } from "lucide-react";
import MadeWithBanner from "@/components/docs/MadeWithBanner";
import DocMobileNavComponent from "@/components/docs/DocMobileNav";
import DocsPreviewHeader from "@/components/docs/DocsPreviewHeader";
import { useResolvedDesignSettings } from "@/components/docs/DesignSettingsWrapper";
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
  // /p/:slug → look up that specific project. /docs (no slug) → homepage project.
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  // Honor ?page=<slug> on initial mount (used by "open in new tab" from
  // search results so the linked page actually loads instead of the first).
  const initialPageSlugRef = useRef<string | null>(searchParams.get("page"));
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

  // Load project by route slug (subpath publishing) or fall back to homepage.
  useEffect(() => {
    const load = async () => {
      try {
        const lookupUrl = routeSlug
          ? `/api/projects?slug=${encodeURIComponent(routeSlug)}`
          : "/api/projects?homepage=true";
        const res = await fetch(lookupUrl);
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
    setLoading(true);
    load();
    // Re-run when the route slug changes so navigating between /p/:slug
    // routes within the SPA loads the right project (instead of showing
    // stale data from the previous slug).
  }, [routeSlug]);

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
    // First priority on the very first render: honor a ?page=<slug> query
    // (e.g. coming from "open in new tab" in the search dialog).
    if (initialPageSlugRef.current) {
      const wantedSlug = initialPageSlugRef.current;
      const target = filteredPages.find((p) => p.slug === wantedSlug);
      initialPageSlugRef.current = null;
      // Strip the param so reloads/back-button stay clean.
      if (searchParams.has("page")) {
        const next = new URLSearchParams(searchParams);
        next.delete("page");
        setSearchParams(next, { replace: true });
      }
      if (target) {
        setActivePage(target);
        return;
      }
    }
    if (!activePage || !filteredPages.some((p) => p.id === activePage.id)) {
      setActivePage(filteredPages[0]);
    }
  }, [filteredPageIdsKey]);

  const { settings: liveSettings } = useDesignSettings(project?.id);
  const rawSettings = publishedDesign || liveSettings;
  const { resolved: settings } = useResolvedDesignSettings(rawSettings);
  const showThemeToggle = !getAppearance(rawSettings).strict;
  const headerFrameMaxWidth =
    settings.contentMaxWidth + settings.sidebarWidth + 240 + 96;

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
              onClick={() => navigate(user ? "/builder" : "/auth")}
              className="h-10 px-4 rounded-lg text-[13px] font-medium inline-flex items-center gap-2 bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5" />
              {user ? "Open workspace" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <DocsPreviewHeader
        settings={settings}
        projectName={project?.name || "0docs"}
        projectLogo={(project as any)?.logoUrl ?? null}
        onLogoClick={() => {
          if (filteredPages.length > 0) setActivePage(filteredPages[0]);
        }}
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        versions={usingPublished ? [] : versions}
        activeVersion={usingPublished ? null : activeVersion}
        onSelectVersion={usingPublished ? undefined : setActiveVersion}
        onSearchOpen={() => setSearchOpen(true)}
        showThemeToggle={showThemeToggle}
        frameMaxWidth={headerFrameMaxWidth}
        mobileNav={
          <DocMobileNavComponent
            settings={settings}
            pages={filteredPages}
            activePage={activePage}
            sections={allSections}
            onSelectPage={setActivePage}
            onSearchOpen={() => setSearchOpen(true)}
            navGroups={navGroups}
            projectName={project?.name || "0docs"}
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
          />
        }
        rightActions={
          user ? (
            <button
              onClick={() => navigate("/builder")}
              className="h-9 px-3 text-[13px] rounded-lg gap-1.5 inline-flex items-center font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Workspace
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="h-9 px-3 text-[13px] rounded-lg gap-1.5 inline-flex items-center font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
          )
        }
      />

      {/* Pass rawSettings — DocContentView's DesignSettingsWrapper resolves
          against the live platform theme so the doc body flips with the
          sun/moon toggle. (Index's own chrome above uses pre-resolved
          `settings` for local inline styles, which is fine because Index
          itself re-renders on theme change via the same hook.) */}
      <DocContentView
        settings={rawSettings}
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
