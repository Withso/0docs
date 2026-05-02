import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Star, Trash2, Tag, GitBranch, Check, Copy } from "lucide-react";
import type { DocVersion } from "@/hooks/use-versions";
import { useToast } from "@/hooks/use-toast";

interface VersionManagerProps {
  /** Project id is only used for label/empty-state copy. */
  projectId: string;
  /** Versions list — must come from the SAME `useVersions` instance the parent consumes,
   *  otherwise creating/cloning/deleting won't reflect in the switcher (single source of truth). */
  versions: DocVersion[];
  addVersion: (label: string) => Promise<DocVersion | null>;
  cloneVersion: (sourceId: string, label: string) => Promise<DocVersion | null>;
  setDefault: (id: string) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
}

const VersionManager = ({
  projectId: _projectId,
  versions,
  addVersion,
  cloneVersion,
  setDefault,
  deleteVersion,
}: VersionManagerProps) => {
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState("");
  const [cloneFromId, setCloneFromId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const errorMessage = (e: unknown): string =>
    e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.";

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label || adding) return;
    setAdding(true);
    try {
      if (cloneFromId) {
        await cloneVersion(cloneFromId, label);
        toast({ title: `Created ${label}`, description: "Pages copied from source version." });
      } else {
        await addVersion(label);
      }
      setNewLabel("");
      setCloneFromId("");
    } catch (e) {
      toast({ title: "Could not add version", description: errorMessage(e), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await setDefault(id);
    } catch (e) {
      toast({ title: "Could not set default", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await deleteVersion(id);
    } catch (e) {
      toast({ title: "Could not delete version", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1.5">
          <GitBranch className="h-3.5 w-3.5" /> Versions
          {versions.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-muted text-[10px] font-mono text-muted-foreground">
              {versions.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <GitBranch className="h-4 w-4 text-primary" />
            Documentation Versions
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Branch your docs into named versions like <span className="font-mono text-foreground">v2.0</span>,{" "}
            <span className="font-mono text-foreground">latest</span>, or <span className="font-mono text-foreground">beta</span>. Readers will see a switcher in the published site.
          </DialogDescription>
        </DialogHeader>

        {/* Versions list */}
        <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
          {versions.length === 0 ? (
            <div className="rounded-xl border border-dashed py-8 flex flex-col items-center justify-center text-center">
              <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[12.5px] font-medium text-foreground">No versions yet</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[280px]">
                Create your first version below to enable version switching for your readers.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden divide-y">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${
                        v.is_default ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-foreground font-mono truncate">
                          {v.version_label}
                        </span>
                        {v.is_default && (
                          <span className="text-[9.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary inline-flex items-center gap-0.5">
                            <Check className="h-2.5 w-2.5" />
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {!v.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => { void handleSetDefault(v.id); }}
                        disabled={busyId === v.id}
                        title="Set as default"
                        aria-label={`Set ${v.version_label} as default`}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { void handleDelete(v.id); }}
                      disabled={busyId === v.id}
                      title="Delete version"
                      aria-label={`Delete ${v.version_label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add row */}
        <div className="px-5 py-4 border-t bg-muted/20 space-y-2.5">
          <div>
            <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
              New version label
            </label>
            <div className="flex gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. v2.0, latest, beta"
                className="h-9 text-[13px] font-mono rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <Button
                size="sm"
                className="h-9 rounded-lg shrink-0"
                onClick={handleAdd}
                disabled={!newLabel.trim() || adding}
              >
                {cloneFromId ? <Copy className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {adding ? (cloneFromId ? "Cloning…" : "Adding…") : (cloneFromId ? "Clone" : "Add")}
              </Button>
            </div>
          </div>

          {versions.length > 0 && (
            <div>
              <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
                Copy pages from <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span>
              </label>
              <Select value={cloneFromId || "_none"} onValueChange={(v) => setCloneFromId(v === "_none" ? "" : v)}>
                <SelectTrigger className="h-9 text-[12.5px] rounded-lg">
                  <SelectValue placeholder="Start empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" className="text-[12.5px]">Start empty</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-[12.5px] font-mono">
                      {v.version_label}{v.is_default ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-[10.5px] text-muted-foreground">
            Tip: cloning copies every page, section, and block from the source version into the new one — perfect for branching off a release.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VersionManager;
