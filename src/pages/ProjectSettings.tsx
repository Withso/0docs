import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Save, FileText, Globe, Trash2, ExternalLink,
  Copy, Check, Settings, BarChart3, Palette, Tag,
} from "lucide-react";

const ProjectSettings = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();
      if (!data) { navigate("/dashboard"); return; }
      setProject(data);
      setName(data.name);
      setDescription(data.description || "");
      setSlug(data.slug);
      setLoading(false);
    };
    load();
  }, [projectId, user]);

  const handleSave = async () => {
    if (!projectId || !name.trim()) return;
    setSaving(true);
    const newSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
    const { error } = await supabase
      .from("projects")
      .update({ name: name.trim(), description, slug: newSlug, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSlug(newSlug);
      toast({ title: "Project settings saved" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!projectId) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Project deleted" });
      navigate("/dashboard");
    }
  };

  const docsUrl = `${window.location.origin}/docs/${slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(docsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="platform-header">
        <div className="h-full max-w-3xl mx-auto px-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/builder/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{project?.name}</span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-sm text-muted-foreground">Settings</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Project Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your documentation project</p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <button onClick={() => navigate(`/builder/${projectId}/design`)} className="platform-card flex items-center gap-3 text-left">
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Palette className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Design</div>
              <div className="text-[11px] text-muted-foreground">Customize appearance</div>
            </div>
          </button>
          <button onClick={() => navigate(`/builder/${projectId}/analytics`)} className="platform-card flex items-center gap-3 text-left">
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Analytics</div>
              <div className="text-[11px] text-muted-foreground">Views & feedback</div>
            </div>
          </button>
          <button onClick={() => window.open(docsUrl, "_blank")} className="platform-card flex items-center gap-3 text-left">
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">View Docs</div>
              <div className="text-[11px] text-muted-foreground">Open public site</div>
            </div>
          </button>
        </div>

        {/* General settings */}
        <div className="platform-card mb-6">
          <h3 className="font-medium text-foreground mb-4">General</h3>
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Project Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Documentation" className="h-10" />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your documentation..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">URL Slug</Label>
              <div className="flex gap-2">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-docs"
                  className="h-10 font-mono text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                {docsUrl}
                <button onClick={copyUrl} className="hover:text-foreground transition-colors ml-1">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="platform-card border-destructive/30">
          <h3 className="font-medium text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this project and all its pages, sections, blocks, analytics, and feedback. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{project?.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all pages, sections, blocks, analytics data, and feedback for this project. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default ProjectSettings;
