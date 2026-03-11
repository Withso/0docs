import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, Palette, ChevronDown, ChevronRight,
  Plus, Minus, Pencil, Check, Clock, RotateCcw, Eye,
  Loader2, Tag, Rocket, ArrowUpRight,
} from "lucide-react";
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
}: PublishContentProps) => {
  const [notes, setNotes] = useState("");
  const [editorOpen, setEditorOpen] = useState(true);
  const [designOpen, setDesignOpen] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const hasChanges = editorChanges.length > 0 || designChanges.length > 0;
  const totalChanges = editorChanges.length + designChanges.length;

  const liveUrl = customDomain
    ? `https://${customDomain}`
    : `${window.location.origin}/docs/${projectSlug}`;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        {/* Title row with publish button */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
                  {isFirstPublish ? "Publish Documentation" : "Publish Changes"}
                </h1>
                <div className="flex items-center gap-2.5 mt-1">
                  <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-[11px] font-mono font-semibold">
                    v{nextVersion}
                  </Badge>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 truncate"
                  >
                    <Eye className="h-3 w-3" />
                    {liveUrl}
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => { onPublish(notes || undefined); setNotes(""); }}
            disabled={publishing || (!hasChanges && !isFirstPublish)}
            className="h-10 rounded-xl px-6 text-[13px] font-medium shrink-0"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {isFirstPublish ? "Publish" : `Publish v${nextVersion}`}
              </>
            )}
          </Button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Changes — left/main */}
          <div className="lg:col-span-3 space-y-6">
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
                              Live
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
