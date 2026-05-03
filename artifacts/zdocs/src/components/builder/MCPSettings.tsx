import { useEffect, useState, useMemo } from "react";
import { useApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Loader2, Plus, Trash2, Eye, EyeOff, Server, Check } from "lucide-react";

interface ToolMeta {
  name: string;
  description: string;
  readOnly: boolean;
  needsProject: boolean;
}

interface TokenRow {
  id: string;
  label: string;
  lastFour: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  // Only present immediately after creation:
  token?: string;
}

interface SettingsState {
  enabled: boolean;
  allowAnonymous: boolean;
  disabledTools: string[];
  endpoint: string;
}

const MCPSettings = ({ projectId }: { projectId: string }) => {
  const api = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [tools, setTools] = useState<ToolMeta[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [newToken, setNewToken] = useState<TokenRow | null>(null);
  const [tokenLabel, setTokenLabel] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [showFullToken, setShowFullToken] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, t, tk] = await Promise.all([
          api.get<SettingsState>(`/projects/${projectId}/mcp/settings`),
          api.get<ToolMeta[]>(`/mcp/tools`),
          api.get<TokenRow[]>(`/projects/${projectId}/mcp/tokens`),
        ]);
        if (cancelled) return;
        setSettings(s);
        setTools(t);
        setTokens(tk);
      } catch (e: any) {
        toast({ title: "Failed to load MCP settings", description: e.message, variant: "destructive" });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const disabledSet = useMemo(() => new Set(settings?.disabledTools ?? []), [settings]);

  const persist = async (patch: Partial<SettingsState>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      const updated = await api.put<Omit<SettingsState, "endpoint">>(`/projects/${projectId}/mcp/settings`, {
        enabled: next.enabled,
        allowAnonymous: next.allowAnonymous,
        disabledTools: next.disabledTools,
      });
      setSettings({ ...next, ...updated });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleTool = (name: string, enabled: boolean) => {
    const cur = new Set(settings?.disabledTools ?? []);
    if (enabled) cur.delete(name); else cur.add(name);
    void persist({ disabledTools: Array.from(cur) });
  };

  const createToken = async () => {
    setCreatingToken(true);
    try {
      const created = await api.post<TokenRow>(`/projects/${projectId}/mcp/tokens`, {
        label: tokenLabel.trim() || "Untitled token",
      });
      setNewToken(created);
      setTokens(prev => [created, ...prev]);
      setTokenLabel("");
      setShowFullToken(true);
    } catch (e: any) {
      toast({ title: "Failed to create token", description: e.message, variant: "destructive" });
    }
    setCreatingToken(false);
  };

  const revokeToken = async (id: string) => {
    try {
      await api.del(`/projects/${projectId}/mcp/tokens/${id}`);
      setTokens(prev => prev.filter(t => t.id !== id));
      if (newToken?.id === id) setNewToken(null);
      toast({ title: "Token revoked" });
    } catch (e: any) {
      toast({ title: "Failed to revoke", description: e.message, variant: "destructive" });
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copied` });
    });
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-[13px] py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading MCP settings…
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const endpointUrl = `${origin}${settings.endpoint}`;
  const claudeConfig = JSON.stringify({
    mcpServers: {
      "0docs": {
        url: endpointUrl,
        ...(tokens[0] ? { headers: { Authorization: "Bearer mcp_…" } } : {}),
      },
    },
  }, null, 2);

  return (
    <div className="space-y-6">
      {/* Endpoint card */}
      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-[14px] text-foreground">MCP Endpoint</h3>
            <p className="text-[12px] text-muted-foreground">
              Connect AI agents (Claude Desktop, Cursor, Continue) to this project's docs via the
              Model Context Protocol. Streamable HTTP and SSE transports are both supported.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input value={endpointUrl} readOnly className="font-mono text-[12px] h-9" />
          <Button size="sm" variant="outline" onClick={() => copy(endpointUrl, "Endpoint URL")} className="h-9">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <details className="mt-3">
          <summary className="text-[12px] text-muted-foreground cursor-pointer hover:text-foreground">
            Claude Desktop config snippet
          </summary>
          <pre className="mt-2 rounded-lg bg-muted/40 border border-border/40 p-3 text-[11px] font-mono overflow-x-auto">{claudeConfig}</pre>
        </details>
      </section>

      {/* Access control */}
      <section className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-[14px] text-foreground">Access</h3>
          <p className="text-[12px] text-muted-foreground">
            Control who can connect and what they can do.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="min-w-0">
            <Label className="text-[13px] font-medium">MCP server enabled</Label>
            <p className="text-[12px] text-muted-foreground">
              Turn off to immediately reject all MCP requests for this project.
            </p>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={v => persist({ enabled: v })} disabled={saving} />
        </div>
        <div className="flex items-center justify-between gap-4 py-2 border-t border-border/40">
          <div className="min-w-0">
            <Label className="text-[13px] font-medium">Allow anonymous read-only access</Label>
            <p className="text-[12px] text-muted-foreground">
              Lets unauthenticated agents call read-only tools (list/get/search). Writes always require a token.
            </p>
          </div>
          <Switch checked={settings.allowAnonymous} onCheckedChange={v => persist({ allowAnonymous: v })} disabled={saving} />
        </div>
      </section>

      {/* Tokens */}
      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-[14px] text-foreground">Personal Access Tokens</h3>
            <p className="text-[12px] text-muted-foreground">
              Tokens grant the holder owner-level MCP access to <em>this project</em>.
              Send as <code className="font-mono">Authorization: Bearer mcp_…</code>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Token label (e.g. 'Claude Desktop')"
            value={tokenLabel}
            onChange={e => setTokenLabel(e.target.value)}
            className="h-9 text-[13px]"
          />
          <Button size="sm" onClick={createToken} disabled={creatingToken} className="h-9">
            {creatingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Create token
          </Button>
        </div>
        {newToken?.token && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 mb-4">
            <p className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Token created — copy it now, you won't see it again.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={showFullToken ? newToken.token : "•".repeat(newToken.token.length)}
                className="font-mono text-[12px] h-8"
              />
              <Button size="sm" variant="ghost" onClick={() => setShowFullToken(s => !s)} className="h-8 w-8 p-0">
                {showFullToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(newToken.token!, "Token")} className="h-8">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        {tokens.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-4 text-center">No tokens yet.</p>
        ) : (
          <div className="border border-border/40 rounded-lg divide-y divide-border/40">
            {tokens.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">{t.label || "Untitled"}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    mcp_…{t.lastFour}
                    <span className="ml-3 font-sans">
                      Created {new Date(t.createdAt).toLocaleDateString()}
                      {t.lastUsedAt ? ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                    </span>
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke this token?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Any agent using <code>mcp_…{t.lastFour}</code> will immediately lose access.
                        This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revokeToken(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Per-tool toggles */}
      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-[14px] text-foreground">Tools</h3>
          <p className="text-[12px] text-muted-foreground">
            Disable individual tools to narrow the surface area exposed to agents. Read-only tools
            are also exposed to anonymous callers when that toggle is on.
          </p>
        </div>
        <div className="border border-border/40 rounded-lg divide-y divide-border/40 max-h-[480px] overflow-y-auto">
          {tools.map(tool => {
            const enabled = !disabledSet.has(tool.name);
            return (
              <div key={tool.name} className="flex items-start justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-mono font-medium">{tool.name}</p>
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${tool.readOnly ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                      {tool.readOnly ? "read" : "write"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={v => toggleTool(tool.name, v)}
                  disabled={saving}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default MCPSettings;
