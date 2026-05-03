import { useState } from "react";
import { GitBranch, Plus, Check, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { useBranchContext } from "@/contexts/BranchContext";
import { toast } from "@/hooks/use-toast";

const BRANCH_NAME_RE = /^[a-zA-Z0-9._/-]+$/;

const BranchSwitcher = () => {
  const {
    branches, activeBranch, activeBranchId, setActiveBranchId,
    createBranch, renameBranch, deleteBranch, loading,
  } = useBranchContext();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [sourceId, setSourceId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  if (loading || !activeBranch) {
    // Until branches load, show a skeleton-ish placeholder so the header
    // doesn't shift around when we hydrate.
    return (
      <div className="h-7 px-2 flex items-center gap-1.5 rounded-lg bg-muted/60 border border-border/40 text-[12px] text-muted-foreground">
        <GitBranch className="h-3.5 w-3.5" />
        <span className="truncate max-w-[100px]">…</span>
      </div>
    );
  }

  const handleCreate = async () => {
    const name = newName.trim();
    if (!BRANCH_NAME_RE.test(name)) {
      toast({ title: "Invalid name", description: "Use letters, numbers, '.', '_', '-', '/' only.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const src = sourceId || activeBranchId || undefined;
      const created = await createBranch(name, src);
      if (created) {
        setActiveBranchId(created.id);
        toast({ title: "Branch created", description: `Switched to ${created.name}` });
        setCreateOpen(false);
        setNewName("");
      }
    } catch (err) {
      toast({ title: "Couldn't create branch", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async () => {
    if (!activeBranch) return;
    const name = renameValue.trim();
    if (!BRANCH_NAME_RE.test(name)) {
      toast({ title: "Invalid name", variant: "destructive" });
      return;
    }
    try {
      await renameBranch(activeBranch.id, name);
      toast({ title: "Branch renamed" });
      setRenameOpen(false);
    } catch (err) {
      toast({ title: "Couldn't rename branch", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!activeBranch || activeBranch.isDefault) return;
    if (!confirm(`Delete branch "${activeBranch.name}"? This can't be undone from the UI.`)) return;
    try {
      await deleteBranch(activeBranch.id);
      const main = branches.find(b => b.isDefault);
      if (main) setActiveBranchId(main.id);
      toast({ title: "Branch deleted" });
    } catch (err) {
      toast({ title: "Couldn't delete branch", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title={`Active branch: ${activeBranch.name}`}
            className="h-7 px-2 flex items-center gap-1.5 rounded-lg bg-muted/60 border border-border/40 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <GitBranch className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[140px] text-foreground">{activeBranch.name}</span>
            {activeBranch.isDefault && (
              <span className="ml-0.5 rounded-sm px-1 py-px text-[9px] uppercase tracking-wide bg-background text-muted-foreground border border-border/60">
                default
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Switch branch
          </DropdownMenuLabel>
          {branches.map((b) => {
            const isActive = b.id === activeBranchId;
            return (
              <DropdownMenuItem
                key={b.id}
                onSelect={() => setActiveBranchId(b.id)}
                className="flex items-center gap-2"
              >
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{b.name}</span>
                {b.isDefault && (
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">main</span>
                )}
                {isActive && <Check className="h-3.5 w-3.5 text-foreground" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setSourceId(activeBranchId ?? ""); setNewName(""); setCreateOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            New branch
          </DropdownMenuItem>
          {activeBranch && !activeBranch.isDefault && (
            <>
              <DropdownMenuItem onSelect={() => { setRenameValue(activeBranch.name); setRenameOpen(true); }}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Rename "{activeBranch.name}"
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete "{activeBranch.name}"
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create branch dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a branch</DialogTitle>
            <DialogDescription>
              Branch off any existing branch to draft changes without touching the published docs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input
                id="branch-name"
                placeholder="e.g. draft/api-redesign"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Letters, numbers, '.', '_', '-', '/' only.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch-source">Branch from</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger id="branch-source">
                  <SelectValue placeholder="Select a source branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}{b.isDefault ? "  (main)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating…" : "Create branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rename-input">New name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BranchSwitcher;
