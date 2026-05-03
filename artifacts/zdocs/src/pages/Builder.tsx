import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilder, normSection, normBlock } from "@/hooks/use-builder";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { usePublish } from "@/hooks/use-publish";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { setLastProjectId } from "@/lib/last-project";
// BuilderSidebar replaced by NavigationTree (Mintlify-style compact tree)
import SectionEditor from "@/components/builder/SectionEditor";
import DesignSettingsWrapper, { useResolvedDesignSettings } from "@/components/docs/DesignSettingsWrapper";
import OpenAPIImportDialog from "@/components/builder/OpenAPIImportDialog";

import DocContentView from "@/components/docs/DocContentView";
import BuilderHeader from "@/components/builder/BuilderHeader";
import SettingsContent from "@/components/builder/SettingsContent";
import MCPSettings from "@/components/builder/MCPSettings";
import PublishPopover from "@/components/builder/PublishPopover";
import WorkspaceShell from "@/components/builder/WorkspaceShell";
import ProjectHome from "@/components/builder/ProjectHome";
import EditorTabs from "@/components/builder/EditorTabs";
import FilesPanel from "@/components/builder/FilesPanel";
import AnalyticsContent from "@/components/builder/AnalyticsContent";
import ConfigurationsPanel from "@/components/builder/ConfigurationsPanel";
import PageSettingsPanel from "@/components/builder/PageSettingsPanel";
import NavigationTree, { type NavSettingsTarget } from "@/components/builder/NavigationTree";
import SettingsSidePanel, { type SettingsTarget } from "@/components/builder/SettingsSidePanel";
import CodeView from "@/components/builder/CodeView";
import SearchDialog from "@/components/docs/SearchDialog";
import BranchSwitcher from "@/components/builder/BranchSwitcher";
import { BranchProvider, useBranchContext } from "@/contexts/BranchContext";
import { useVersions } from "@/hooks/use-versions";
import { Button } from "@/components/ui/button";
import { Plus, FileText, FileJson, GripVertical, RotateCw, X, SlidersHorizontal } from "lucide-react";
import MadeWithBanner from "@/components/docs/MadeWithBanner";
import type { Page, Section, Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { ParsedOpenAPI } from "@/lib/openapi-parser";
import type { BuilderMode } from "@/components/builder/BuilderHeader";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

export type { Page, Section, Block, BlockType } from "@/hooks/use-builder";

// Outer wrapper: ensures every page in /builder/:projectId is inside a
// BranchProvider so api-client gets the X-Branch-Id header and child hooks
// can read/switch the active branch. The inner key={activeBranchId} forces
// useBuilder & friends to fully remount on branch switch — the cleanest
// way to invalidate all in-flight state without touching every hook.
const Builder = () => {
  const { projectId } = useParams<{ projectId: string }>();
  // Persist the active project id so a subsequent visit to /builder
  // (BuilderEntry) returns the user to the project they were last in.
  useEffect(() => {
    if (projectId) setLastProjectId(projectId);
  }, [projectId]);
  if (!projectId) return <Navigate to="/builder" replace />;
  return (
    <BranchProvider projectId={projectId}>
      <BranchKeyedBuilder />
    </BranchProvider>
  );
};

const BranchKeyedBuilder = () => {
  const { activeBranchId, loading } = useBranchContext();
  // Wait for BranchProvider to settle on a branch (so the first render of
  // BuilderInner already has X-Branch-Id wired up, avoiding a refetch storm).
  if (loading || !activeBranchId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[13px] text-muted-foreground">Loading branch...</span>
      </div>
    );
  }
  return <BuilderInner key={activeBranchId} />;
};

