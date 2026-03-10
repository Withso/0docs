import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilder } from "@/hooks/use-builder";
import { useDesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import BuilderSidebar from "@/components/builder/BuilderSidebar";
import SectionEditor from "@/components/builder/SectionEditor";
import DesignSettingsWrapper from "@/components/docs/DesignSettingsWrapper";
import OpenAPIImportDialog from "@/components/builder/OpenAPIImportDialog";
import VersionManager from "@/components/builder/VersionManager";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ArrowLeft, Eye, Palette, FileText, FileJson, BarChart3, Settings, MoreHorizontal, Tag, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Page } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { ParsedOpenAPI } from "@/lib/openapi-parser";

export type { Page, Section, Block, BlockType } from "@/hooks/use-builder";

const Builder = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openApiOpen, setOpenApiOpen] = useState(false);

  const {
    project, pages, activePage, setActivePage, sections, blocks, loading,
    addPage, updatePage, deletePage, addSection, updateSection, deleteSection,
    addBlock, updateBlock, deleteBlock,
  } = useBuilder(projectId, user?.id);

  const { settings, loading: settingsLoading } = useDesignSettings(projectId);

  const handleOpenAPIImport = useCallback(async (parsed: ParsedOpenAPI) => {
    if (!projectId) return;
    const tagGroups = new Map<string, typeof parsed.endpoints>();
    for (const ep of parsed.endpoints) {
      const tag = ep.tags[0] || "Default";
      if (!tagGroups.has(tag)) tagGroups.set(tag, []);
      tagGroups.get(tag)!.push(ep);
    }
    let pageIndex = pages.length;
    for (const [tag, endpoints] of tagGroups) {
      const slug = `api-${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const { data: page } = await supabase
        .from("pages")
        .insert({ project_id: projectId, title: `API: ${tag}`, slug, order_index: pageIndex++ })
        .select()
        .single();
      if (!page) continue;
      for (let i = 0; i < endpoints.length; i++) {
        const ep = endpoints[i];
        const { data: section } = await supabase
          .from("sections")
          .insert({ page_id: page.id, title: `${ep.method} ${ep.path}`, order_index: i })
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
    }
    window.location.reload();
  }, [projectId, pages.length]);

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
    <DesignSettingsWrapper settings={settings} className="min-h-screen">
      <div className="sticky top-0 z-50 p-1.5">
        <header
          className="border rounded-2xl backdrop-blur-xl shadow-sm"
          style={{ backgroundColor: `hsl(${settings.backgroundColor} / 0.85)`, borderColor: `hsl(${settings.borderColor})` }}
        >
          <div className="px-4 h-[48px] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-lg bg-platform-accent-soft flex items-center justify-center shrink-0">
                  <FileText className="h-3 w-3 text-primary" />
                </div>
                <span className="font-semibold text-foreground text-[13px] truncate">{project?.name}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[12px] text-muted-foreground truncate">{activePage?.title || "No page"}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-[12px] hidden sm:flex rounded-lg" onClick={() => navigate(`/builder/${projectId}/design`)}>
                <Palette className="h-3.5 w-3.5 mr-1.5" /> Design
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg" onClick={() => window.open(`/docs/${project?.slug}`, "_blank")}>
                <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Preview</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/builder/${projectId}/analytics`)}>
                    <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenApiOpen(true)}>
                    <FileJson className="h-4 w-4 mr-2" /> Import API
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/builder/${projectId}/settings`)}>
                    <Settings className="h-4 w-4 mr-2" /> Project Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      </div>

      <div style={{ maxWidth: `${frameMaxWidth}px` }} className="mx-auto flex px-6">
        <BuilderSidebar
          settings={settings}
          pages={pages}
          activePage={activePage}
          sections={sections}
          onSelectPage={setActivePage}
          onAddPage={addPage}
          onUpdatePage={updatePage}
          onDeletePage={deletePage}
        />

        <main className="flex-1 min-w-0 py-10 lg:pl-4">
          {activePage ? (
            <article style={{ maxWidth: `${settings.contentMaxWidth}px` }} className="animate-fade-in">
              <PageTitleEditor page={activePage} onUpdate={updatePage} settings={settings} />

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
              <Button onClick={addPage} className="rounded-lg">
                <Plus className="h-4 w-4 mr-2" /> Add Page
              </Button>
            </div>
          )}
        </main>
      </div>
      <OpenAPIImportDialog open={openApiOpen} onOpenChange={setOpenApiOpen} onImport={handleOpenAPIImport} />
    </DesignSettingsWrapper>
  );
};

const PageTitleEditor = ({
  page, onUpdate, settings,
}: {
  page: Page;
  onUpdate: (id: string, updates: Partial<Page>) => void;
  settings: DesignSettings;
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
      <input
        className="w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-ring/20 rounded-lg px-1 -ml-1"
        style={{
          fontFamily: `'${settings.headingFont}', sans-serif`,
          fontWeight: settings.headingWeight,
          fontSize: `${settings.pageTitleSize}px`,
        }}
        value={title}
        onChange={(e) => { setTitle(e.target.value); debouncedSave(e.target.value); }}
        placeholder="Page title..."
      />
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
