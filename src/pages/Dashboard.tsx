import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LogOut, ExternalLink, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
      // Create a default "Introduction" page
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground">DocBuilder</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">Your documentation projects</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Project Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My Documentation"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="A brief description..."
                  />
                </div>
                <Button onClick={createProject} disabled={creating || !newName.trim()} className="w-full">
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">No projects yet. Create your first documentation project.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/builder/${project.id}`)}
                className="border rounded-lg p-5 hover:border-foreground/20 transition-colors cursor-pointer group relative"
              >
                <h3 className="font-medium text-foreground mb-1">{project.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description || "No description"}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                  <a
                    href={`/docs/${project.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
