import { useEffect, useState, useCallback } from "react";
import { GitBranch, Plus, Check, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchGitHubBranches } from "@/app/api/github-branches";

interface Props {
  projectId: string;
  currentBranch: string;
  hasGithub: boolean;
  onBranchChange: (branch: string) => void;
}

/** Header dropdown for switching/creating GitHub branches. */
const BranchSelector = ({ projectId, currentBranch, hasGithub, onBranchChange }: Props) => {
  const { toast } = useToast();
  const [branches, setBranches] = useState<string[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!hasGithub) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("github-branches", {
        body: { projectId },
        method: "GET" as any,
      });
      // supabase functions.invoke uses POST; use a manual GET via fetch:
      if (error || !data) throw new Error(error?.message || "Failed");
      setBranches(data.branches || []);
      setDefaultBranch(data.default || "main");
    } catch (_e) {
      // Fallback: GET via direct fetch
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const j = await fetchGitHubBranches(projectId, session?.access_token);
        setBranches(j.branches || []);
        setDefaultBranch(j.default || "main");
      } catch (err: any) {
        toast({ title: "Could not load branches", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, hasGithub, toast]);

  useEffect(() => {
    if (open && hasGithub && branches.length === 0) loadBranches();
  }, [open, hasGithub, branches.length, loadBranches]);

  const handleSwitch = async (branch: string) => {
    await supabase.from("projects").update({ github_branch: branch }).eq("id", projectId);
    onBranchChange(branch);
    setOpen(false);
    toast({ title: `Switched to ${branch}` });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("github-branches", {
        body: { projectId, name: newName.trim(), from: defaultBranch },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      await loadBranches();
      await handleSwitch(newName.trim());
      setNewName("");
      setShowCreate(false);
    } catch (e: any) {
      toast({ title: "Failed to create branch", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (!hasGithub) {
    return (
      <button
        disabled
        className="h-8 rounded-lg px-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/60 cursor-not-allowed"
        title="Connect GitHub in Settings to use branches"
      >
        <GitBranch className="h-3.5 w-3.5" />
        <span>main</span>
      </button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 rounded-lg px-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          title="Switch branch"
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span className="max-w-[120px] truncate">{currentBranch}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Branches
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && (
          <div className="px-2 py-3 text-[12px] text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        )}
        {!loading && branches.length === 0 && (
          <div className="px-2 py-3 text-[12px] text-muted-foreground">No branches found</div>
        )}
        {!loading && branches.map((b) => (
          <DropdownMenuItem
            key={b}
            onClick={() => handleSwitch(b)}
            className="text-[12px] flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <GitBranch className="h-3 w-3" />
              {b}
              {b === defaultBranch && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">default</span>
              )}
            </span>
            {b === currentBranch && <Check className="h-3 w-3" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {!showCreate ? (
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setShowCreate(true); }}
            className="text-[12px] text-primary"
          >
            <Plus className="h-3 w-3 mr-2" /> Create new branch
          </DropdownMenuItem>
        ) : (
          <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`new-branch (from ${defaultBranch})`}
              className="h-8 text-[12px]"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="h-7 text-[11px] flex-1"
              >
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="h-7 text-[11px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BranchSelector;
