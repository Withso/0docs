import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilder } from "@/hooks/use-builder";
import BuilderSidebar from "@/components/builder/BuilderSidebar";
import SectionEditor from "@/components/builder/SectionEditor";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Eye, Palette } from "lucide-react";

// Re-export types for backward compat
export type { Page, Section, Block, BlockType } from "@/hooks/use-builder";

const Builder = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    project,
    pages,
    activePage,
    setActivePage,
    sections,
    blocks,
    loading,
    addPage,
    updatePage,
    deletePage,
    addSection,
    updateSection,
    deleteSection,
    addBlock,
    updateBlock,
    deleteBlock,
  } = useBuilder(projectId, user?.id);

  const { settings: designSettings, saving: designSaving, saveSettings, resetSettings } = useDesignSettings(projectId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!project) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Builder header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground text-sm">{project?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <DesignSettingsPanel
              settings={designSettings}
              saving={designSaving}
              onSave={saveSettings}
              onReset={resetSettings}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/docs/${project?.slug}`, "_blank")}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
            </Button>
          </div>
        </div>
      </header>

      {/* Builder body */}
      <div className="max-w-[1100px] mx-auto flex px-6">
        <BuilderSidebar
          projectName={project?.name || ""}
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
            <article className="max-w-[680px]">
              {/* Page title — editable with debounce */}
              <PageTitleEditor
                page={activePage}
                onUpdate={updatePage}
              />

              {/* Sections */}
              {sections.map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  blocks={blocks.filter((b) => b.section_id === section.id)}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                  onAddBlock={addBlock}
                  onUpdateBlock={updateBlock}
                  onDeleteBlock={deleteBlock}
                />
              ))}

              {/* Add section button */}
              <button
                onClick={addSection}
                className="w-full border-2 border-dashed rounded-lg py-6 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors mt-6 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Section
              </button>
            </article>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No pages yet. Add a page to get started.</p>
              <Button onClick={addPage} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Add Page
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Separate component for page title with local state + debounced save
import { useState, useEffect } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import type { Page } from "@/hooks/use-builder";

const PageTitleEditor = ({ page, onUpdate }: { page: Page; onUpdate: (id: string, updates: Partial<Page>) => void }) => {
  const [title, setTitle] = useState(page.title);

  useEffect(() => {
    setTitle(page.title);
  }, [page.id, page.title]);

  const debouncedSave = useDebouncedCallback((value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
    onUpdate(page.id, { title: value, slug });
  }, 600);

  return (
    <input
      className="text-2xl font-bold text-foreground mb-6 w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-ring/20 rounded px-1 -ml-1"
      value={title}
      onChange={(e) => {
        setTitle(e.target.value);
        debouncedSave(e.target.value);
      }}
      placeholder="Page title..."
    />
  );
};

export default Builder;
