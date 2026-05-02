import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, ExternalLink, Trash2, BookOpen, Search,
  FileText, Settings, MoreHorizontal, FolderOpen, Clock, Home, Copy,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isHomepage?: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>("/projects");
      setProjects(data || []);
    } catch (e) {
      console.error("Failed to fetch projects", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const slug = slugify(newName);
      const data = await api.post<Project>("/projects", { name: newName, slug, description: newDesc });
      setDialogOpen(false);
      setNewName("");
      setNewDesc("");
      navigate(`/builder/${data.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const deleteProject = async (id: string) => {
    try {
      await api.del(`/projects/${id}`);
      setProjects((p) => p.filter((proj) => proj.id !== id));
      toast({ title: "Project deleted" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const duplicateProject = async (project: Project) => {
    setDuplicating(project.id);
    try {
      await api.post(`/projects/${project.id}/duplicate`, {});
      toast({ title: "Project duplicated!" });
      fetchProjects();
    } catch (e) {
      toast({ title: "Error", description: "Failed to duplicate project", variant: "destructive" });
    }
    setDuplicating(null);
  };

  const seedDemo = async () => {
    try {
      const p = await api.post<Project>("/projects", {
        name: "Agentation Docs Demo",
        slug: "agentation-docs-demo",
        description: "A sample documentation project to explore features",
      });
      toast({ title: "Demo project created!" });
      fetchProjects();
    } catch (e) {
      toast({ title: "Error", description: "Failed to create demo project", variant: "destructive" });
    }
  };

  const hasDemoProject = projects.some((p) => p.slug === "agentation-docs-demo");
  const visibleProjects = projects.filter((p) => !p.isHomepage);
  const filteredProjects = visibleProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userInitial = user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-[14px] font-medium text-foreground shrink-0">Projects</h1>
          <span className="text-[11px] text-muted-foreground bg-accent/60 px-1.5 py-0.5 rounded-md shrink-0">{visibleProjects.length}</span>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 h-9 rounded-lg text-[13px] bg-accent/40 border-transparent focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring/30"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {!hasDemoProject && (
              <Button variant="ghost" size="sm" className="h-9 text-[13px] rounded-lg" onClick={seedDemo}>
                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Demo
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 text-[13px] rounded-lg">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle className="text-lg">Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-3">
                  <div>
                    <label className="text-[13px] font-medium text-foreground mb-1.5 block">Project Name</label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="My Documentation"
                      className="h-11 rounded-lg"
                      onKeyDown={(e) => e.key === "Enter" && createProject()}
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
                  <Button onClick={createProject} disabled={creating || !newName.trim()} className="w-full h-11 rounded-lg">
                    {creating ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-[13px] text-muted-foreground">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="platform-card text-center py-20 animate-fade-in">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <FolderOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-[15px] mb-1.5">
              {searchQuery ? "No projects found" : "No projects yet"}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-6 max-w-sm mx-auto">
              {searchQuery ? "Try a different search term" : "Create your first documentation project to get started."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setDialogOpen(true)} className="rounded-lg">
                <Plus className="h-4 w-4 mr-2" /> New Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, i) => (
              <div
                key={project.id}
                onClick={() => navigate(`/builder/${project.id}`)}
                className="platform-card cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-accent/60 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/docs/${project.slug}`, "_blank"); }}>
                        <ExternalLink className="h-4 w-4 mr-2" /> View Docs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/builder/${project.id}/settings`); }}>
                        <Settings className="h-4 w-4 mr-2" /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); duplicateProject(project); }}
                        disabled={duplicating === project.id}
                      >
                        <Copy className="h-4 w-4 mr-2" /> {duplicating === project.id ? "Duplicating..." : "Duplicate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-[14px] mb-1">{project.name}</h3>
                  {project.isHomepage && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary mb-1">
                      <Home className="h-2.5 w-2.5" /> Homepage
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground line-clamp-2 mb-4">
                  {project.description || "No description"}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(project.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all pages, content, analytics, and feedback. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteProject(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Dashboard;
