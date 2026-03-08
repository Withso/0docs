import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, LogOut, ExternalLink, Trash2, BookOpen, Search,
  FileText, Settings, MoreHorizontal, FolderOpen, User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });

    if (!error && data) setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const slug = slugify(newName);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: newName, slug, description: newDesc, user_id: user!.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      await supabase.from("pages").insert({
        project_id: data.id,
        title: "Introduction",
        slug: "introduction",
        order_index: 0,
      });

      setDialogOpen(false);
      setNewName("");
      setNewDesc("");
      navigate(`/builder/${data.id}`);
    }
    setCreating(false);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (!error) setProjects((p) => p.filter((proj) => proj.id !== id));
  };

  const seedDemo = async () => {
    const { data, error } = await supabase.functions.invoke("seed-demo-project", {
      body: { user_id: user!.id },
    });
    if (error) {
      toast({ title: "Error", description: "Failed to create demo project", variant: "destructive" });
    } else {
      toast({ title: "Demo project created!" });
      fetchProjects();
    }
  };

  const hasDemoProject = projects.some((p) => p.slug === "agentation-docs-demo");
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userInitial = user?.user_metadata?.display_name?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || "U";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-[var(--platform-sidebar-width)] border-r bg-background hidden md:flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-12 flex items-center gap-2.5 px-5 border-b">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">DocBuilder</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <div className="platform-nav-item active">
            <FolderOpen className="h-4 w-4" />
            <span>Projects</span>
          </div>
          <div
            className="platform-nav-item"
            onClick={() => navigate("/settings/profile")}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                <div className="h-7 w-7 platform-avatar text-[11px]">
                  {userInitial}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.user_metadata?.display_name || "User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
                <User className="h-4 w-4 mr-2" /> Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="platform-header">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-2">
              <FileText className="h-4 w-4 text-foreground" />
              <span className="font-semibold text-sm text-foreground">DocBuilder</span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="platform-label">Projects</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs text-muted-foreground">{projects.length} total</span>
            </div>

            <div className="flex items-center gap-2">
              {!hasDemoProject && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={seedDemo}>
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Demo
                </Button>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Create New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Project Name</label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="My Documentation"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                      <Input
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="A brief description..."
                        className="h-10"
                      />
                    </div>
                    <Button onClick={createProject} disabled={creating || !newName.trim()} className="w-full h-10">
                      {creating ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Mobile user menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 platform-avatar text-[11px]">
                      {userInitial}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
                      <Settings className="h-4 w-4 mr-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-10 h-10 max-w-sm"
              />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
                <span className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                Loading projects...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="platform-card text-center py-16">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  {searchQuery ? "No projects found" : "No projects yet"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first documentation project to get started."}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/builder/${project.id}`)}
                    className="platform-card cursor-pointer group animate-fade-in"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/docs/${project.slug}`, "_blank"); }}>
                            <ExternalLink className="h-4 w-4 mr-2" /> View Docs
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => deleteProject(project.id, e as any)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-medium text-foreground text-sm mb-1">{project.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {project.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
