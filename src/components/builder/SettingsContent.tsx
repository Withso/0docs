import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ProfileSettingsContent from "./ProfileSettingsContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Save, Trash2, GitBranch, Github, Loader2, CheckCircle2, XCircle, Eye, EyeOff,
  Settings2, AlertTriangle, UserCircle, Inbox, Search,
} from "lucide-react";
import ProfileMenu from "./ProfileMenu";

interface SettingsContentProps {
  projectId: string;
  project: any;
  onSaved?: () => void;
}

type SectionId = "general" | "github" | "profile" | "delete-account";

const NAV_GROUPS: { label: string; items: { id: SectionId; label: string; icon: any }[] }[] = [
  {
    label: "Project Settings",
    items: [
      { id: "general", label: "General", icon: Settings2 },
      { id: "github", label: "GitHub", icon: Github },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "profile", label: "My Profile", icon: UserCircle },
      { id: "delete-account", label: "Delete Account", icon: AlertTriangle },
    ],
  },
];

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
  general: { title: "General", subtitle: "Basic information about your project" },
  github: { title: "GitHub Integration", subtitle: "Connect a repository to publish documentation" },
  profile: { title: "My Profile", subtitle: "Manage your personal account and preferences" },
  "delete-account": { title: "Delete Account", subtitle: "Permanently delete your organization and account" },
};

const VALID_SECTIONS: SectionId[] = ["general", "github", "profile", "delete-account"];

