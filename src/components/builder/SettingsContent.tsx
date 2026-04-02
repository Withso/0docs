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
import { Save, Trash2, GitBranch, Github, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

interface SettingsContentProps {
  projectId: string;
  project: any;
  onSaved?: () => void;
}

const SettingsContent = ({ projectId, project }: SettingsContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [saving, setSaving] = useState(false);

  // GitHub settings
  const [githubRepo, setGithubRepo] = useState(project?.github_repo || "");
  const [githubBranch, setGithubBranch] = useState(project?.github_branch || "main");
  const [githubToken, setGithubToken] = useState(project?.github_token_encrypted || "");
  const [showToken, setShowToken] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setGithubRepo(project.github_repo || "");
      setGithubBranch(project.github_branch || "main");
      setGithubToken(project.github_token_encrypted || "");
    }
  }, [project]);

  const handleSave = async () => {
    if (!projectId || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({
        name: name.trim(),
        description,
        github_repo: githubRepo.trim() || null,
        github_branch: githubBranch.trim() || "main",
        github_token_encrypted: githubToken.trim() || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", projectId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Project settings saved" });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!githubRepo || !githubToken) {
      toast({ title: "Missing fields", description: "Enter repo and token first.", variant: "destructive" });
      return;
    }
    setTestingConnection(true);
    setConnectionStatus("idle");
    try {
      const [owner, repo] = githubRepo.split("/");
      if (!owner || !repo) throw new Error("Invalid format");
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (res.ok) {
        setConnectionStatus("success");
        toast({ title: "Connection successful", description: `Connected to ${githubRepo}` });
      } else {
        setConnectionStatus("error");
        const body = await res.json();
        toast({ title: "Connection failed", description: body.message || `HTTP ${res.status}`, variant: "destructive" });
      }
    } catch (e: any) {
      setConnectionStatus("error");
      toast({ title: "Connection failed", description: e.message, variant: "destructive" });
    }
    setTestingConnection(false);
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
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="platform-card mb-6 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Github className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground text-[15px]">GitHub Integration</h3>
          {connectionStatus === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {connectionStatus === "error" && <XCircle className="h-4 w-4 text-destructive" />}
        </div>
        <p className="text-[12px] text-muted-foreground mb-5">
          Connect a GitHub repository to publish your documentation as MDX files. Your docs will be pushed as commits.
        </p>
        <div className="space-y-5">
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Repository</Label>
            <Input
              value={githubRepo}
              onChange={(e) => { setGithubRepo(e.target.value); setConnectionStatus("idle"); }}
              placeholder="owner/repo-name"
              className="h-11 font-mono text-[13px] rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Format: <code className="px-1 py-0.5 bg-muted rounded text-[10px]">owner/repository</code>
            </p>
          </div>
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                Default Branch
              </span>
            </Label>
            <Input
              value={githubBranch}
              onChange={(e) => setGithubBranch(e.target.value)}
              placeholder="main"
              className="h-11 font-mono text-[13px] rounded-lg"
            />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Personal Access Token</Label>
            <div className="relative">
              <Input
                value={githubToken}
                onChange={(e) => { setGithubToken(e.target.value); setConnectionStatus("idle"); }}
                type={showToken ? "text" : "password"}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="h-11 font-mono text-[13px] rounded-lg pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Needs <code className="px-1 py-0.5 bg-muted rounded text-[10px]">repo</code> scope. Create one at{" "}
              <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                GitHub Settings → Tokens
              </a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection || !githubRepo || !githubToken}
              className="h-9 rounded-lg"
            >
              {testingConnection ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Github className="h-3.5 w-3.5 mr-1.5" />}
              Test Connection
            </Button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end mb-6">
        <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="h-9 rounded-lg">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
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
                This will permanently delete all pages, sections, blocks, and feedback. This action cannot be undone.
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
