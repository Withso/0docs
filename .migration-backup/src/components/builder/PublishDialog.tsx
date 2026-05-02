import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload, FileText, Palette, ChevronDown, ChevronRight,
  Plus, Minus, Pencil, Check, Clock, RotateCcw, Eye,
  Loader2, Tag,
} from "lucide-react";
import type { PublishedVersion, EditorChange, DesignChange } from "@/hooks/use-publish";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const PublishDialog = ({
  open, onOpenChange, editorChanges, designChanges, nextVersion,
  isFirstPublish, publishing, onPublish, versions, onRevert,
  projectSlug, customDomain,
}: PublishDialogProps) => {
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<"changes" | "history">("changes");
  const [editorOpen, setEditorOpen] = useState(true);
  const [designOpen, setDesignOpen] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const hasChanges = editorChanges.length > 0 || designChanges.length > 0;
  const totalChanges = editorChanges.length + designChanges.length;

  const liveUrl = customDomain
    ? `https://${customDomain}`
    : `${window.location.origin}/docs/${projectSlug}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-[17px]">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              {isFirstPublish ? "Publish Documentation" : "Publish Changes"}
            </DialogTitle>
          </DialogHeader>

          {/* Version badge & URL */}
          <div className="mt-4 flex items-center gap-3">
            <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-[11px] font-mono font-semibold">
              v{nextVersion}
            </Badge>
            <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {liveUrl}
            </span>
          </div>

          {/* Tab toggle */}
          <div className="mt-4 flex items-center gap-1 p-0.5 rounded-lg bg-muted">
            <button
              onClick={() => setTab("changes")}
              className={`flex-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                tab === "changes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Changes {totalChanges > 0 && `(${totalChanges})`}
            </button>
            <button
              onClick={() => setTab("history")}
              className={`flex-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              History ({versions.length})
            </button>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "changes" ? (
            <div className="space-y-4">
              {!hasChanges && !isFirstPublish ? (
                <div className="text-center py-8">
                  <Check className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-[13px] text-muted-foreground">No changes since last publish</p>
                </div>
              ) : (
                <>
                  {/* Editor changes */}
                  {(editorChanges.length > 0 || isFirstPublish) && (
                    <div>
                      <button
                        onClick={() => setEditorOpen(!editorOpen)}
                        className="flex items-center gap-2 w-full text-left mb-2"
                      >
                        {editorOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[13px] font-semibold">Editor Changes</span>
                        <Badge variant="outline" className="ml-auto text-[10px] h-5 rounded-md">
                          {isFirstPublish && editorChanges.length === 0 ? "Initial" : editorChanges.length}
                        </Badge>
                      </button>
                      {editorOpen && (
                        <div className="space-y-1 ml-5">
                          {isFirstPublish && editorChanges.length === 0 ? (
                            <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[12px] text-muted-foreground" style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
                              <Plus className="h-3 w-3 text-emerald-500" />
                              Initial publish of all content
                            </div>
                          ) : (
                            editorChanges.map((change, i) => (
                              <div key={i} className="flex items-start gap-2 py-1.5 px-2.5 rounded-lg text-[12px]" style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
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
                    <div>
                      <button
                        onClick={() => setDesignOpen(!designOpen)}
                        className="flex items-center gap-2 w-full text-left mb-2"
                      >
                        {designOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[13px] font-semibold">Design Changes</span>
                        <Badge variant="outline" className="ml-auto text-[10px] h-5 rounded-md">
                          {isFirstPublish && designChanges.length === 0 ? "Initial" : designChanges.length}
                        </Badge>
                      </button>
                      {designOpen && (
                        <div className="space-y-1 ml-5">
                          {isFirstPublish && designChanges.length === 0 ? (
                            <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[12px] text-muted-foreground" style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
                              <Plus className="h-3 w-3 text-emerald-500" />
                              Initial design configuration
                            </div>
                          ) : (
                            designChanges.map((change, i) => (
                              <div key={i} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[12px]" style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
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
                  <div className="mt-4">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Release Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What changed in this version..."
                      rows={2}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-[12px] resize-none outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Version history */
            <div className="space-y-2">
              {versions.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-[13px] text-muted-foreground">No versions published yet</p>
                </div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="rounded-xl border overflow-hidden">
                    <button
                      onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <Badge
                        variant={v.is_active ? "default" : "outline"}
                        className="rounded-md px-2 py-0.5 text-[11px] font-mono shrink-0"
                      >
                        v{v.version_number}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {v.is_active && (
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                              Live
                            </span>
                          )}
                          {v.notes && <span className="text-[12px] truncate">{v.notes}</span>}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(v.published_at).toLocaleDateString()} at {new Date(v.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {expandedVersion === v.id ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                    
                    {expandedVersion === v.id && (
                      <div className="px-4 pb-3 border-t" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                        <div className="pt-3 space-y-2">
                          {/* Editor changes summary */}
                          {v.editor_changes && (v.editor_changes as EditorChange[]).length > 0 && (
                            <div>
                              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <FileText className="h-3 w-3" /> Editor ({(v.editor_changes as EditorChange[]).length})
                              </span>
                              {(v.editor_changes as EditorChange[]).slice(0, 5).map((c, i) => (
                                <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5 py-0.5 ml-3">
                                  {changeIcon(c.type)} {c.label}
                                </div>
                              ))}
                              {(v.editor_changes as EditorChange[]).length > 5 && (
                                <span className="text-[10px] text-muted-foreground ml-3">+{(v.editor_changes as EditorChange[]).length - 5} more</span>
                              )}
                            </div>
                          )}

                          {/* Design changes summary */}
                          {v.design_changes && (v.design_changes as DesignChange[]).length > 0 && (
                            <div>
                              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <Palette className="h-3 w-3" /> Design ({(v.design_changes as DesignChange[]).length})
                              </span>
                              {(v.design_changes as DesignChange[]).slice(0, 3).map((c, i) => (
                                <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5 py-0.5 ml-3">
                                  <Pencil className="h-3 w-3 text-amber-500" /> {c.label}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Revert button */}
                          {!v.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] mt-2 rounded-lg"
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
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === "changes" && (
          <>
            <Separator />
            <div className="px-6 py-4 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {isFirstPublish ? "This will make your docs live" : `${totalChanges} change${totalChanges !== 1 ? "s" : ""} to publish`}
              </span>
              <Button
                onClick={() => { onPublish(notes || undefined); setNotes(""); }}
                disabled={publishing}
                className="h-9 rounded-xl px-5 text-[13px] font-medium"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {isFirstPublish ? "Publish" : `Publish v${nextVersion}`}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublishDialog;