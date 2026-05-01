import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, Palette, ChevronDown, ChevronRight,
  Plus, Minus, Pencil, Check, Clock, RotateCcw,
  Loader2, Tag, Rocket,
  Search, MousePointerClick, Code, Layout, MessageSquare,
  Smartphone, ThumbsUp, BookOpen, Table2, Zap, ListOrdered,
  Quote, Image, Video, Type, SeparatorHorizontal, CreditCard,
} from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { PublishedVersion, EditorChange, DesignChange } from "@/hooks/use-publish";

interface PublishContentProps {
  editorChanges: EditorChange[];
  designChanges: DesignChange[];
  nextVersion: string;
  isFirstPublish: boolean;
  publishing: boolean;
  onPublish: (notes?: string) => void;
  versions: PublishedVersion[];
  onRevert: (versionId: string) => void;
  projectSlug: string;
  customDomain?: string;
  // Used to detect site features for the "Site Features" panel
  blocks?: any[];
  settings?: DesignSettings;
}

const changeIcon = (type: string) => {
  if (type.includes("added")) return <Plus className="h-3 w-3 text-emerald-500" />;
  if (type.includes("removed")) return <Minus className="h-3 w-3 text-red-400" />;
  return <Pencil className="h-3 w-3 text-amber-500" />;
};

