import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
  isHomepage?: boolean;
}

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Authenticated entry for /builder. Resolves to the user's most-recently-
 * updated project. If they have none, we render a minimal builder shell —
 * the same left side-column users will see post-create — with an empty
 * state and a "New project" dialog. This keeps project creation/switching
 * scoped to the WorkspaceShell side-column per Task #9 spec.
 */
const BuilderEntry = () => {
  const { user } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasNoProjects, setHasNoProjects] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const projects = await api.get<Project[]>("/projects");
        if (cancelled) return;
        const visible = (projects || []).filter((p) => !p.isHomepage);
        if (visible.length === 0) {
          setHasNoProjects(true);
          setLoading(false);
          return;
        }
        navigate(`/builder/${visible[0].id}`, { replace: true });
      } catch {
        if (cancelled) return;
        setHasNoProjects(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const createProject = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await api.post<Project>("/projects", {
        name,
        slug: slugify(name) || "project",
        description: newDesc,
      });
      navigate(`/builder/${created.id}`, { replace: true });
    } catch (e: any) {
      toast({
        title: "Couldn't create project",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasNoProjects) return null;

  // Minimal shell that mirrors WorkspaceShell's left side-column so the
  // empty-state lives inside the same chrome users will see once they
  // have a project.
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <aside className="w-[224px] shrink-0 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border flex flex-col min-h-0">
        <div className="h-[48px] px-2 flex items-center border-b border-sidebar-border/50">
          <div className="w-full h-8 rounded-md flex items-center gap-2 px-2">
            <div className="h-5.5 w-5.5 rounded bg-sidebar-accent flex items-center justify-center shrink-0">
              <FileText className="h-3.5 w-3.5 text-sidebar-accent-foreground" />
            </div>
            <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate">
              No project
            </p>
          </div>
        </div>
        <div className="flex-1 px-2 py-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full h-8 rounded-md flex items-center gap-2 px-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <Plus className="h-3.5 w-3.5" /> New project
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle className="text-lg">Create new project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-3">
                <div>
                  <label className="text-[13px] font-medium text-foreground mb-1.5 block">
                    Project name
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My documentation"
                    className="h-11 rounded-lg"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && createProject()}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-foreground mb-1.5 block">
                    Description
                  </label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="A brief description..."
                    className="h-11 rounded-lg"
                  />
                </div>
                <Button
                  onClick={createProject}
                  disabled={creating || !newName.trim()}
                  className="w-full h-11 rounded-lg"
                >
                  {creating ? "Creating..." : "Create project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="h-14 w-14 rounded-2xl bg-accent/60 flex items-center justify-center mx-auto mb-5">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground mb-1.5">
            Create your first project
          </h1>
          <p className="text-[13px] text-muted-foreground mb-6">
            Spin up a documentation site to get started.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" /> New project
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuilderEntry;