const SettingsContent = ({ projectId, project, onSaved }: SettingsContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const params = useParams<{ section?: string }>();

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [saving, setSaving] = useState(false);

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

  const activeSection: SectionId = (VALID_SECTIONS.includes(params.section as SectionId)
    ? (params.section as SectionId)
    : "general");

  const setActiveSection = (id: SectionId) => {
    navigate(`/builder/${projectId}/settings/${id}`, { replace: true });
  };

  // Redirect bare /settings to /settings/general
  useEffect(() => {
    if (!params.section) {
      navigate(`/builder/${projectId}/settings/general`, { replace: true });
    }
  }, [params.section, projectId, navigate]);

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
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Project settings saved" });
      onSaved?.();
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
        headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" },
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

  const handleDeleteProject = async () => {
    if (!projectId) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Project deleted" });
      navigate("/dashboard");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // Delete all projects owned by user (cascades to their data)
      const { error: projErr } = await supabase.from("projects").delete().eq("user_id", user.id);
      if (projErr) throw projErr;
      // Delete profile
      await supabase.from("profiles").delete().eq("id", user.id);
      toast({ title: "Account data deleted", description: "Signing you out..." });
      await signOut();
      navigate("/");
    } catch (e: any) {
      toast({ title: "Error deleting account", description: e.message, variant: "destructive" });
    }
  };

  const meta = SECTION_TITLES[activeSection];

  return (
    <div className="flex-1 flex min-h-0 animate-fade-in">
      {/* Sidebar nav (Mintlify-style) */}
      <aside className="w-[240px] shrink-0 border-r border-border/40 bg-muted/20 px-3 py-6 overflow-y-auto">

        <nav className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const isActive = activeSection === id;
                  const isDanger = id === "delete-account";
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveSection(id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                        isActive
                          ? isDanger
                            ? "bg-destructive/10 text-destructive font-medium"
                            : "bg-accent text-foreground font-medium"
                          : isDanger
                          ? "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main column with its own header */}
      <div className="flex-1 min-w-0 flex flex-col">
        <SettingsTopHeader activeSection={activeSection} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10">
          <div className="mb-8 pb-6 border-b border-border/40">
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight">{meta.title}</h1>
            <p className="text-[13px] text-muted-foreground mt-1">{meta.subtitle}</p>
          </div>

          {activeSection === "general" && (
            <div className="space-y-6">
              <Field label="Project Name" hint="The display name for your documentation project">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Documentation" className="h-10 rounded-lg" />
              </Field>
              <Field label="Description" hint="A short summary shown to your team">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your documentation..."
                  rows={3}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[13px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </Field>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="h-9 rounded-lg">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>

              {/* Delete Project (moved here) */}
              <div className="pt-8 mt-4 border-t border-border/40">
                <div className="rounded-xl p-6 border border-destructive/30 bg-destructive/5">
                  <h3 className="font-semibold text-destructive text-[15px] mb-1">Delete Project</h3>
                  <p className="text-[13px] text-muted-foreground mb-5">
                    Permanently delete this project and all its pages, sections, blocks, and feedback. This action cannot be undone.
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
                        <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Project
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}

          {activeSection === "github" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-[12px] text-muted-foreground">
                {connectionStatus === "success" ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Connected to {githubRepo}</>
                ) : connectionStatus === "error" ? (
                  <><XCircle className="h-3.5 w-3.5 text-destructive" /> Connection failed</>
                ) : (
                  <><Github className="h-3.5 w-3.5" /> Push your docs as MDX commits to a GitHub repo.</>
                )}
              </div>

              <Field label="Repository" hint={<>Format: <code className="px-1 py-0.5 bg-muted rounded text-[10px]">owner/repository</code></>}>
                <Input
                  value={githubRepo}
                  onChange={(e) => { setGithubRepo(e.target.value); setConnectionStatus("idle"); }}
                  placeholder="owner/repo-name"
                  className="h-10 font-mono text-[13px] rounded-lg"
                />
              </Field>

              <Field label={<span className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Default Branch</span>}>
                <Input
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className="h-10 font-mono text-[13px] rounded-lg"
                />
              </Field>

              <Field
                label="Personal Access Token"
                hint={<>Needs <code className="px-1 py-0.5 bg-muted rounded text-[10px]">repo</code> scope. Create one at{" "}
                  <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub Settings → Tokens</a>
                </>}
              >
                <div className="relative">
                  <Input
                    value={githubToken}
                    onChange={(e) => { setGithubToken(e.target.value); setConnectionStatus("idle"); }}
                    type={showToken ? "text" : "password"}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="h-10 font-mono text-[13px] rounded-lg pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline" size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !githubRepo || !githubToken}
                  className="h-9 rounded-lg"
                >
                  {testingConnection ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Github className="h-3.5 w-3.5 mr-1.5" />}
                  Test Connection
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="h-9 rounded-lg">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {activeSection === "profile" && <ProfileSettingsContent />}

          {activeSection === "delete-account" && (
            <div className="rounded-xl p-6 border border-destructive/30 bg-destructive/5">
              <h3 className="font-semibold text-destructive text-[15px] mb-1">Delete Account</h3>
              <p className="text-[13px] text-muted-foreground mb-5">
                Permanently delete your organization including <strong>all projects</strong>, pages,
                sections, blocks, and personal data. You will be signed out immediately.
                This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-9 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete every project you own and all associated data.
                      You will be signed out. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
};

// Header rendered ONLY in the main content column (right of the settings sidebar).
// Mirrors the workspace top header but scoped here so the settings sidebar reaches full height.
const SettingsTopHeader = ({ activeSection, projectId }: { activeSection: SectionId; projectId?: string }) => {
  const label = activeSection.replace(/-/g, " ");
  return (
    <header className="h-[48px] shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl px-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[13px] min-w-0">
        <span className="text-muted-foreground">Settings</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground font-medium capitalize truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Inbox" aria-label="Inbox">
          <Inbox className="h-4 w-4" />
        </button>
        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Search" aria-label="Search">
          <Search className="h-4 w-4" />
        </button>
        <ProfileMenu projectId={projectId} />
      </div>
    </header>
  );
};

const Field = ({
  label, hint, children,
}: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <Label className="text-[13px] font-medium text-foreground mb-1.5 block">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
  </div>
);

export default SettingsContent;
