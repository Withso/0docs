import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Save, Globe, Trash2, Copy, Check } from "lucide-react";

interface SettingsContentProps {
  projectId: string;
  project: any;
}

const SettingsContent = ({ projectId, project }: SettingsContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [slug, setSlug] = useState(project?.slug || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setSlug(project.slug);
    }
  }, [project]);

  const handleSave = async () => {
    if (!projectId || !name.trim()) return;
    setSaving(true);
    const newSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
    const { error } = await supabase
      .from("projects")
      .update({ name: name.trim(), description, slug: newSlug, updated_at: new Date().toISOString() } as any)
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

    navigator.clipboard.writeText(docsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Project Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1.5">Manage your documentation project</p>
      </div>

      {/* General settings */}
      <div className="platform-card mb-6 p-6">
        <h3 className="font-semibold text-foreground text-[15px] mb-5">General</h3>
        <div className="space-y-5">
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Documentation" className="h-11 rounded-lg" />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your documentation..."
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[13px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">URL Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-docs"
              className="h-11 font-mono text-[13px] rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <Globe className="h-3 w-3" />
              {docsUrl}
              <button onClick={copyUrl} className="hover:text-foreground transition-colors ml-1">
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="h-9 rounded-lg">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>


      {/* Danger zone */}
      <div className="platform-card p-6 border-destructive/20">
        <h3 className="font-semibold text-destructive text-[15px] mb-2">Danger Zone</h3>
        <p className="text-[13px] text-muted-foreground mb-5">
          Permanently delete this project and all its data. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="h-9 rounded-lg">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Project
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{project?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all pages, sections, blocks, analytics data, and feedback. This action cannot be undone.
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
  );
};

export default SettingsContent;