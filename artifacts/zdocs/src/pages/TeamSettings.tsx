import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Mail,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface TeamUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  makeAdmin: boolean;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  invitedByUserId: string;
}

interface Me {
  id: string;
  isAdmin: boolean;
}

function displayName(u: TeamUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || "Unnamed";
}

function inviteStatus(inv: Invite): "pending" | "accepted" | "revoked" | "expired" {
  if (inv.revokedAt) return "revoked";
  if (inv.acceptedAt) return "accepted";
  if (new Date(inv.expiresAt) < new Date()) return "expired";
  return "pending";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const TeamSettings = () => {
  const { user, refresh } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  // Per-row in-flight flags
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [meRes, usersRes, invitesRes] = await Promise.all([
        api.get<{ user: Me | null }>("/auth/me"),
        api.get<{ users: TeamUser[] }>("/auth/admin/users"),
        api.get<{ invites: Invite[] }>("/auth/invites"),
      ]);
      setMe(meRes.user);
      setUsers(usersRes.users);
      setInvites(invitesRes.invites);
    } catch (e) {
      setMeError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user, loadAll]);

  const isAdmin = me?.isAdmin === true;
  const sortedInvites = useMemo(() => {
    const order: Record<string, number> = { pending: 0, accepted: 1, expired: 2, revoked: 3 };
    return [...invites].sort((a, b) => {
      const sa = order[inviteStatus(a)] ?? 99;
      const sb = order[inviteStatus(b)] ?? 99;
      if (sa !== sb) return sa - sb;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [invites]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setCreating(true);
    setLastInviteUrl(null);
    try {
      const res = await api.post<{ invite: Invite; inviteUrl: string }>(
        "/auth/invites",
        { email: inviteEmail.trim(), makeAdmin: inviteAsAdmin },
      );
      setInvites((prev) => [res.invite, ...prev]);
      setLastInviteUrl(res.inviteUrl);
      setInviteEmail("");
      setInviteAsAdmin(false);
      toast({
        title: "Invite sent",
        description: process.env.NODE_ENV === "production"
          ? `Invite ready for ${res.invite.email}.`
          : `Invite ready for ${res.invite.email}. Copy the link below if SMTP isn't configured.`,
      });
    } catch (e) {
      toast({
        title: "Could not create invite",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function revokeInvite(id: string) {
    setBusyInviteId(id);
    try {
      await api.del(`/auth/invites/${id}`);
      setInvites((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, revokedAt: new Date().toISOString() } : inv,
        ),
      );
    } catch (e) {
      toast({
        title: "Could not revoke",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusyInviteId(null);
    }
  }

  async function toggleAdmin(target: TeamUser) {
    setBusyUserId(target.id);
    try {
      const res = await api.patch<{ user: { id: string; isAdmin: boolean } }>(
        `/auth/admin/users/${target.id}`,
        { isAdmin: !target.isAdmin },
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id ? { ...u, isAdmin: res.user.isAdmin } : u,
        ),
      );
      // If we just changed our own row, refresh the auth context so other
      // admin-gated UI updates immediately.
      if (target.id === me?.id) {
        setMe({ ...me, isAdmin: res.user.isAdmin });
        await refresh();
      }
    } catch (e) {
      toast({
        title: "Could not update role",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusyUserId(null);
    }
  }

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", description: "Copy the link manually." });
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center py-20">
          <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (meError || !isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="mb-6">
            <button
              onClick={() => navigate("/builder")}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="border border-border rounded-xl p-6 bg-card">
            <h1 className="text-xl font-semibold mb-2">Team — admins only</h1>
            <p className="text-sm text-muted-foreground">
              {meError ?? "You need admin access to manage the team."}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1.5">
            <button
              onClick={() => navigate("/builder")}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Team</h1>
          </div>
          <p className="text-[14px] text-muted-foreground ml-11">
            Invite teammates, manage admins, and revoke pending invites.
          </p>
        </div>

        {/* Invite form */}
        <section className="mb-10 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Invite someone</h2>
          </div>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="invite-email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send invite
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={inviteAsAdmin}
                onChange={(e) => setInviteAsAdmin(e.target.checked)}
                className="accent-primary"
              />
              Make this user an admin
            </label>
          </form>
          {lastInviteUrl && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <div className="flex-1 break-all font-mono text-[12px] text-foreground">{lastInviteUrl}</div>
              <button
                type="button"
                onClick={() => copyToClipboard(lastInviteUrl)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Copy invite link"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Members */}
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-3">Members ({users.length})</h2>
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-9 w-9 platform-avatar text-sm">
                    {displayName(u)[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{displayName(u)}</span>
                      {u.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      )}
                      {u.id === me?.id && (
                        <span className="text-[11px] text-muted-foreground">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    Joined {formatDate(u.createdAt)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyUserId === u.id}
                    onClick={() => toggleAdmin(u)}
                  >
                    {busyUserId === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : u.isAdmin ? (
                      <>
                        <ShieldOff className="h-3.5 w-3.5" />
                        Remove admin
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Make admin
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Invites */}
        <section>
          <h2 className="text-base font-semibold mb-3">Invites ({invites.length})</h2>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl px-4 py-8 text-center">
              No invites yet.
            </p>
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <ul className="divide-y divide-border">
                {sortedInvites.map((inv) => {
                  const status = inviteStatus(inv);
                  return (
                    <li key={inv.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{inv.email}</span>
                          {inv.makeAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                              <ShieldCheck className="h-3 w-3" /> Admin
                            </span>
                          )}
                          <span className={`text-[11px] rounded-full px-2 py-0.5 ${
                            status === "pending"
                              ? "bg-accent text-foreground/80"
                              : status === "accepted"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}>{status}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatDate(inv.createdAt)} · Expires {formatDate(inv.expiresAt)}
                        </div>
                      </div>
                      {status === "pending" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyInviteId === inv.id}
                          onClick={() => revokeInvite(inv.id)}
                        >
                          {busyInviteId === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5" />
                              Revoke
                            </>
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default TeamSettings;
