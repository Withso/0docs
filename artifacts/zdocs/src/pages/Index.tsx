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
  } as Page;
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
function normNavGroup(r: any): any {
  return {
    ...r,
    order_index: r.orderIndex ?? r.order_index ?? 0,
    page_id: r.pageId ?? r.page_id ?? undefined,
    tab_id: r.tabId ?? r.tab_id ?? null,
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Ambient gradient mesh */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.35]"
          style={{
            background:
              "radial-gradient(800px 500px at 12% 0%, hsl(220 90% 60% / 0.08), transparent 60%), radial-gradient(700px 500px at 88% 100%, hsl(152 70% 45% / 0.06), transparent 60%)",
          }}
        />
        {/* Subtle dotted grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />

        {/* Header */}
        <header className="relative z-10 h-14 flex items-center justify-between px-6 lg:px-8 border-b border-border/60 backdrop-blur-sm bg-background/70">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center text-[12px] font-bold tracking-tight">
              0
            </div>
            <span className="font-semibold tracking-tight text-[15px]">0docs</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.mintlify.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-8 px-3 text-[13px] rounded-md items-center font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Documentation
            </a>
            <button
              onClick={() => navigate("/auth")}
              className="h-8 px-3.5 text-[13px] rounded-md inline-flex items-center gap-1.5 font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="relative z-10 max-w-[920px] mx-auto px-6 lg:px-8 pt-20 pb-20 lg:pt-32">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-border/80 bg-background/60 backdrop-blur text-[12px] text-muted-foreground mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Documentation is being set up
            </div>
            <h1 className="text-[44px] sm:text-[56px] leading-[1.05] font-semibold tracking-[-0.03em] text-foreground mb-5 max-w-[720px]">
              Beautiful documentation,
              <br />
              <span className="text-muted-foreground">crafted with care.</span>
            </h1>
            <p className="text-[17px] text-muted-foreground max-w-[540px] mb-10 leading-relaxed">
              0docs gives your team a Mintlify-grade documentation builder —
              powerful editor, themable design system, and a reading experience
              your users will love.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => navigate("/auth")}
                className="h-11 px-5 rounded-lg inline-flex items-center gap-2 font-medium text-[14px] bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <LogIn className="h-4 w-4" /> Get started
              </button>
              <a
                href="https://www.mintlify.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-5 rounded-lg inline-flex items-center gap-2 font-medium text-[14px] border border-border hover:bg-accent transition-colors"
              >
                Learn more
              </a>
            </div>
          </div>

          {/* Feature trio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-24">
            {[
              {
                title: "Visual editor",
                desc: "Write content in a polished WYSIWYG editor with code, tabs, callouts, and components.",
              },
              {
                title: "Themable design",
                desc: "Pick from curated themes or fully customize colors, type, and spacing.",
              },
              {
                title: "Publish & version",
                desc: "Snapshot versions, revert anytime, and ship updates with one click.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/80 bg-card/40 backdrop-blur p-5 hover:border-border transition-colors"
              >
                <div className="text-[14px] font-semibold tracking-tight mb-1.5">
                  {f.title}
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </main>

        <footer className="relative z-10 border-t border-border/60 py-5 px-6 lg:px-8 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>© {new Date().getFullYear()} 0docs</span>
          <span className="hidden sm:inline">Built for teams that ship</span>
        </footer>
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
