import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilder } from "@/hooks/use-builder";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { usePublish } from "@/hooks/use-publish";
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
import PublishDialog from "@/components/builder/PublishDialog";
import { Button } from "@/components/ui/button";
import { Plus, FileText, FileJson, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Page, Section, Block } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { ParsedOpenAPI } from "@/lib/openapi-parser";
import type { BuilderMode, DesignSubMode } from "@/components/builder/BuilderHeader";
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
    reorderPages, reorderNavGroups, reorderSections, reorderBlocks,
  } = useBuilder(projectId, user?.id);

  const { settings, loading: settingsLoading, saving, saveSettings, resetSettings } = useDesignSettings(projectId);

  // Publish system
  const {
    versions: publishedVersions, publishing, publish, revertToVersion, previewChanges,
  } = usePublish(projectId, user?.id);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const [publishPreview, setPublishPreview] = useState(() => previewChanges(pages, sections, blocks, settings));

  const getCompleteSnapshot = useCallback(async () => {
    const pageIds = pages.map((p) => p.id);
    let allSections: Section[] = [];
    let allBlocks: Block[] = [];

    if (pageIds.length > 0) {
      const { data: secs } = await supabase
        .from("sections")
        .select("*")
        .in("page_id", pageIds)
        .order("order_index");

      allSections = (secs || []) as Section[];

      if (allSections.length > 0) {
        const secIds = allSections.map((s) => s.id);
        const { data: blks } = await supabase
          .from("blocks")
          .select("*")
          .in("section_id", secIds)
          .order("order_index");

        allBlocks = (blks || []) as Block[];
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
      setPublishPreview(previewChanges(pages, allSections, allBlocks, settings));
    };

    computePublishPreview();

    return () => {
      cancelled = true;
    };
  }, [pages, settings, previewChanges, getCompleteSnapshot]);

  const handlePublish = useCallback(async (notes?: string) => {
    if (!projectId || !user?.id) return;

    const { allSections, allBlocks } = await getCompleteSnapshot();
    const result = await publish(pages, allSections, allBlocks, settings, navGroups, notes);

    if (result) {
      setPublishDialogOpen(false);
      const { toast } = await import("@/hooks/use-toast").then(m => ({ toast: m.toast }));
      toast({ title: `Published v${result.version.version_number}`, description: "Your documentation is now live." });
    }
  }, [projectId, user?.id, getCompleteSnapshot, publish, pages, settings, navGroups]);

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
        onPublishClick={() => setPublishDialogOpen(true)}
        hasUnpublishedChanges={publishPreview.editorChanges.length > 0 || publishPreview.designChanges.length > 0 || publishPreview.isFirstPublish}
      />

      {/* Mode: Editor */}
      {mode === "editor" && (
        <DesignSettingsWrapper settings={settings} className="">
          {/* Floating SEO panel — fixed top-left, to the left of the sidebar */}
          {activePage && (
            <SeoFloatingPanel
              page={activePage}
              settings={settings}
            />
          )}
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
                    onAddSection={addSection}
                    onImportOpenAPI={() => {
                      setOpenApiMode("page");
                      setOpenApiOpen(true);
                    }}
                  />

                  <SectionsDndWrapper
                    sections={sections}
                    blocks={blocks}
                    settings={settings}
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
          onDesignSubModeChange={setDesignSubMode}
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

      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        editorChanges={publishPreview.editorChanges}
        designChanges={publishPreview.designChanges}
        nextVersion={publishPreview.nextVersion}
        isFirstPublish={publishPreview.isFirstPublish}
        publishing={publishing}
        onPublish={handlePublish}
        versions={publishedVersions}
        onRevert={async (versionId) => {
          await revertToVersion(versionId);
          const { toast } = await import("@/hooks/use-toast").then(m => ({ toast: m.toast }));
          toast({ title: "Version reverted", description: "The active published version has been updated." });
        }}
        projectSlug={project?.slug || ""}
        customDomain={project?.custom_domain}
      />
    </div>
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

  useEffect(() => {
    setTitle(page.title);
  }, [page.id, page.title]);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {onAddSection && (
              <DropdownMenuItem onClick={onAddSection} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Section
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onImportOpenAPI} className="gap-2">
              <FileJson className="h-4 w-4" />
              Import OpenAPI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

/* ─── Floating SEO Panel ─── */
const SeoFloatingPanel = ({
  page,
  settings,
}: {
  page: Page;
  settings: DesignSettings;
}) => {
  const [metaDesc, setMetaDesc] = useState(page.meta_description || "");
  const [slug, setSlug] = useState(page.slug || "");
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    setMetaDesc(page.meta_description || "");
    setSlug(page.slug || "");
  }, [page.id, page.meta_description, page.slug]);

  const debouncedMetaSave = useDebouncedCallback((value: string) => {
    supabase.from("pages").update({ meta_description: value }).eq("id", page.id).then(() => {});
  }, 800);

  const debouncedSlugSave = useDebouncedCallback((value: string) => {
    supabase.from("pages").update({ slug: value }).eq("id", page.id).then(() => {});
  }, 800);

  return (
    <div
      className="fixed z-50 hidden lg:block"
      style={{
        top: "80px",
        left: "24px",
      }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-accent/80"
        style={{
          backgroundColor: collapsed ? `hsl(${settings.borderColor} / 0.15)` : `hsl(${settings.borderColor} / 0.25)`,
          color: `hsl(${settings.mutedForegroundColor})`,
        }}
      >
        <FileText className="h-3 w-3" />
        SEO
        <span className="text-[9px] opacity-60">{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div
          className="mt-1.5 rounded-xl shadow-lg border animate-fade-in"
          style={{
            width: "280px",
            backgroundColor: `hsl(${settings.borderColor} / 0.08)`,
            borderColor: `hsl(${settings.borderColor} / 0.3)`,
            padding: "14px 16px",
          }}
        >
          <div className="mb-3">
            <label
              className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block"
              style={{ color: `hsl(${settings.mutedForegroundColor} / 0.7)` }}
            >
              Slug
            </label>
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-ring/20"
              style={{
                borderColor: `hsl(${settings.borderColor} / 0.4)`,
                color: `hsl(${settings.mutedForegroundColor})`,
              }}
              value={slug}
              onChange={(e) => { setSlug(e.target.value); debouncedSlugSave(e.target.value); }}
              placeholder="page-slug"
            />
          </div>

          <div>
            <label
              className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block"
              style={{ color: `hsl(${settings.mutedForegroundColor} / 0.7)` }}
            >
              Meta Description
            </label>
            <textarea
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              style={{
                borderColor: `hsl(${settings.borderColor} / 0.4)`,
                color: `hsl(${settings.mutedForegroundColor})`,
              }}
              rows={3}
              value={metaDesc}
              onChange={(e) => { setMetaDesc(e.target.value); debouncedMetaSave(e.target.value); }}
              placeholder="Brief page description for search engines..."
              maxLength={160}
            />
            <div
              className="text-right text-[10px] mt-0.5"
              style={{ color: `hsl(${settings.mutedForegroundColor} / 0.5)` }}
            >
              {metaDesc.length}/160
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Builder;
