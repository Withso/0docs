import { forwardRef } from "react";
import { ArrowUpRight, BarChart3, BookOpen, Boxes, Code2, FileText, GitBranch, Globe2, Layers3, Palette, Rocket, Search, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BuilderMode } from "./BuilderHeader";
import type { Page, NavGroup, Tab } from "@/hooks/use-builder";
import type { WorkspaceProject } from "@/app/api/projects";

interface ProjectHomeProps {
  project: WorkspaceProject;
  pages: Page[];
  navGroups: NavGroup[];
  tabs: Tab[];
  onModeChange: (mode: BuilderMode) => void;
}

const features = [
  { label: "Editor", description: "Write pages, sections, and blocks", icon: FileText, mode: "editor" as BuilderMode },
  { label: "Navigation", description: "Groups, dropdowns, versions, languages", icon: Layers3, mode: "editor" as BuilderMode },
  { label: "Design", description: "Typography, sidebar, spacing, theme", icon: Palette, mode: "design" as BuilderMode },
  { label: "Configurations", description: "OpenAPI, files, and project config", icon: Settings, mode: "configurations" as BuilderMode },
  { label: "Code", description: "Inspect MDX-style page output", icon: Code2, mode: "code" as BuilderMode },
  { label: "Analytics", description: "Views, feedback, and engagement", icon: BarChart3, mode: "analytics" as BuilderMode },
  { label: "Preview", description: "Review the public documentation", icon: Search, mode: "preview" as BuilderMode },
  { label: "Publish", description: "Ship docs to GitHub and your domain", icon: Rocket, mode: "publish" as BuilderMode },
];

const ProjectHome = forwardRef<HTMLElement, ProjectHomeProps>(({ project, pages, navGroups, tabs, onModeChange }, ref) => {
  const published = Boolean(project?.published_version_id);
  const liveUrl = project?.custom_domain ? `https://${project.custom_domain}` : `/docs/${project?.slug}`;

  return (
    <main ref={ref} className="flex-1 overflow-auto bg-background">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="min-w-0">
            <div className="mb-7">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-3">
                <BookOpen className="h-3.5 w-3.5" /> Documentation project
              </div>
              <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-foreground mb-2">{project?.name}</h1>
              <p className="text-[14px] text-muted-foreground max-w-2xl leading-relaxed">
                {project?.description || "Manage the full documentation workspace from one place."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
              {[
                { label: "Pages", value: pages.length, icon: FileText },
                { label: "Navigation groups", value: navGroups.length, icon: Layers3 },
                { label: "Switchers", value: tabs.length, icon: Boxes },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-lg border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] text-muted-foreground">{stat.label}</span>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="text-[24px] font-semibold text-foreground">{stat.value}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.label}
                    onClick={() => onModeChange(feature.mode)}
                    className="group text-left rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors p-4 flex items-start gap-3"
                  >
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-foreground">{feature.label}</p>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{feature.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
              <div className="h-9 border-b border-border/60 flex items-center gap-1.5 px-3">
                <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                <span className="ml-2 text-[11px] text-muted-foreground truncate">{project?.slug}</span>
              </div>
              <div className="p-5 min-h-[260px]">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-4 w-4 text-foreground" />
                  <span className="text-[13px] font-medium text-foreground">Docs preview</span>
                </div>
                <div className="space-y-2 mb-8">
                  {pages.slice(0, 5).map((page) => (
                    <div key={page.id} className="h-7 rounded-md bg-muted/60 px-2 flex items-center text-[12px] text-muted-foreground">
                      {page.nav_title || page.title}
                    </div>
                  ))}
                  {pages.length === 0 && <div className="text-[12px] text-muted-foreground">No pages yet.</div>}
                </div>
                <Button size="sm" className="w-full h-8 text-[12px]" onClick={() => onModeChange("editor")}>
                  Open editor
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Publishing</p>
                  <p className="text-[12px] text-muted-foreground">{published ? "Live documentation" : "Not published yet"}</p>
                </div>
                <Globe2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-[12px] flex-1" onClick={() => onModeChange("publish")}>Publish</Button>
                {published && (
                  <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <a href={liveUrl} target="_blank" rel="noreferrer" aria-label="Open live docs"><ArrowUpRight className="h-3.5 w-3.5" /></a>
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[13px] font-medium text-foreground">Repository</p>
              </div>
              <p className="text-[12px] text-muted-foreground truncate">{project?.github_repo || "Connect GitHub in Settings"}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
});

ProjectHome.displayName = "ProjectHome";

export default ProjectHome;
