import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilder } from "@/hooks/use-builder";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import BuilderSidebar from "@/components/builder/BuilderSidebar";
import SectionEditor from "@/components/builder/SectionEditor";
import DesignSettingsWrapper from "@/components/docs/DesignSettingsWrapper";
import OpenAPIImportDialog from "@/components/builder/OpenAPIImportDialog";
import DesignPanel from "@/components/builder/DesignPanel";
import DocContentView from "@/components/docs/DocContentView";
import BuilderHeader from "@/components/builder/BuilderHeader";
import SettingsContent from "@/components/builder/SettingsContent";
import AnalyticsContent from "@/components/builder/AnalyticsContent";
import { Button } from "@/components/ui/button";
import { Plus, FileText, FileJson } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Page } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { ParsedOpenAPI } from "@/lib/openapi-parser";
import type { BuilderMode, DesignSubMode } from "@/components/builder/BuilderHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type { Page, Section, Block, BlockType } from "@/hooks/use-builder";

const Builder = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openApiOpen, setOpenApiOpen] = useState(false);
  const [openApiMode, setOpenApiMode] = useState<"block" | "page">("block");
  const [importTargetSectionId, setImportTargetSectionId] = useState<string | null>(null);

  // Derive initial mode from URL path
  const getInitialMode = (): BuilderMode => {
    if (location.pathname.endsWith("/analytics")) return "analytics";
    if (location.pathname.endsWith("/settings")) return "settings";
    if (location.pathname.endsWith("/design")) return "design";
    return "editor";
  };

  const [mode, setMode] = useState<BuilderMode>(getInitialMode);
  const [designSubMode, setDesignSubMode] = useState<DesignSubMode>("live");

  // Sync URL when mode changes
  const handleModeChange = useCallback((newMode: BuilderMode) => {
    setMode(newMode);
    if (!projectId) return;
    const base = `/builder/${projectId}`;
    if (newMode === "analytics") navigate(`${base}/analytics`, { replace: true });
    else if (newMode === "settings") navigate(`${base}/settings`, { replace: true });
    else if (newMode === "design") navigate(`${base}/design`, { replace: true });
    else navigate(base, { replace: true });
  }, [projectId, navigate]);

  const {
    project, pages, activePage, setActivePage, sections, blocks, loading,
    addPage, updatePage, deletePage, addSection, updateSection, deleteSection,
    addBlock, updateBlock, deleteBlock, reloadPages, loadPageContent,
    navGroups, addNavGroup, updateNavGroup, deleteNavGroup,
    reorderPages, reorderNavGroups, reorderSections,
  } = useBuilder(projectId, user?.id);

  const { settings, loading: settingsLoading, saving, saveSettings, resetSettings } = useDesignSettings(projectId);

  // Listen for sidebar section title edits and sync to builder state
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, updates } = (e as CustomEvent).detail;
      updateSection(id, updates);
    };
    window.addEventListener("builder:updateSection", handler);
    return () => window.removeEventListener("builder:updateSection", handler);
  }, [updateSection]);

  // Block-level import
  const handleBlockLevelImport = useCallback(async (parsed: ParsedOpenAPI) => {
    if (!importTargetSectionId) return;
    const existingBlocks = blocks.filter((b) => b.section_id === importTargetSectionId);
    let orderIndex = existingBlocks.length;
    for (const ep of parsed.endpoints) {
      await supabase
        .from("blocks")
        .insert({
          section_id: importTargetSectionId,
          type: "api_endpoint" as any,
          content: { method: ep.method, path: ep.path, description: ep.description, parameters: ep.parameters, response: ep.response },
          order_index: orderIndex++,
        });
    }
    await loadPageContent();
  }, [importTargetSectionId, blocks, loadPageContent]);

  // Page-level import
  const handlePageLevelImport = useCallback(async (parsed: ParsedOpenAPI) => {
    if (!activePage) return;
    let sectionIndex = sections.length;
    for (const ep of parsed.endpoints) {
      const { data: section } = await supabase
        .from("sections")
        .insert({ page_id: activePage.id, title: `${ep.method} ${ep.path}`, order_index: sectionIndex++ })
        .select()
        .single();
      if (!section) continue;
      await supabase.from("blocks").insert({
        section_id: section.id,
        type: "api_endpoint" as any,
        content: { method: ep.method, path: ep.path, description: ep.description, parameters: ep.parameters, response: ep.response },
        order_index: 0,
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
    navigate("/dashboard");
    return null;
  }

  const frameMaxWidth = settings.contentMaxWidth + settings.sidebarWidth + 48;

  return (
    <div className={`min-h-screen bg-background ${mode === "design" ? "flex flex-col h-screen overflow-hidden" : ""}`}>
      <BuilderHeader
        projectId={projectId!}
        projectName={project?.name || ""}
        activePageTitle={activePage?.title || "No page"}
        mode={mode}
        onModeChange={handleModeChange}
        designSubMode={designSubMode}
        onDesignSubModeChange={setDesignSubMode}
      />

      {/* Mode: Editor */}
      {mode === "editor" && (
        <DesignSettingsWrapper settings={settings} className="">
          <div style={{ maxWidth: `${frameMaxWidth}px` }} className="mx-auto flex px-6">
            <BuilderSidebar
              settings={settings}
              pages={pages}
              activePage={activePage}
              sections={sections}
              navGroups={navGroups}
              onSelectPage={setActivePage}
              onAddPage={addPage}
              onUpdatePage={updatePage}
              onDeletePage={deletePage}
              onAddNavGroup={addNavGroup}
              onUpdateNavGroup={updateNavGroup}
              onDeleteNavGroup={deleteNavGroup}
              onReorderPages={reorderPages}
              onReorderNavGroups={reorderNavGroups}
              onReorderSections={reorderSections}
            />

            <main className="flex-1 min-w-0 py-10 lg:pl-4">
              {activePage ? (
                <article style={{ maxWidth: `${settings.contentMaxWidth}px` }} className="animate-fade-in">
                  <PageTitleEditor
                    page={activePage}
                    onUpdate={updatePage}
                    settings={settings}
                    onImportOpenAPI={() => {
                      setOpenApiMode("page");
                      setOpenApiOpen(true);
                    }}
                  />

                  {sections.map((section) => (
                    <SectionEditor
                      key={section.id}
                      section={section}
                      blocks={blocks.filter((b) => b.section_id === section.id)}
                      settings={settings}
                      onUpdateSection={updateSection}
                      onDeleteSection={deleteSection}
                      onAddBlock={addBlock}
                      onUpdateBlock={updateBlock}
                      onDeleteBlock={deleteBlock}
                      onImportOpenAPI={() => {
                        setOpenApiMode("block");
                        setImportTargetSectionId(section.id);
                        setOpenApiOpen(true);
                      }}
                    />
                  ))}

                  <button
                    onClick={addSection}
                    className="w-full border-2 border-dashed rounded-xl py-6 text-[13px] text-muted-foreground hover:text-primary hover:border-primary/30 transition-all mt-6 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Section
                  </button>
                </article>
              ) : (
                <div className="text-center py-20 animate-fade-in" style={{ color: `hsl(${settings.mutedForegroundColor})` }}>
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
          </div>
        </DesignSettingsWrapper>
      )}

      {/* Mode: Design */}
      {mode === "design" && (
        <DesignPanel
          projectId={projectId!}
          projectName={project?.name || ""}
          settings={settings}
          saving={saving}
          saveSettings={saveSettings}
          resetSettings={resetSettings}
          designSubMode={designSubMode}
        />
      )}

      {/* Mode: Preview */}
      {mode === "preview" && (
        <div className="flex-1">
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
            hideHeader
            navGroups={navGroups}
            hideHeaderLabel
          />
        </div>
      )}

      {/* Mode: Analytics */}
      {mode === "analytics" && (
        <AnalyticsContent projectId={projectId!} userId={user?.id || ""} />
      )}

      {/* Mode: Settings */}
      {mode === "settings" && (
        <SettingsContent projectId={projectId!} project={project} />
      )}

      <OpenAPIImportDialog open={openApiOpen} onOpenChange={setOpenApiOpen} onImport={handleOpenAPIImport} />
    </div>
  );
};

const PageTitleEditor = ({
  page, onUpdate, settings, onImportOpenAPI,
}: {
  page: Page;
  onUpdate: (id: string, updates: Partial<Page>) => void;
  settings: DesignSettings;
  onImportOpenAPI?: () => void;
}) => {
  const [title, setTitle] = useState(page.title);
  const [metaDesc, setMetaDesc] = useState(page.meta_description || "");
  const [showMeta, setShowMeta] = useState(false);

  useEffect(() => {
    setTitle(page.title);
    setMetaDesc(page.meta_description || "");
  }, [page.id, page.title]);

  const debouncedSave = useDebouncedCallback((value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
    onUpdate(page.id, { title: value, slug });
  }, 600);

  const debouncedMetaSave = useDebouncedCallback((value: string) => {
    supabase.from("pages").update({ meta_description: value }).eq("id", page.id).then(() => {});
  }, 800);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={onImportOpenAPI} className="gap-2">
              <FileJson className="h-4 w-4" />
              Import OpenAPI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <button
        onClick={() => setShowMeta(!showMeta)}
        className="text-[12px] mt-1.5 px-1 transition-colors hover:text-primary"
        style={{ color: `hsl(${settings.mutedForegroundColor})` }}
      >
        {showMeta ? "Hide SEO ↑" : "SEO Settings ↓"}
      </button>
      {showMeta && (
        <div className="mt-2 animate-fade-in">
          <label className="text-[11px] font-medium" style={{ color: `hsl(${settings.mutedForegroundColor})` }}>
            Meta Description
          </label>
          <textarea
            className="w-full mt-1 bg-transparent border rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            style={{
              borderColor: `hsl(${settings.borderColor})`,
              color: `hsl(${settings.mutedForegroundColor})`,
            }}
            rows={2}
            value={metaDesc}
            onChange={(e) => { setMetaDesc(e.target.value); debouncedMetaSave(e.target.value); }}
            placeholder="Brief page description for search engines (max 160 chars)..."
            maxLength={160}
          />
          <div className="text-right text-[10px] mt-0.5" style={{ color: `hsl(${settings.mutedForegroundColor})` }}>
            {metaDesc.length}/160
          </div>
        </div>
      )}
    </div>
  );
};

export default Builder;