const BuilderInner = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { activeBranch } = useBranchContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [openApiOpen, setOpenApiOpen] = useState(false);
  const [openApiMode, setOpenApiMode] = useState<"block" | "page">("block");
  const [importTargetSectionId, setImportTargetSectionId] = useState<string | null>(null);

  // Derive initial mode from URL path
  const getInitialMode = (): BuilderMode => {
    if (location.pathname.includes("/settings")) return "settings";
    if (location.pathname.endsWith("/mcp")) return "mcp";
    if (location.pathname.endsWith("/editor")) return "editor";
    
    if (location.pathname.endsWith("/configurations")) return "configurations";
    if (location.pathname.endsWith("/analytics")) return "analytics";
    if (location.pathname.endsWith("/code")) return "code";
    if (location.pathname.endsWith("/preview")) return "preview";
    return "home";
  };

  const [mode, setMode] = useState<BuilderMode>(getInitialMode);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  
  const [editorTab, setEditorTab] = useState<"navigation" | "files">("navigation");
  const [settingsTarget, setSettingsTarget] = useState<SettingsTarget | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [publishSnapshot, setPublishSnapshot] = useState<{ allSections: Section[]; allBlocks: Block[] }>({
    allSections: [],
    allBlocks: [],
  });

  useEffect(() => {
    setMode(getInitialMode());
  }, [location.pathname]);

  // Settings panel only makes sense in editor/code; clear it when the user
  // navigates to settings/configurations/analytics/etc. so we don't open
  // back into a stale page-settings on return.
  useEffect(() => {
    if (mode !== "editor" && mode !== "code" && settingsTarget) {
      setSettingsTarget(null);
    }
  }, [mode, settingsTarget]);

  // Global ⌘K / Ctrl+K to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync URL when mode changes
  const handleModeChange = useCallback((newMode: BuilderMode) => {
    setMode(newMode);
    if (!projectId) return;
    const base = `/builder/${projectId}`;
    if (newMode === "home") navigate(base, { replace: true });
    else if (newMode === "settings") navigate(`${base}/settings`, { replace: true });
    else if (newMode === "mcp") navigate(`${base}/mcp`, { replace: true });
    else if (newMode === "editor") navigate(`${base}/editor`, { replace: true });
    
    else if (newMode === "configurations") navigate(`${base}/configurations`, { replace: true });
    else if (newMode === "analytics") navigate(`${base}/analytics`, { replace: true });
    else if (newMode === "code") navigate(`${base}/code`, { replace: true });
    else if (newMode === "preview") navigate(`${base}/preview`, { replace: true });
    else navigate(base, { replace: true });
  }, [projectId, navigate]);

  const {
    project, pages: allPages, activePage, setActivePage, sections, blocks, loading,
    addPage: addPageRaw, updatePage, deletePage, addSection, updateSection, deleteSection,
    addBlock, updateBlock, deleteBlock, reloadPages, loadPageContent,
    navGroups, addNavGroup, updateNavGroup, deleteNavGroup,
    tabs, activeTabId, setActiveTabId, addTab, updateTab, deleteTab, reorderTabs,
    reorderPages, reorderNavGroups, reorderSections, reorderBlocks,
    refreshProject,
  } = useBuilder(projectId, user?.id);

  // Versions: drive editor-side filtering and addPage assignment so authors
  // can branch their docs without leaving the builder (Mintlify-style).
  // This is the SINGLE source of truth — VersionManager + VersionSwitcher
  // receive these handlers via props so creates/clones/deletes propagate instantly.
  const {
    versions, activeVersion, setActiveVersion, defaultVersion,
    addVersion, cloneVersion, setDefault: setVersionDefault, deleteVersion,
  } = useVersions(projectId);

  // Always derive the live active version from `versions` by id so flag changes
  // (e.g. is_default flipping after setDefault) are reflected immediately.
  const liveActiveVersion = useMemo(
    () => (activeVersion ? versions.find((v) => v.id === activeVersion.id) ?? null : null),
    [versions, activeVersion],
  );
  const editingVersionId = liveActiveVersion?.id || null;
  const isEditingDefault = liveActiveVersion?.is_default ?? (defaultVersion == null);

  // Filter pages by the editing version: a page is shown if (a) no versions exist,
  // (b) its versionId matches the editing version, or (c) it has no versionId AND
  // we're editing the default version (legacy pages belong to the default).
  const pages = useMemo(() => {
    if (versions.length === 0) return allPages;
    return allPages.filter((p) =>
      p.version_id === editingVersionId || (!p.version_id && isEditingDefault),
    );
  }, [allPages, versions.length, editingVersionId, isEditingDefault]);

  // Wrapper around useBuilder.addPage that injects the current editing version.
  const addPage = useCallback(
    (navGroupId?: string, tabId?: string | null) =>
      addPageRaw(navGroupId, tabId ?? null, editingVersionId),
    [addPageRaw, editingVersionId],
  );

  // Keep activePage consistent when version filter changes
  useEffect(() => {
    if (!activePage) return;
    const stillVisible = pages.some((p) => p.id === activePage.id);
    if (!stillVisible) {
      setActivePage(pages[0] || null);
    }
  }, [pages, activePage, setActivePage]);

  const { settings, loading: settingsLoading, saving, saveSettings, resetSettings } = useDesignSettings(projectId);
  const { resolved: resolvedSettings } = useResolvedDesignSettings(settings);

  // Publish system
  const {
    versions: publishedVersions, publishing, publish, revertToVersion, previewChanges,
  } = usePublish(projectId, user?.id);
  

  const [publishPreview, setPublishPreview] = useState(() =>
    previewChanges(pages, sections, blocks, settings, navGroups),
  );

  const getCompleteSnapshot = useCallback(async () => {
    const pageIds = pages.map((p) => p.id);
    let allSections: Section[] = [];
    let allBlocks: Block[] = [];

    if (pageIds.length > 0) {
      const secsRes = await fetch(`/api/sections?pageIds=${pageIds.join(",")}`);
      // The /api/sections endpoint returns rows with camelCase keys (pageId,
      // orderIndex, navTitle), but our diff/preview code keys off snake_case
      // (s.page_id). Without normalization every section's page_id is
      // undefined, so EditorChange.pageId never resolves and every change
      // falls into the "orphan" bucket — that was the source of the bogus
      // "234 orphan changes" row in the publish dropdown.
      allSections = secsRes.ok
        ? ((await secsRes.json()) as any[]).map(normSection)
        : [];

      if (allSections.length > 0) {
        const secIds = allSections.map((s) => s.id);
        const blksRes = await fetch(`/api/blocks?sectionIds=${secIds.join(",")}`);
        allBlocks = blksRes.ok
          ? ((await blksRes.json()) as any[]).map(normBlock)
          : [];
      }
    }

    return { allSections, allBlocks };
  }, [pages]);

  // Compute pending changes against full project snapshot (all pages/sections/blocks)
  useEffect(() => {
    let cancelled = false;

    const computePublishPreview = async () => {
      const { allSections, allBlocks } = await getCompleteSnapshot();
      if (cancelled) return;
      setPublishSnapshot({ allSections, allBlocks });
      setPublishPreview(
        previewChanges(pages, allSections, allBlocks, settings, navGroups),
      );
    };

    computePublishPreview();

    return () => {
      cancelled = true;
    };
  }, [pages, settings, navGroups, previewChanges, getCompleteSnapshot]);

  const handlePublish = useCallback(async (notes?: string) => {
    if (!projectId || !user?.id) return;

    const { allSections, allBlocks } = await getCompleteSnapshot();
    const result = await publish(pages, allSections, allBlocks, settings, navGroups, notes);

    if (result) {
      const { toast } = await import("@/hooks/use-toast").then(m => ({ toast: m.toast }));
      toast({ title: `Published v${result.version.version_number}`, description: "Your documentation is now live." });
    }
  }, [projectId, user?.id, getCompleteSnapshot, publish, pages, settings, navGroups]);

  // Listen for sidebar section title edits and full-reload events
  useEffect(() => {
    const updateHandler = (e: Event) => {
      const { id, updates } = (e as CustomEvent).detail;
      updateSection(id, updates);
    };
    const reloadHandler = () => { loadPageContent(); };
    window.addEventListener("builder:updateSection", updateHandler);
    window.addEventListener("builder:reloadActivePage", reloadHandler);
    return () => {
      window.removeEventListener("builder:updateSection", updateHandler);
      window.removeEventListener("builder:reloadActivePage", reloadHandler);
    };
  }, [updateSection, loadPageContent]);

  // Block-level import
  const handleBlockLevelImport = useCallback(async (parsed: ParsedOpenAPI) => {
    if (!importTargetSectionId) return;
    const existingBlocks = blocks.filter((b) => b.section_id === importTargetSectionId);
    let orderIndex = existingBlocks.length;
    for (const ep of parsed.endpoints) {
      await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: importTargetSectionId,
          type: "api_endpoint",
          content: { method: ep.method, path: ep.path, description: ep.description, parameters: ep.parameters, response: ep.response },
          orderIndex: orderIndex++,
        }),
      });
    }
    await loadPageContent();
  }, [importTargetSectionId, blocks, loadPageContent]);

  // Page-level import
  const handlePageLevelImport = useCallback(async (parsed: ParsedOpenAPI) => {
    if (!activePage) return;
    let sectionIndex = sections.length;
    for (const ep of parsed.endpoints) {
      const secRes = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: activePage.id, title: `${ep.method} ${ep.path}`, orderIndex: sectionIndex++ }),
      });
      if (!secRes.ok) continue;
      const section = await secRes.json();
      await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section.id,
          type: "api_endpoint",
          content: { method: ep.method, path: ep.path, description: ep.description, parameters: ep.parameters, response: ep.response },
          orderIndex: 0,
        }),
      });
    }
    await loadPageContent();
  }, [activePage, sections.length]);

  const handleOpenAPIImport = useCallback(async (parsed: ParsedOpenAPI) => {
    if (openApiMode === "block") {
      await handleBlockLevelImport(parsed);
    } else {
      await handlePageLevelImport(parsed);
    }
  }, [openApiMode, handleBlockLevelImport, handlePageLevelImport]);

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[13px] text-muted-foreground">Loading builder...</span>
      </div>
    );
  }

  if (!project) {
    return <Navigate to="/builder" replace />;
  }

  // Header is scoped to the content area (Mintlify-style) and only shown for editor / code / preview modes.
  // Configurations is now a Mintlify-style "third tab" alongside the
  // editor/code views: it shares the BuilderHeader (branch switcher,
  // search, Publish) and keeps the inner Navigation/Files sidebar
  // visible. So it shows the content header just like editor/code.
  const showContentHeader = mode === "editor" || mode === "code" || mode === "configurations";
  const hasUnpublishedChanges = publishPreview.editorChanges.length > 0 || publishPreview.designChanges.length > 0 || publishPreview.isFirstPublish;

  const contentHeader = showContentHeader ? (
    <BuilderHeader
      projectId={projectId!}
      mode={mode}
      onModeChange={handleModeChange}
      publishSlot={
        <PublishPopover
          editorChanges={publishPreview.editorChanges}
          designChanges={publishPreview.designChanges}
          nextVersion={publishPreview.nextVersion}
          isFirstPublish={publishPreview.isFirstPublish}
          publishing={publishing}
          hasUnpublishedChanges={hasUnpublishedChanges}
          onPublish={handlePublish}
          projectSlug={project?.slug || ""}
          customDomain={project?.custom_domain ?? undefined}
          branchName={activeBranch?.name}
          isDefaultBranch={activeBranch?.isDefault ?? true}
        />
      }
      onSearchClick={() => setSearchOpen(true)}
      leftSlot={
        <div className="flex items-center gap-2 min-w-0">
          <BranchSwitcher />
        </div>
      }
    />
  ) : null;

  // Preview mode: render fullscreen, bypassing the WorkspaceShell so it looks like the live page.
  if (mode === "preview") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="h-9 shrink-0 flex items-center justify-between px-3 bg-background border-b border-border/40">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="h-2 w-2 rounded-sm border border-muted-foreground/60" />
            <span>Live preview</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewReloadKey((k) => k + 1)}
              title="Reload"
              aria-label="Reload"
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleModeChange("editor")}
              title="Close preview"
              aria-label="Close preview"
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div key={previewReloadKey} className="flex-1 min-h-0 overflow-auto relative">
          {/* Pass RAW settings here (not resolvedSettings). DesignSettingsWrapper
              inside DocContentView resolves against the live platform theme,
              so the doc body flips immediately when the user clicks the
              sun/moon toggle inside the doc header. Pre-resolving at the parent
              previously double-resolved and froze body colours on toggle. */}
          <DocContentView
            settings={settings}
            projectName={project?.name || ""}
            pages={pages}
            activePage={activePage}
            sections={sections}
            blocks={blocks}
            onSelectPage={(p) => {
              const full = pages.find((pg) => pg.id === p.id);
              if (full) setActivePage(full);
            }}
            headerStickyTop={0}
            navGroups={navGroups}
            hideHeaderLabel
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            projectId={project?.id}
          />
          <MadeWithBanner />
        </div>
      </div>
    );
  }

  return (
    <WorkspaceShell project={project} mode={mode} onModeChange={handleModeChange} hasUnpublishedChanges={hasUnpublishedChanges}>
        <div className="flex-1 min-w-0 flex min-h-0">
          {/* ─── Left tooling column (Mintlify-faithful) ───
           * Hosts EITHER the navigation tree OR the page-settings panel.
           * Settings REPLACES nav so the content area keeps its full width
           * (preventing the cramped 4-pane squeeze). Clicking X / "Back"
           * on settings restores the nav. Visible in both Visual (editor)
           * and Code modes so the user can switch pages from Code view.
           */}
          {(mode === "editor" || mode === "code" || mode === "configurations") && (
            <aside
              className={`shrink-0 border-r border-border/40 bg-background flex-col min-h-0 ${settingsTarget ? "hidden" : "flex"}`}
              style={{ width: settings.sidebarWidth + 8 }}
            >
              <EditorTabs value={editorTab} onChange={setEditorTab} />
              <div className="flex-1 min-h-0 overflow-y-auto">
                {editorTab === "navigation" ? (
                  <NavigationTree
                    settings={resolvedSettings}
                    pages={pages}
                    activePage={activePage}
                    navGroups={navGroups}
                    tabs={tabs}
                    onSelectPage={setActivePage}
                    onAddPage={addPage}
                    onUpdatePage={updatePage}
                    onDeletePage={deletePage}
                    onAddNavGroup={addNavGroup}
                    onUpdateNavGroup={updateNavGroup}
                    onDeleteNavGroup={deleteNavGroup}
                    onAddTab={addTab}
                    onUpdateTab={updateTab}
                    onDeleteTab={deleteTab}
                    onReorderPages={reorderPages}
                    onReorderNavGroups={reorderNavGroups}
                    onOpenSettings={(t: NavSettingsTarget) => {
                      if (t.kind === "page" && t.page) setSettingsTarget({ kind: "page", page: t.page });
                      else if ((t.kind === "group" || t.kind === "dropdown") && t.group) setSettingsTarget({ kind: t.kind, group: t.group });
                      else if (t.tab && (t.kind === "tab" || t.kind === "language" || t.kind === "product" || t.kind === "version"))
                        setSettingsTarget({ kind: t.kind, tab: t.tab });
                    }}
                    /* Nav is only rendered when settingsTarget is null,
                       so no row needs the "selected for settings" highlight here. */
                    selectedSettingsId={null}
                  />
                ) : (
                  <FilesPanel
                    pages={pages}
                    navGroups={navGroups}
                    activePage={activePage}
                    onSelectPage={(p) => {
                      setActivePage(p);
                      setEditorTab("navigation");
                    }}
                    projectSlug={project?.slug}
                    onAddPage={addPage}
                    onAddNavGroup={addNavGroup}
                  />
                )}
              </div>

              {/* Configurations footer (Mintlify-style). Lives at the bottom
                  of the inner Navigation/Files sidebar instead of the
                  outer workspace rail. The Configurations panel itself is
                  branch-scoped via the existing X-Branch-Id header — each
                  branch persists its own design settings. */}
              {/* Active state shows when the user is on the Configurations
                  view, so the footer doubles as a "you are here" indicator
                  while the same nav tree stays visible (Mintlify-style). */}
              <button
                type="button"
                onClick={() => handleModeChange("configurations")}
                aria-current={mode === "configurations" ? "page" : undefined}
                className={`shrink-0 border-t border-border/40 h-9 px-3 flex items-center gap-2 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                  mode === "configurations"
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Configurations</span>
              </button>

            </aside>
          )}

          {(mode === "editor" || mode === "code" || mode === "configurations") && settingsTarget && (
            <SettingsSidePanel
              target={settingsTarget}
              onClose={() => setSettingsTarget(null)}
              width={Math.max(settings.sidebarWidth + 8, 320)}
              projectSlug={project?.slug}
              tabs={tabs}
              onPageUpdated={(id, updates) => updatePage(id, updates)}
              onGroupUpdated={(id, updates) => updateNavGroup(id, updates)}
              onTabUpdated={(id, updates) => updateTab(id, updates)}
              onDeletePage={(id) => deletePage(id)}
              onDeleteGroup={(id) => deleteNavGroup(id)}
              onDeleteTab={(id) => deleteTab(id)}
            />
          )}

          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {mode === "home" && (
              <ProjectHome
                project={project}
                pages={pages}
                navGroups={navGroups}
                tabs={tabs}
                onModeChange={handleModeChange}
              />
            )}
            {contentHeader}
            {mode === "editor" && (
              <DesignSettingsWrapper settings={settings} className="flex-1 min-h-0 overflow-y-auto">
                <main className="mx-auto px-5 py-8" style={{ maxWidth: resolvedSettings.contentMaxWidth + 40 }}>
                  {activePage ? (
                    <article style={{ maxWidth: `${resolvedSettings.contentMaxWidth}px` }} className="animate-fade-in">
                      <PageTitleEditor
                        page={activePage}
                        onUpdate={updatePage}
                        settings={resolvedSettings}
                        onAddSection={addSection}
                        onImportOpenAPI={() => {
                          setOpenApiMode("page");
                          setOpenApiOpen(true);
                        }}
                      />

                      <SectionsDndWrapper
                        sections={sections}
                        blocks={blocks}
                        settings={resolvedSettings}
                        onUpdateSection={updateSection}
                        onDeleteSection={deleteSection}
                        onAddBlock={addBlock}
                        onUpdateBlock={updateBlock}
                        onDeleteBlock={deleteBlock}
                        onReorderSections={reorderSections}
                        onReorderBlocks={reorderBlocks}
                        onImportOpenAPI={(sectionId) => {
                          setOpenApiMode("block");
                          setImportTargetSectionId(sectionId);
                          setOpenApiOpen(true);
                        }}
                      />

                      <button
                        onClick={addSection}
                        className="zdocs-editor-dashed w-full rounded-xl py-6 text-[13px] text-muted-foreground hover:text-primary transition-all mt-6 flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" /> Add Section
                      </button>
                    </article>
                  ) : (
                    <div className="text-center py-20 animate-fade-in" style={{ color: `hsl(${resolvedSettings.mutedForegroundColor})` }}>
                      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
                        <FileText className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <p className="mb-5 text-[14px]">No pages yet. Add a page to get started.</p>
                      <Button onClick={() => addPage()} className="rounded-lg">
                        <Plus className="h-4 w-4 mr-2" /> Add Page
                      </Button>
                    </div>
                  )}
                </main>
              </DesignSettingsWrapper>
            )}



            {mode === "configurations" && (
              <ConfigurationsPanel
                projectId={projectId!}
                projectName={project?.name || ""}
                  settings={resolvedSettings}
                saving={saving}
                saveSettings={saveSettings}
                resetSettings={resetSettings}
              />
            )}

            {/* Mode: Code (Monaco MDX) — sidebar above lets the user switch pages while staying in Code view */}
            {mode === "code" && (
              <CodeView
                page={activePage}
                sections={sections}
                blocks={blocks}
                settings={resolvedSettings}
                projectSlug={project?.slug}
              />
            )}

            {/* Mode: Analytics */}
            {mode === "analytics" && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnalyticsContent projectId={projectId!} projectName={project?.name} projectSlug={project?.slug} />
              </div>
            )}

            {/* Mode: Settings */}
            {mode === "settings" && (
              <SettingsContent projectId={projectId!} project={project} onSaved={refreshProject} />
            )}

            {/* Mode: MCP */}
            {mode === "mcp" && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-8 py-8">
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">MCP Server</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Let AI agents read and edit your docs via the Model Context Protocol
                    </p>
                  </div>
                  <MCPSettings projectId={projectId!} />
                </div>
              </div>
            )}

            {/* Publish UI is now a Mintlify-style dropdown anchored to the
                Publish button in BuilderHeader (PublishPopover). No dedicated
                publish page anymore. */}
          </div>
        </div>

      <OpenAPIImportDialog open={openApiOpen} onOpenChange={setOpenApiOpen} onImport={handleOpenAPIImport} />

      {/* Settings side panel rendered at top-level so it floats next to the navigation column on desktop */}

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
        sections={sections.map((s) => ({ id: s.id, page_id: s.page_id, title: s.title }))}
        blocks={blocks.map((b) => ({ id: b.id, section_id: b.section_id, type: b.type, content: b.content }))}
        onSelectPage={(p) => {
          const full = pages.find((pg) => pg.id === p.id);
          if (full) setActivePage(full);
        }}
        onSelectSection={(sectionId, p) => {
          const full = pages.find((pg) => pg.id === p.id);
          if (full) setActivePage(full);
          setTimeout(() => {
            const el = document.getElementById(`section-${sectionId}`);
            if (!el) return;
            // The editor scroll container is the DesignSettingsWrapper (overflow-y-auto),
            // not window — walk up to find the nearest scrollable ancestor.
            let scroller: HTMLElement | null = el.parentElement;
            while (scroller && scroller !== document.body) {
              const oy = getComputedStyle(scroller).overflowY;
              if (oy === "auto" || oy === "scroll") break;
              scroller = scroller.parentElement;
            }
            if (scroller && scroller !== document.body) {
              const top = el.getBoundingClientRect().top
                - scroller.getBoundingClientRect().top
                + scroller.scrollTop
                - 24;
              scroller.scrollTo({ top, behavior: "smooth" });
            } else {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 200);
        }}
      />
    </WorkspaceShell>
  );
};

/* ─── Sortable section wrapper ─── */
const SortableSection = ({
  id,
  children,
}: {
  id: string;
  children: (props: { handleProps: Record<string, any> }) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.25 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ handleProps: { ...attributes, ...listeners } })}
    </div>
  );
};

/* ─── Sections DnD wrapper ─── */
const SectionsDndWrapper = ({
  sections,
  blocks,
  settings,
  onUpdateSection,
  onDeleteSection,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onReorderSections,
  onReorderBlocks,
  onImportOpenAPI,
}: {
  sections: Section[];
  blocks: import("@/hooks/use-builder").Block[];
  settings: DesignSettings;
  onUpdateSection: (id: string, updates: Partial<Section>) => void;
  onDeleteSection: (id: string) => void;
  onAddBlock: (sectionId: string, type: string) => void;
  onUpdateBlock: (id: string, updates: Partial<import("@/hooks/use-builder").Block>) => void;
  onDeleteBlock: (id: string) => void;
  onReorderSections: (sections: Section[]) => void;
  onReorderBlocks: (blocks: import("@/hooks/use-builder").Block[]) => void;
  onImportOpenAPI: (sectionId: string) => void;
}) => {
  const [dragActiveSectionId, setDragActiveSectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order_index - b.order_index),
    [sections]
  );

  const sectionIds = useMemo(() => sortedSections.map((s) => s.id), [sortedSections]);

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveSectionId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedSections.findIndex((s) => s.id === active.id);
      const newIndex = sortedSections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sortedSections];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      onReorderSections(reordered.map((s, i) => ({ ...s, order_index: i })));
    },
    [sortedSections, onReorderSections]
  );

  const dragOverlaySection = useMemo(() => {
    if (!dragActiveSectionId) return null;
    const section = sortedSections.find((s) => s.id === dragActiveSectionId);
    if (!section) return null;
    const sectionBlocks = blocks.filter((b) => b.section_id === section.id);
    return (
      <div
        className="rounded-xl px-4 py-3 shadow-xl"
        style={{
          backgroundColor: `hsl(${settings.backgroundColor})`,
          maxWidth: "400px",
        }}
      >
        <div
          className="font-semibold mb-1"
          style={{
            fontFamily: `'${settings.headingFont}', sans-serif`,
            fontSize: `${settings.headingFontSize * 0.7}px`,
          }}
          dangerouslySetInnerHTML={{ __html: section.title }}
        />
        <div className="text-xs" style={{ color: `hsl(${settings.mutedForegroundColor})` }}>
          {sectionBlocks.length} block{sectionBlocks.length !== 1 ? "s" : ""}
        </div>
      </div>
    );
  }, [dragActiveSectionId, sortedSections, blocks, settings]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setDragActiveSectionId(e.active.id as string)}
      onDragEnd={handleSectionDragEnd}
    >
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        {sortedSections.map((section) => (
          <SortableSection key={section.id} id={section.id}>
            {({ handleProps }) => (
              <SectionEditor
                section={section}
                blocks={blocks.filter((b) => b.section_id === section.id)}
                settings={settings}
                onUpdateSection={onUpdateSection}
                onDeleteSection={onDeleteSection}
                onAddBlock={onAddBlock}
                onUpdateBlock={onUpdateBlock}
                onDeleteBlock={onDeleteBlock}
                onReorderBlocks={onReorderBlocks}
                sectionDragHandleProps={handleProps}
                onImportOpenAPI={() => onImportOpenAPI(section.id)}
              />
            )}
          </SortableSection>
        ))}
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {dragOverlaySection}
      </DragOverlay>
    </DndContext>
  );
};

const PageTitleEditor = ({
  page, onUpdate, settings, onImportOpenAPI, onAddSection,
}: {
  page: Page;
  onUpdate: (id: string, updates: Partial<Page>) => void;
  settings: DesignSettings;
  onImportOpenAPI?: () => void;
  onAddSection?: () => void;
}) => {
  const [title, setTitle] = useState(page.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(page.title);
  }, [page.id, page.title]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const debouncedSave = useDebouncedCallback((value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
    onUpdate(page.id, { title: value, slug });
  }, 600);

  return (
    <div style={{ marginBottom: `${settings.sectionSpacing * 0.6}px` }}>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-transparent border-none outline-none focus:ring-2 focus:ring-ring/20 rounded-lg px-1 -ml-1"
          style={{
            fontFamily: `'${settings.headingFont}', sans-serif`,
            fontWeight: settings.headingWeight,
            fontSize: `${settings.pageTitleSize}px`,
          }}
          value={title}
          onChange={(e) => { setTitle(e.target.value); debouncedSave(e.target.value); }}
          placeholder="Page title..."
        />
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 min-w-[180px] overflow-hidden rounded-lg border border-border/40 bg-popover p-1 text-popover-foreground shadow-md">
              {onAddSection && (
                <button onClick={() => { setMenuOpen(false); onAddSection(); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground">
                  <Plus className="h-4 w-4" /> Add Section
                </button>
              )}
              <button onClick={() => { setMenuOpen(false); onImportOpenAPI?.(); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground">
                <FileJson className="h-4 w-4" /> Import OpenAPI
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Builder;