const PublishContent = ({
  editorChanges, designChanges, nextVersion,
  isFirstPublish, publishing, onPublish, versions, onRevert,
  projectSlug, customDomain,
  blocks = [], settings,
}: PublishContentProps) => {
  const [notes, setNotes] = useState("");
  const [editorOpen, setEditorOpen] = useState(true);
  const [designOpen, setDesignOpen] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const hasChanges = editorChanges.length > 0 || designChanges.length > 0;
  const totalChanges = editorChanges.length + designChanges.length;

  // Auto-detect site features from blocks and settings
  const siteFeatures = useMemo(() => {
    const blockTypes = new Set(blocks.map((b: any) => b.type));
    const features: { icon: React.ReactNode; label: string; description: string; active: boolean }[] = [
      {
        icon: <Search className="h-3.5 w-3.5" />,
        label: "Fuzzy Search (⌘K)",
        description: "Full-text search across all pages and sections",
        active: true, // always included
      },
      {
        icon: <Smartphone className="h-3.5 w-3.5" />,
        label: "Mobile Navigation",
        description: "Responsive hamburger menu for mobile devices",
        active: true,
      },
      {
        icon: <BookOpen className="h-3.5 w-3.5" />,
        label: "Table of Contents",
        description: "Right sidebar with section navigation",
        active: settings?.tocVisible !== false,
      },
      {
        icon: <ThumbsUp className="h-3.5 w-3.5" />,
        label: "Page Feedback",
        description: "\"Was this helpful?\" widget on every page",
        active: true,
      },
      {
        icon: <MousePointerClick className="h-3.5 w-3.5" />,
        label: "Interactive Tabs",
        description: "Clickable tab panels with content switching",
        active: blockTypes.has("tabs") || blockTypes.has("code_tabs"),
      },
      {
        icon: <ListOrdered className="h-3.5 w-3.5" />,
        label: "Accordion / Collapsible",
        description: "Expandable content sections",
        active: blockTypes.has("accordion"),
      },
      {
        icon: <Code className="h-3.5 w-3.5" />,
        label: "Code Blocks",
        description: "Syntax-highlighted code with copy button",
        active: blockTypes.has("code_block") || blockTypes.has("code_tabs"),
      },
      {
        icon: <Zap className="h-3.5 w-3.5" />,
        label: "API Reference",
        description: "Method badges, parameter tables, response blocks",
        active: blockTypes.has("api_endpoint"),
      },
      {
        icon: <CreditCard className="h-3.5 w-3.5" />,
        label: "Cards",
        description: "Styled card components with icons",
        active: blockTypes.has("card"),
      },
      {
        icon: <Table2 className="h-3.5 w-3.5" />,
        label: "Data Tables",
        description: "Structured tables with header styling",
        active: blockTypes.has("table"),
      },
      {
        icon: <Layout className="h-3.5 w-3.5" />,
        label: "Step-by-Step Guides",
        description: "Numbered steps with connector lines",
        active: blockTypes.has("steps"),
      },
      {
        icon: <Video className="h-3.5 w-3.5" />,
        label: "Video / YouTube Embeds",
        description: "Embedded video players",
        active: blockTypes.has("video") || blockTypes.has("youtube"),
      },
      {
        icon: <Image className="h-3.5 w-3.5" />,
        label: "Images",
        description: "Resizable images with alignment",
        active: blockTypes.has("image"),
      },
      {
        icon: <Quote className="h-3.5 w-3.5" />,
        label: "Quotes & Callouts",
        description: "Styled blockquotes and callout boxes",
        active: blockTypes.has("quote") || blockTypes.has("callout") || blockTypes.has("note"),
      },
    ];

    const activeFeatures = features.filter(f => f.active);
    const availableFeatures = features.filter(f => !f.active);
    return { active: activeFeatures, available: availableFeatures, total: features.length };
  }, [blocks, settings]);

  const getDefaultCommitMessage = useCallback(() => {
    if (isFirstPublish) return `docs: initial publish v${nextVersion}`;
    const summary = editorChanges.slice(0, 3).map(c => c.label).join(", ");
    return `docs: publish v${nextVersion}${summary ? ` — ${summary}` : ""}`;
  }, [isFirstPublish, nextVersion, editorChanges]);

  const handlePublishToGithub = async () => {
    if (!settings || !project) return;
    setPushingToGithub(true);
    setLastCommit(null);

    try {
      // Fetch ALL sections and blocks for ALL pages (not just the active page)
      const allPageIds = pages.map((p: any) => p.id);
      let allSections = sections;
      let allBlocks = blocks;

      if (allPageIds.length > 0) {
        const { data: sectionsData } = await supabase
          .from("sections")
          .select("*")
          .in("page_id", allPageIds)
          .order("order_index");

        if (sectionsData && sectionsData.length > 0) {
          allSections = sectionsData;
          const sectionIds = sectionsData.map((s: any) => s.id);
          const { data: blocksData } = await supabase
            .from("blocks")
            .select("*")
            .in("section_id", sectionIds)
            .order("order_index");

          if (blocksData) allBlocks = blocksData;
        }
      }

      // Export the documentation
      const exported = exportProject(pages, allSections, allBlocks, settings, navGroups, project?.name || "Documentation", tabs);
      const message = commitMessage.trim() || getDefaultCommitMessage();

      // Call edge function
      const { data, error } = await supabase.functions.invoke("publish-to-github", {
        body: {
          projectId: project.id,
          files: exported.files,
          commitMessage: message,
          branch: targetBranch,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLastCommit({ sha: data.commitSha, url: data.commitUrl });
      setCommitMessage("");

      // Also save internal version
      onPublish(notes || message);
    } catch (e: any) {
      const { toast } = await import("@/hooks/use-toast").then(m => ({ toast: m.toast }));
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    }

    setPushingToGithub(false);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
                  {isFirstPublish ? "Publish to GitHub" : "Publish Changes"}
                </h1>
                <div className="flex items-center gap-2.5 mt-1">
                  <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-[11px] font-mono font-semibold">
                    v{nextVersion}
                  </Badge>
                  {githubConfigured && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Github className="h-3 w-3" />
                      {project.github_repo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={githubConfigured ? handlePublishToGithub : () => onPublish(notes || undefined)}
            disabled={pushingToGithub || publishing || (!hasChanges && !isFirstPublish && !githubConfigured)}
            className="h-10 rounded-xl px-6 text-[13px] font-medium shrink-0"
          >
            {pushingToGithub || publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                {githubConfigured ? <Github className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {isFirstPublish ? "Publish" : `Publish v${nextVersion}`}
              </>
            )}
          </Button>
        </div>

        {/* Success banner */}
        {lastCommit && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4 mb-6 flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">Published successfully</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">{lastCommit.sha.slice(0, 7)}</p>
            </div>
            <a
              href={lastCommit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              View commit <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* GitHub not configured warning */}
        {!githubConfigured && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-4 mb-6">
            <p className="text-[13px] font-medium text-foreground flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub not configured
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Go to <strong>Settings</strong> to connect a GitHub repository. Your documentation will be exported as MDX files and pushed as commits.
            </p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Changes — left/main */}
          <div className="lg:col-span-3 space-y-6">
            {/* Git controls */}
            {githubConfigured && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Branch
                  </label>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      className="h-9 rounded-lg font-mono text-[12px] flex-1"
                      placeholder="main"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Commit Message
                  </label>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder={getDefaultCommitMessage()}
                    rows={2}
                    className="w-full rounded-xl border bg-background px-4 py-3 text-[12px] font-mono resize-none outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
                  />
                </div>
              </div>
            )}

            {/* Site Features */}
            <div className="rounded-xl border overflow-hidden">
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                {featuresOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-[13px] font-medium flex-1">Site Features</span>
                <Badge variant="outline" className="text-[10px] h-5 rounded-md font-mono">
                  {siteFeatures.active.length}/{siteFeatures.total}
                </Badge>
              </button>
              {featuresOpen && (
                <div className="border-t px-4 py-3 space-y-1.5" style={{ backgroundColor: "hsl(var(--muted) / 0.15)" }}>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Features included in the exported site based on your content:
                  </p>
                  {siteFeatures.active.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1 px-2.5 rounded-lg text-[12px]">
                      <span className="text-emerald-500 shrink-0">{f.icon}</span>
                      <span className="font-medium flex-1">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{f.description}</span>
                    </div>
                  ))}
                  {siteFeatures.available.length > 0 && (
                    <>
                      <div className="border-t my-2" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Available (add these blocks to activate)</p>
                      {siteFeatures.available.map((f, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1 px-2.5 rounded-lg text-[12px] opacity-50">
                          <span className="shrink-0">{f.icon}</span>
                          <span className="flex-1">{f.label}</span>
                          <span className="text-[10px] text-muted-foreground hidden sm:block">{f.description}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2">
                Pending Changes
                {totalChanges > 0 && (
                  <Badge variant="outline" className="rounded-lg text-[10px] h-5 font-mono">
                    {totalChanges}
                  </Badge>
                )}
              </h2>

              {!hasChanges && !isFirstPublish ? (
                <div className="rounded-2xl border border-dashed py-12 flex flex-col items-center justify-center">
                  <Check className="h-10 w-10 text-emerald-500 mb-3" />
                  <p className="text-[13px] text-muted-foreground">Everything is up to date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Editor changes */}
                  {(editorChanges.length > 0 || isFirstPublish) && (
                    <div className="rounded-xl border overflow-hidden">
                      <button
                        onClick={() => setEditorOpen(!editorOpen)}
                        className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        {editorOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[13px] font-medium flex-1">Content</span>
                        <Badge variant="outline" className="text-[10px] h-5 rounded-md font-mono">
                          {isFirstPublish && editorChanges.length === 0 ? "Initial" : editorChanges.length}
                        </Badge>
                      </button>
                      {editorOpen && (
                        <div className="border-t px-4 py-2 space-y-1" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                          {isFirstPublish && editorChanges.length === 0 ? (
                            <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[12px] text-muted-foreground">
                              <Plus className="h-3 w-3 text-emerald-500" />
                              Initial publish of all content
                            </div>
                          ) : (
                            editorChanges.map((change, i) => (
                              <div key={i} className="flex items-start gap-2 py-1.5 px-2.5 rounded-lg text-[12px]">
                                {changeIcon(change.type)}
                                <div>
                                  <span>{change.label}</span>
                                  {change.details && (
                                    <span className="block text-muted-foreground text-[11px] mt-0.5">{change.details}</span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Design changes */}
                  {(designChanges.length > 0 || isFirstPublish) && (
                    <div className="rounded-xl border overflow-hidden">
                      <button
                        onClick={() => setDesignOpen(!designOpen)}
                        className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        {designOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[13px] font-medium flex-1">Design</span>
                        <Badge variant="outline" className="text-[10px] h-5 rounded-md font-mono">
                          {isFirstPublish && designChanges.length === 0 ? "Initial" : designChanges.length}
                        </Badge>
                      </button>
                      {designOpen && (
                        <div className="border-t px-4 py-2 space-y-1" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                          {isFirstPublish && designChanges.length === 0 ? (
                            <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[12px] text-muted-foreground">
                              <Plus className="h-3 w-3 text-emerald-500" />
                              Initial design configuration
                            </div>
                          ) : (
                            designChanges.map((change, i) => (
                              <div key={i} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[12px]">
                                <Pencil className="h-3 w-3 text-amber-500" />
                                <span className="flex-1">{change.label}</span>
                                {change.oldValue !== undefined && change.newValue !== undefined && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {String(change.oldValue).slice(0, 12)} → {String(change.newValue).slice(0, 12)}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {!githubConfigured && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Release Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What changed in this version…"
                        rows={3}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-[12px] resize-none outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History — right */}
          <div className="lg:col-span-2">
            <h2 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2">
              Version History
              <Badge variant="outline" className="rounded-lg text-[10px] h-5 font-mono">
                {versions.length}
              </Badge>
            </h2>

            {versions.length === 0 ? (
              <div className="rounded-2xl border border-dashed py-10 flex flex-col items-center justify-center">
                <Tag className="h-7 w-7 text-muted-foreground mb-2" />
                <p className="text-[12px] text-muted-foreground">No versions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="rounded-xl border overflow-hidden">
                    <button
                      onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/30 transition-colors"
                    >
                      <Badge
                        variant={v.is_active ? "default" : "outline"}
                        className="rounded-md px-2 py-0.5 text-[10px] font-mono shrink-0"
                      >
                        v{v.version_number}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {v.is_active && (
                            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                              Latest
                            </span>
                          )}
                          {v.notes && <span className="text-[11px] truncate">{v.notes}</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(v.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {" · "}
                          {new Date(v.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {expandedVersion === v.id ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    </button>

                    {expandedVersion === v.id && (
                      <div className="px-3.5 pb-3 border-t" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                        <div className="pt-3 space-y-2">
                          {v.editor_changes && (v.editor_changes as EditorChange[]).length > 0 && (
                            <div>
                              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <FileText className="h-2.5 w-2.5" /> Content ({(v.editor_changes as EditorChange[]).length})
                              </span>
                              {(v.editor_changes as EditorChange[]).slice(0, 4).map((c, i) => (
                                <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1.5 py-0.5 ml-3">
                                  {changeIcon(c.type)} {c.label}
                                </div>
                              ))}
                              {(v.editor_changes as EditorChange[]).length > 4 && (
                                <span className="text-[9px] text-muted-foreground ml-3">+{(v.editor_changes as EditorChange[]).length - 4} more</span>
                              )}
                            </div>
                          )}

                          {v.design_changes && (v.design_changes as DesignChange[]).length > 0 && (
                            <div>
                              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <Palette className="h-2.5 w-2.5" /> Design ({(v.design_changes as DesignChange[]).length})
                              </span>
                              {(v.design_changes as DesignChange[]).slice(0, 3).map((c, i) => (
                                <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1.5 py-0.5 ml-3">
                                  <Pencil className="h-2.5 w-2.5 text-amber-500" /> {c.label}
                                </div>
                              ))}
                            </div>
                          )}

                          {!v.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] mt-2 rounded-lg"
                              onClick={() => onRevert(v.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Revert to v{v.version_number}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishContent;
