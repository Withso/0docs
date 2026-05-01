import { forwardRef, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, CheckCircle2, XCircle, RefreshCw, ExternalLink, Globe2, FilePenLine, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listProjectActivity, type ActivityEntry } from "@/app/api/activity";
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

const greetingFor = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w} week${w === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const ProjectHome = forwardRef<HTMLElement, ProjectHomeProps>(({ project, pages, onModeChange }, ref) => {
  const { user } = useAuth();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const firstName = useMemo(() => {
    const dn = (user?.user_metadata?.display_name as string | undefined) || "";
    if (dn) return dn.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "there";
  }, [user]);

  const greeting = useMemo(() => greetingFor(new Date()), []);
  const isLive = Boolean(project?.published_version_id);
  const liveUrl = project?.custom_domain
    ? `https://${project.custom_domain}`
    : `${window.location.origin}/docs/${project?.slug}`;
  const domainLabel = project?.custom_domain || `${project?.slug}.0docs.app`;
  const latest = activity[0];

  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;
    setLoadingActivity(true);
    listProjectActivity(project.id, 12)
      .then((rows) => { if (!cancelled) setActivity(rows); })
      .catch(() => { if (!cancelled) setActivity([]); })
      .finally(() => { if (!cancelled) setLoadingActivity(false); });
    return () => { cancelled = true; };
  }, [project?.id]);

  return (
    <main ref={ref} className="flex-1 overflow-auto bg-background">
      <div className="max-w-6xl mx-auto px-10 py-12">
        {/* Greeting */}
        <div className="flex items-start justify-between mb-10">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
        </div>

        {/* Project hero card */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 mb-14">
          {/* Preview thumbnail */}
          <button
            onClick={() => onModeChange("preview")}
            className="group relative rounded-xl overflow-hidden border border-border/60 bg-card aspect-[16/10] text-left hover:border-border transition-colors"
            aria-label="Open preview"
          >
            <DocsPreviewThumbnail pages={pages} projectName={project?.name || ""} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Project meta */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[18px] font-semibold text-foreground">{project?.name}</h2>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[11px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" /> Draft
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-5">
              <span>Last updated</span>
              <span className="text-foreground font-medium">
                {latest ? relativeTime(latest.published_at) : project?.updated_at ? relativeTime(project.updated_at) : "never"}
              </span>
              {(latest?.publisher_name || firstName) && (
                <>
                  <span>by</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full bg-accent flex items-center justify-center text-[9px] font-medium text-accent-foreground">
                      {(latest?.publisher_name || firstName)[0].toUpperCase()}
                    </span>
                    <span className="text-foreground">{latest?.publisher_name || firstName}</span>
                  </span>
                </>
              )}
            </div>

            {/* Action chips */}
            <div className="flex items-center gap-2 mb-6">
              <IconButton title="Edit" onClick={() => onModeChange("editor")}>
                <FilePenLine className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton title="Publish" onClick={() => onModeChange("publish")}>
                <RefreshCw className="h-3.5 w-3.5" />
              </IconButton>
              {isLive && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 hover:bg-muted/40 text-[12px] text-foreground transition-colors"
                >
                  <Globe2 className="h-3.5 w-3.5" /> Visit site
                </a>
              )}
            </div>

            {/* Domain */}
            <div>
              <p className="text-[12px] font-medium text-foreground mb-1.5">Domain</p>
              {isLive ? (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] text-foreground hover:underline"
                >
                  {domainLabel}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-[13px] text-muted-foreground">Publish to assign a domain</p>
              )}
              <button
                onClick={() => onModeChange("settings")}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add custom domain
              </button>
            </div>
          </div>
        </section>

        {/* Activity */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-foreground">Activity</h2>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[2fr_1fr_3fr_auto] gap-4 px-5 py-3 border-b border-border/60 bg-muted/20 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div>Update</div>
              <div>Status</div>
              <div>Changes</div>
              <div className="w-6" />
            </div>

            {loadingActivity && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            {!loadingActivity && activity.length === 0 && (
              <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                No activity yet — publish your project to see updates here.
              </div>
            )}

            {!loadingActivity && activity.map((row, i) => {
              const expanded = expandedRow === row.id;
              const isFirst = i === 0;
              const totalChanges = row.pages_count + row.sections_count + row.blocks_count;
              const initial = (row.publisher_name || "M")[0].toUpperCase();
              return (
                <div key={row.id} className={`border-b border-border/60 last:border-b-0 ${expanded ? "bg-muted/10" : ""}`}>
                  <button
                    onClick={() => setExpandedRow(expanded ? null : row.id)}
                    className="w-full grid grid-cols-[2fr_1fr_3fr_auto] gap-4 px-5 py-4 items-center text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center shrink-0">
                        <RefreshCw className="h-3.5 w-3.5 text-accent-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {row.publisher_name || "Manual Update"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{relativeTime(row.published_at)}</p>
                      </div>
                    </div>

                    <div>
                      {row.is_active || isFirst ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 text-[11px] font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Successful
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Successful
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[13px] text-foreground truncate">
                        {row.notes || `Version ${row.version_number}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {totalChanges} {totalChanges === 1 ? "item" : "items"} synced
                        {" · "}{row.pages_count} pages · {row.blocks_count} blocks
                      </p>
                    </div>

                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 pt-1 grid grid-cols-3 gap-4 text-[12px]">
                      <Stat label="Pages" value={row.pages_count} />
                      <Stat label="Sections" value={row.sections_count} />
                      <Stat label="Blocks" value={row.blocks_count} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
});

ProjectHome.displayName = "ProjectHome";

const IconButton = ({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className="h-8 w-8 rounded-lg border border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
  >
    {children}
  </button>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md bg-muted/30 px-3 py-2">
    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className="text-[15px] font-semibold text-foreground">{value}</p>
  </div>
);

/**
 * Lightweight visual stand-in for a published-site screenshot.
 * Renders a faux browser with the project nav titles.
 */
const DocsPreviewThumbnail = ({ pages, projectName }: { pages: Page[]; projectName: string }) => (
  <div className="absolute inset-0 flex flex-col bg-card">
    <div className="h-7 border-b border-border/60 flex items-center gap-1.5 px-3">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      <span className="ml-3 text-[10px] text-muted-foreground truncate">{projectName}</span>
    </div>
    <div className="flex-1 grid grid-cols-[100px_1fr] min-h-0">
      <div className="border-r border-border/60 p-3 space-y-1.5 overflow-hidden">
        {pages.slice(0, 6).map((p) => (
          <div key={p.id} className="h-2 rounded-sm bg-muted-foreground/15" style={{ width: `${50 + ((p.title?.length || 5) % 4) * 10}%` }} />
        ))}
      </div>
      <div className="p-4 space-y-2 overflow-hidden">
        <div className="h-3 w-1/2 rounded bg-foreground/40" />
        <div className="h-2 w-full rounded bg-muted-foreground/15" />
        <div className="h-2 w-5/6 rounded bg-muted-foreground/15" />
        <div className="h-2 w-4/6 rounded bg-muted-foreground/15" />
        <div className="mt-3 h-12 rounded-md bg-muted/40" />
        <div className="h-2 w-3/4 rounded bg-muted-foreground/15" />
        <div className="h-2 w-2/3 rounded bg-muted-foreground/15" />
      </div>
    </div>
  </div>
);

export default ProjectHome;
