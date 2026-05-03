import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi, apiRequest } from "@/lib/api-client";
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
  Save, Trash2,
  Settings2, AlertTriangle, UserCircle, Inbox, Search,
  Globe, Copy, ExternalLink, CheckCircle2, AlertCircle, Loader2, Server,
} from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import MCPSettings from "./MCPSettings";

interface SettingsContentProps {
  projectId: string;
  project: any;
  onSaved?: () => void;
}

type SectionId = "general" | "domain" | "mcp" | "profile" | "delete-account";

const NAV_GROUPS: { label: string; items: { id: SectionId; label: string; icon: any }[] }[] = [
  {
    label: "Project Settings",
    items: [
      { id: "general", label: "General", icon: Settings2 },
      { id: "domain", label: "Domain", icon: Globe },
      { id: "mcp", label: "MCP Server", icon: Server },
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
  domain: { title: "Domain", subtitle: "Connect a custom domain to your published documentation" },
  mcp: { title: "MCP Server", subtitle: "Let AI agents read and edit your docs via the Model Context Protocol" },
  profile: { title: "My Profile", subtitle: "Manage your personal account and preferences" },
  "delete-account": { title: "Delete Account", subtitle: "Permanently delete your organization and account" },
};

const VALID_SECTIONS: SectionId[] = ["general", "domain", "mcp", "profile", "delete-account"];

// Linear-time domain validation — replaces a backtracking regex flagged by SAST
// as ReDoS-vulnerable. Validates each label individually (max 63 chars, no
// leading/trailing hyphen) and the TLD separately.
const MAX_DOMAIN_LEN = 253;
const DOMAIN_LABEL_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const DOMAIN_TLD_RE = /^[a-zA-Z]{2,63}$/;
function isValidDomainStr(s: string): boolean {
  if (!s || s.length > MAX_DOMAIN_LEN) return false;
  const labels = s.split(".");
  if (labels.length < 2) return false;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (i === labels.length - 1) {
      if (!DOMAIN_TLD_RE.test(label)) return false;
    } else if (!DOMAIN_LABEL_RE.test(label)) return false;
  }
  return true;
}

const SettingsContent = ({ projectId, project, onSaved }: SettingsContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const api = useApi();
  const params = useParams<{ section?: string }>();

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [saving, setSaving] = useState(false);

  // Custom domain state
  const initialDomain = project?.customDomain || project?.custom_domain || "";
  const initialBasePath: string = project?.customDomainBasePath ?? project?.custom_domain_base_path ?? "";
  const [domain, setDomain] = useState<string>(initialDomain);
  // Mintlify-style "Host at /docs" subpath toggle. When on, docs are served at
  // `${domain}${basePath}` instead of the apex; persisted as customDomainBasePath.
  const [basePathEnabled, setBasePathEnabled] = useState<boolean>(!!initialBasePath);
  const [basePath, setBasePath] = useState<string>(initialBasePath || "/docs");
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // Shared in-flight guard for both the manual "Verify Now" button and the
  // 30-second auto-poll, so the two never overlap and double-write status.
  const verifyInFlightRef = useRef(false);

  // Live domain status — refreshed via verify endpoint; polled while pending.
  type DomainStatus = "verified" | "pending" | "failed" | null;
  const [domainStatus, setDomainStatus] = useState<DomainStatus>(
    (project?.customDomainStatus ?? project?.custom_domain_status ?? null) as DomainStatus,
  );
  const [domainVerifiedAt, setDomainVerifiedAt] = useState<string | null>(
    project?.customDomainVerifiedAt ?? project?.custom_domain_verified_at ?? null,
  );
  const [domainLastError, setDomainLastError] = useState<string | null>(
    project?.customDomainLastError ?? project?.custom_domain_last_error ?? null,
  );
  const [domainLastCheckedAt, setDomainLastCheckedAt] = useState<string | null>(
    project?.customDomainLastCheckedAt ?? project?.custom_domain_last_checked_at ?? null,
  );

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setDomain(project.customDomain || project.custom_domain || "");
      const bp: string = project.customDomainBasePath ?? project.custom_domain_base_path ?? "";
      setBasePathEnabled(!!bp);
      setBasePath(bp || "/docs");
      setDomainStatus((project.customDomainStatus ?? project.custom_domain_status ?? null) as DomainStatus);
      setDomainVerifiedAt(project.customDomainVerifiedAt ?? project.custom_domain_verified_at ?? null);
      setDomainLastError(project.customDomainLastError ?? project.custom_domain_last_error ?? null);
      setDomainLastCheckedAt(project.customDomainLastCheckedAt ?? project.custom_domain_last_checked_at ?? null);
    }
  }, [project]);

  const activeSection: SectionId = (VALID_SECTIONS.includes(params.section as SectionId)
    ? (params.section as SectionId)
    : "general");

  const setActiveSection = (id: SectionId) => {
    navigate(`/builder/${projectId}/settings/${id}`, { replace: true });
  };

  // Redirect bare /settings to /settings/general, and legacy /settings/github too.
  useEffect(() => {
    if (!params.section || params.section === "github") {
      navigate(`/builder/${projectId}/settings/general`, { replace: true });
    }
  }, [params.section, projectId, navigate]);

  const handleSave = async () => {
    if (!projectId || !name.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/projects/${projectId}`, { name: name.trim(), description });
      toast({ title: "Project settings saved" });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await api.del(`/projects/${projectId}`);
      toast({ title: "Project deleted" });
      navigate("/builder");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await api.del(`/profiles/me`);
      toast({ title: "Account data deleted", description: "Signing you out..." });
      await signOut();
      navigate("/");
    } catch (e: any) {
      toast({ title: "Error deleting account", description: e.message, variant: "destructive" });
    }
  };

  // Domain validation + helpers
  const trimmedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const isValidDomain = !trimmedDomain || isValidDomainStr(trimmedDomain);
  const isApex = useMemo(() => {
    if (!trimmedDomain) return false;
    return trimmedDomain.split(".").length === 2;
  }, [trimmedDomain]);
  // Normalize the base path the same way the API will: leading slash, no trailing.
  const normalizedBasePath = useMemo(() => {
    if (!basePathEnabled) return "";
    const raw = basePath.trim();
    if (!raw || raw === "/") return "";
    return "/" + raw.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
  }, [basePath, basePathEnabled]);
  const isValidBasePath = !basePathEnabled || /^\/[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/i.test(normalizedBasePath);
  const domainChanged =
    trimmedDomain !== (initialDomain || "") || normalizedBasePath !== (initialBasePath || "");

  const applyProjectStatus = (p: any) => {
    setDomainStatus((p?.customDomainStatus ?? p?.custom_domain_status ?? null) as DomainStatus);
    setDomainVerifiedAt(p?.customDomainVerifiedAt ?? p?.custom_domain_verified_at ?? null);
    setDomainLastError(p?.customDomainLastError ?? p?.custom_domain_last_error ?? null);
    setDomainLastCheckedAt(p?.customDomainLastCheckedAt ?? p?.custom_domain_last_checked_at ?? null);
  };

  const handleSaveDomain = async () => {
    if (!projectId) return;
    if (trimmedDomain && !isValidDomainStr(trimmedDomain)) {
      toast({ title: "Invalid domain", description: "Enter a domain like docs.example.com (no protocol or path).", variant: "destructive" });
      return;
    }
    if (basePathEnabled && !isValidBasePath) {
      toast({ title: "Invalid base path", description: "Use a path like /docs (lowercase letters, numbers, hyphens).", variant: "destructive" });
      return;
    }
    setSavingDomain(true);
    try {
      const updated = await api.patch<any>(`/projects/${projectId}`, {
        customDomain: trimmedDomain || null,
        customDomainBasePath: trimmedDomain ? (normalizedBasePath || null) : null,
      });
      applyProjectStatus(updated);
      toast({
        title: trimmedDomain ? "Domain saved" : "Domain removed",
        description: trimmedDomain
          ? "DNS verification is pending — set up your records and click Verify."
          : "Your project will use the default 0docs subdomain.",
      });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Error saving domain", description: e.message, variant: "destructive" });
    }
    setSavingDomain(false);
  };

  // Verify uses raw apiRequest so we can introspect 409 responses (race: domain
  // changed during DNS lookup) and still surface the fresh project state to UI.
  const verifyOnce = async (): Promise<{ project: any; raced: boolean } | null> => {
    if (!projectId) return null;
    const res = await apiRequest(`/projects/${projectId}/verify-domain`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (res.ok) {
      return { project: await res.json(), raced: false };
    }
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      return { project: body?.project ?? null, raced: true };
    }
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${errText}`);
  };

  const handleVerifyDomain = async () => {
    if (!projectId || verifying || verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;
    setVerifying(true);
    try {
      const result = await verifyOnce();
      if (result?.project) applyProjectStatus(result.project);
      if (result?.raced) {
        toast({
          title: "Domain changed during verification",
          description: "Please retry once your latest changes have settled.",
          variant: "destructive",
        });
      } else {
        const updated = result?.project;
        const status = updated?.customDomainStatus ?? updated?.custom_domain_status ?? null;
        if (status === "verified") {
          toast({ title: "Domain verified", description: "Your custom domain is now active." });
          onSaved?.();
        } else {
          toast({
            title: "Verification failed",
            description: updated?.customDomainLastError ?? updated?.custom_domain_last_error ?? "DNS records don't match yet. Try again in a few minutes.",
            variant: "destructive",
          });
        }
      }
    } catch (e: any) {
      toast({ title: "Error verifying domain", description: e.message, variant: "destructive" });
    }
    verifyInFlightRef.current = false;
    setVerifying(false);
  };

  // Auto-poll verification while domain is pending so the UI flips to "verified"
  // as soon as DNS propagates. Stops once the status flips off "pending".
  // Guards against overlapping with manual verify via verifyInFlightRef.
  useEffect(() => {
    if (!projectId || domainStatus !== "pending" || !initialDomain) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled || verifyInFlightRef.current) return;
      verifyInFlightRef.current = true;
      try {
        const result = await verifyOnce();
        if (cancelled || !result?.project) return;
        applyProjectStatus(result.project);
        const status = result.project?.customDomainStatus ?? result.project?.custom_domain_status ?? null;
        if (status === "verified") onSaved?.();
      } catch {
        /* swallow polling errors */
      } finally {
        verifyInFlightRef.current = false;
      }
    }, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [projectId, domainStatus, initialDomain]);

  const handleRemoveDomain = async () => {
    if (!projectId) return;
    setSavingDomain(true);
    try {
      const updated = await api.patch<any>(`/projects/${projectId}`, { customDomain: null });
      applyProjectStatus(updated);
      setDomain("");
      toast({ title: "Custom domain removed" });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSavingDomain(false);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied to clipboard` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const meta = SECTION_TITLES[activeSection];

  return (
    <div className="flex-1 flex min-h-0 animate-fade-in">
      {/* Sidebar nav (Mintlify-style) */}
      <aside className="w-[240px] shrink-0 border-r border-border/40 bg-muted/20 px-3 py-6 overflow-y-auto" aria-label="Settings sections">

        <nav className="space-y-5" aria-label="Settings">
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
        <SettingsTopHeader activeSection={activeSection} projectId={projectId} />
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

              {/* Delete Project */}
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

          {activeSection === "domain" && (
            <div className="space-y-6">
              {/* Default URL — every project gets a free, instantly-working
                  shareable URL on Replit's free domain at <host>/p/<slug>.
                  No DNS setup required; this is what users see by default. */}
              {(() => {
                const slug = project?.slug || "your-project";
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const defaultUrl = `${origin}/p/${slug}`;
                const handleCopyDefault = async () => {
                  try {
                    await navigator.clipboard.writeText(defaultUrl);
                    toast({ title: "URL copied", description: defaultUrl });
                  } catch {
                    toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
                  }
                };
                return (
                  <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground flex items-center gap-2">
                          Default URL
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            live
                          </span>
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          Your docs are always available at this URL — no DNS setup needed.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 min-w-0 truncate font-mono text-[12px] text-foreground bg-background/60 border border-border/40 rounded-md px-2.5 py-1.5">
                            {defaultUrl}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopyDefault}
                            className="h-8 rounded-lg text-[12px] shrink-0"
                            title="Copy URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <a
                            href={defaultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-[12px] border border-border/40 hover:bg-muted/60 text-foreground shrink-0"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Optional upgrade — connect a custom domain on top of the
                  default URL above. Existing DNS verification flow follows. */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border/40" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Optional · custom domain
                </span>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              {/* Status banner — reflects live DNS verification state */}
              {(() => {
                const status: DomainStatus = initialDomain ? domainStatus : null;
                const tone =
                  status === "verified"
                    ? { iconBg: "bg-emerald-500/10 text-emerald-500", icon: <CheckCircle2 className="h-4 w-4" />, title: "Domain verified", desc: "Your docs are live on this custom domain." }
                    : status === "pending"
                    ? { iconBg: "bg-amber-500/10 text-amber-500", icon: <Loader2 className="h-4 w-4 animate-spin" />, title: "Pending DNS verification", desc: "Add the DNS record below, then click Verify. We'll also auto-check every 30 seconds." }
                    : status === "failed"
                    ? { iconBg: "bg-destructive/10 text-destructive", icon: <AlertCircle className="h-4 w-4" />, title: "Verification failed", desc: domainLastError || "DNS records don't match. Double-check your provider settings." }
                    : initialDomain
                    ? { iconBg: "bg-muted text-muted-foreground", icon: <Globe className="h-4 w-4" />, title: "Custom domain connected", desc: "Set up DNS to complete the connection." }
                    : { iconBg: "bg-muted text-muted-foreground", icon: <Globe className="h-4 w-4" />, title: "No custom domain", desc: "" };

                return (
                  <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5 flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${tone.iconBg}`}>
                      {tone.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground flex items-center gap-2">
                        {tone.title}
                        {status && (
                          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md ${
                            status === "verified" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : status === "pending" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-destructive/15 text-destructive"
                          }`}>
                            {status}
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {initialDomain ? (
                          <>
                            <span className="font-mono text-foreground">{initialDomain}</span>
                            {tone.desc ? <> — {tone.desc}</> : null}
                          </>
                        ) : (
                          <>Connect your own domain (e.g. docs.yourcompany.com) to publish on top of your brand.</>
                        )}
                      </p>
                      {domainLastCheckedAt && status !== "verified" && (
                        <p className="text-[10.5px] text-muted-foreground/80 mt-1">
                          Last checked {new Date(domainLastCheckedAt).toLocaleString()}
                        </p>
                      )}
                      {status === "verified" && domainVerifiedAt && (
                        <p className="text-[10.5px] text-muted-foreground/80 mt-1">
                          Verified {new Date(domainVerifiedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {initialDomain && status !== "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleVerifyDomain}
                          disabled={verifying}
                          className="h-8 rounded-lg text-[12px]"
                        >
                          {verifying ? (
                            <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Verifying…</>
                          ) : (
                            <>Verify Now</>
                          )}
                        </Button>
                      )}
                      {initialDomain && status === "verified" && (
                        <a
                          href={`https://${initialDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Domain input + Mintlify-style "Host at /docs" toggle */}
              <Field
                label={
                  <div className="flex items-center justify-between w-full">
                    <span>Custom domain</span>
                    <label className="flex items-center gap-2 text-[11.5px] font-normal text-muted-foreground select-none cursor-pointer">
                      <span>Host at</span>
                      <code className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground text-[11px] font-mono">
                        {normalizedBasePath || "/docs"}
                      </code>
                      {/* Lightweight switch — avoids importing Switch just for this row */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={basePathEnabled}
                        onClick={() => setBasePathEnabled((v) => !v)}
                        className={`relative h-4 w-7 rounded-full transition-colors ${
                          basePathEnabled ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3 w-3 rounded-full bg-background shadow transition-all ${
                            basePathEnabled ? "left-3.5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                }
                hint="Enter the full domain you want to use, like docs.example.com (no http:// or trailing slash)."
              >
                <div className="flex gap-2">
                  <div
                    className={`flex-1 flex items-stretch h-10 rounded-lg border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 ${
                      !isValidDomain ? "border-destructive" : "border-border/60"
                    }`}
                  >
                    <span className="px-3 inline-flex items-center text-[12px] font-mono text-muted-foreground bg-muted/30 border-r border-border/40 select-none">
                      https://
                    </span>
                    <input
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="docs.yourcompany.com"
                      className="flex-1 min-w-0 bg-transparent px-3 font-mono text-[13px] outline-none placeholder:text-muted-foreground/70"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                    />
                    {basePathEnabled && (
                      <span className="px-3 inline-flex items-center text-[12px] font-mono text-foreground bg-muted/40 border-l border-border/40 select-none">
                        {normalizedBasePath || "/docs"}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveDomain}
                    disabled={savingDomain || !isValidDomain || !isValidBasePath || !domainChanged}
                    className="h-10 rounded-lg shrink-0"
                  >
                    {savingDomain ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                {!isValidDomain && (
                  <p className="text-[11.5px] text-destructive mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Use a format like <span className="font-mono">docs.example.com</span>
                  </p>
                )}
                {basePathEnabled && (
                  <div className="mt-2 flex items-center gap-2">
                    <Label className="text-[11.5px] text-muted-foreground shrink-0">Subpath</Label>
                    <Input
                      value={basePath}
                      onChange={(e) => setBasePath(e.target.value)}
                      placeholder="/docs"
                      className={`h-8 rounded-md font-mono text-[12px] max-w-[200px] ${
                        !isValidBasePath ? "border-destructive focus-visible:ring-destructive/40" : ""
                      }`}
                      spellCheck={false}
                    />
                    {!isValidBasePath && (
                      <span className="text-[11px] text-destructive">Use a path like /docs</span>
                    )}
                  </div>
                )}
              </Field>

              {/* DNS instructions */}
              {trimmedDomain && isValidDomain && (
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/40 bg-muted/30 flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                      DNS Configuration
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70">
                      Add the record below at your DNS provider
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {isApex ? (
                      <DnsRow
                        type="A"
                        name="@"
                        value="76.76.21.21"
                        onCopy={(v, l) => copyToClipboard(v, l)}
                      />
                    ) : (
                      <DnsRow
                        type="CNAME"
                        name={trimmedDomain.split(".")[0]}
                        value="cname.0docs.app"
                        onCopy={(v, l) => copyToClipboard(v, l)}
                      />
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-border/40 bg-muted/20">
                    <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                      DNS changes can take anywhere from a few minutes to 48 hours to propagate. Once your domain resolves, your docs will be reachable at{" "}
                      <span className="font-mono text-foreground">
                        https://{trimmedDomain}{basePathEnabled ? (normalizedBasePath || "/docs") : ""}
                      </span>
                      . SSL is provisioned automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Cloudflare worker snippet — only relevant when hosting at a subpath
                  on a domain the user already serves from another origin. */}
              {trimmedDomain && isValidDomain && basePathEnabled && (
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/40 bg-muted/30 flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Cloudflare worker (optional)
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70">
                      Proxy <span className="font-mono">{normalizedBasePath || "/docs"}</span> through your existing site
                    </span>
                  </div>
                  <pre className="text-[11.5px] leading-relaxed font-mono p-4 overflow-x-auto bg-muted/10 text-foreground">
{`addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  // If the request is for the docs subpath, proxy to 0docs
  if (url.pathname.startsWith("${normalizedBasePath || "/docs"}")) {
    const docsUrl = new URL(request.url);
    docsUrl.hostname = "${trimmedDomain}";
    const proxyReq = new Request(docsUrl, request);
    proxyReq.headers.set("X-Forwarded-Host", url.hostname);
    proxyReq.headers.set("X-Forwarded-Proto", "https");
    return fetch(proxyReq);
  }
  // Otherwise, fall through to your existing site
  return fetch(request);
}`}
                  </pre>
                </div>
              )}

              {/* Remove existing domain */}
              {initialDomain && (
                <div className="pt-4 mt-2 border-t border-border/40">
                  <div className="flex items-center justify-between gap-4 py-1">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Disconnect domain</p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5">
                        Reverts to the default subdomain immediately. DNS records are not removed.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveDomain}
                      disabled={savingDomain}
                      className="h-9 rounded-lg shrink-0"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "mcp" && <MCPSettings projectId={projectId} />}

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

const DnsRow = ({
  type, name, value, onCopy,
}: {
  type: string; name: string; value: string;
  onCopy: (text: string, label: string) => void;
}) => (
  <div className="grid grid-cols-[80px_1fr_1.4fr_auto] items-center gap-3 px-4 py-2.5 text-[12px] hover:bg-muted/20 transition-colors">
    <span className="font-mono font-semibold text-primary uppercase text-[11px]">{type}</span>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">Name</p>
      <p className="font-mono text-foreground truncate">{name}</p>
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">Value</p>
      <p className="font-mono text-foreground truncate">{value}</p>
    </div>
    <button
      onClick={() => onCopy(value, "DNS value")}
      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Copy value"
      aria-label="Copy DNS value"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  </div>
);

export default SettingsContent;
