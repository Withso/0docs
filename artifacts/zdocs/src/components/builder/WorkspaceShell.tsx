import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, ChevronsUpDown, FileText, Inbox, Plus, Search } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import { listWorkspaceProjects, type WorkspaceProject } from "@/app/api/projects";
import { useToast } from "@/hooks/use-toast";

import type { BuilderMode } from "./BuilderHeader";
import ProjectRail from "./ProjectRail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WorkspaceShellProps {
  project: WorkspaceProject;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  hasUnpublishedChanges?: boolean;
  children: ReactNode;
}

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const SWITCHER_SEARCH_THRESHOLD = 6;

const WorkspaceShell = ({ project, mode, onModeChange, hasUnpublishedChanges, children }: WorkspaceShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const api = useApi();
  const { toast } = useToast();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    listWorkspaceProjects()
      .then((rows) => setProjects(rows.filter((p) => !p.isHomepage)))
      .catch(() => setProjects([]));
  }, [user?.id]);

  // Reset the search field whenever the dropdown closes so the next open
  // starts clean instead of with a stale filter.
  useEffect(() => {
    if (!switcherOpen) setQuery("");
  }, [switcherOpen]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const showSearch = projects.length >= SWITCHER_SEARCH_THRESHOLD;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await api.post<WorkspaceProject>("/projects", {
        name,
        slug: slugify(name) || "project",
        description: newDesc,
      });
      setProjects((prev) => [created, ...prev]);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      navigate(`/builder/${created.id}`);
    } catch (e: any) {
      toast({
        title: "Couldn't create project",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const hideTopHeader = ["editor", "code", "preview", "configurations", "publish", "settings"].includes(mode);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <aside className="w-[224px] shrink-0 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border flex flex-col min-h-0">
        <div className="h-[48px] px-2 flex items-center border-b border-sidebar-border/50">
          <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
            <DropdownMenuTrigger asChild>
              <button className="w-full h-8 rounded-md flex items-center gap-2 px-2 text-left hover:bg-sidebar-accent transition-colors">
                <div className="h-5.5 w-5.5 rounded bg-sidebar-accent flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5 text-sidebar-accent-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate">{project.name}</p>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-1.5">
              {showSearch && (
                <div className="px-1.5 pb-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
                    <Input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search projects..."
                      className="pl-7 h-8 text-[12.5px] rounded-md"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
              <div className="max-h-[260px] overflow-y-auto">
                {filteredProjects.length === 0 ? (
                  <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                    {projects.length === 0 ? "No projects yet" : "No matches"}
                  </div>
                ) : (
                  filteredProjects.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => navigate(`/builder/${item.id}`)}
                      className="gap-2"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate flex-1">{item.name}</span>
                      {item.id === project.id && <Check className="h-3.5 w-3.5" />}
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setSwitcherOpen(false);
                  setCreateOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-3.5 w-3.5" /> New project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ProjectRail mode={mode} onModeChange={onModeChange} hasUnpublishedChanges={hasUnpublishedChanges} />
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {!hideTopHeader && (
          <header className="h-[48px] shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl px-3 flex items-center justify-between">
            <div className="min-w-0">
              {mode === "settings" ? (() => {
                const match = location.pathname.match(/\/settings\/([^/?#]+)/);
                const section = match?.[1] || "general";
                const label = section.replace(/-/g, " ");
                return (
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <span className="text-muted-foreground">Settings</span>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="text-foreground font-medium capitalize">{label}</span>
                  </div>
                );
              })() : (
                <>
                  <p className="text-[13px] font-medium text-foreground truncate">{project.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{project.slug}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Inbox" aria-label="Inbox">
                <Inbox className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Search" aria-label="Search">
                <Search className="h-4 w-4" />
              </button>
              <ProfileMenu projectId={project.id} />
            </div>
          </header>
        )}
        <div className="flex-1 min-h-0 min-w-0 flex">{children}</div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Create new project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-3">
            <div>
              <label className="text-[13px] font-medium text-foreground mb-1.5 block">Project name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My documentation"
                className="h-11 rounded-lg"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-foreground mb-1.5 block">Description</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="A brief description..."
                className="h-11 rounded-lg"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="w-full h-11 rounded-lg"
            >
              {creating ? "Creating..." : "Create project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspaceShell;
