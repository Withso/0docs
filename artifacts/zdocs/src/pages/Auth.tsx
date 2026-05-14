import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "signin" | "signup" | "forgot" | "reset";

interface InviteInfo {
  email: string;
  makeAdmin: boolean;
  expiresAt: string;
}

function getReturnTo(search: URLSearchParams): string {
  const r = search.get("returnTo");
  if (r && r.startsWith("/") && !r.startsWith("//")) return r;
  return "/builder";
}

export default function AuthPage() {
  const { config, refresh, user, loading } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const resetToken = search.get("reset");
  const inviteToken = search.get("invite");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState<boolean>(!!inviteToken);

  const initialTab: Tab = inviteToken
    ? "signup"
    : resetToken
      ? "reset"
      : "signin";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [tabAdjusted, setTabAdjusted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const returnTo = useMemo(() => getReturnTo(search), [search]);

  // Already signed in — bounce to returnTo. Skip when accepting an
  // invite, since the invite might be for a different account.
  useEffect(() => {
    if (!loading && user && !inviteToken) navigate(returnTo, { replace: true });
  }, [user, loading, navigate, returnTo, inviteToken]);

  // Fresh-instance bootstrap: when no users exist yet, default the
  // page to the signup form so the first visitor sets up the admin
  // account. We only flip once on initial load so the user can still
  // toggle to signin manually afterwards.
  useEffect(() => {
    if (tabAdjusted) return;
    if (!config) return;
    if (inviteToken || resetToken) return;
    if (config.hasAnyUser === false) {
      setTab("signup");
    }
    setTabAdjusted(true);
  }, [config, inviteToken, resetToken, tabAdjusted]);

  const isBootstrapSignup =
    tab === "signup" && !invite && config?.hasAnyUser === false;

  // Resolve the invite token, if any, so we can pre-fill + lock the email
  // and badge the form with the inviter / role.
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      setInviteLoading(true);
      try {
        const res = await fetch(
          `/api/auth/invites/lookup?token=${encodeURIComponent(inviteToken)}`,
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (!cancelled) setInviteError(j.error || "Invite link is invalid.");
          return;
        }
        const data = (await res.json()) as { invite: InviteInfo };
        if (!cancelled) {
          setInvite(data.invite);
          setEmail(data.invite.email);
        }
      } catch {
        if (!cancelled) setInviteError("Could not validate this invite link.");
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  if (loading || !config || inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Invite link is broken / expired / used — surface the reason and let
  // the user pick a different path.
  if (inviteToken && inviteError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm border border-border rounded-lg p-6 bg-card">
          <h1 className="text-xl font-semibold mb-2">Invite unavailable</h1>
          <p className="text-sm text-muted-foreground mb-4">{inviteError}</p>
          <button
            type="button"
            onClick={() => navigate("/auth", { replace: true })}
            className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
          >
            Sign in instead
          </button>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      if (tab === "signin") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Sign in failed.");
        }
        await refresh();
        navigate(returnTo, { replace: true });
      } else if (tab === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            ...(inviteToken ? { inviteToken } : {}),
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Sign up failed.");
        }
        await refresh();
        navigate(returnTo, { replace: true });
      } else if (tab === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Request failed.");
        }
        setInfo(
          "If an account exists for that email, a reset link has been sent. " +
            "If SMTP isn't configured, check the server console for the link.",
        );
      } else if (tab === "reset") {
        if (!resetToken) throw new Error("Missing reset token.");
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Reset failed.");
        }
        setInfo("Password updated. You can now sign in.");
        setTab("signin");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border rounded-lg p-6 bg-card">
        <h1 className="text-xl font-semibold mb-1">
          {tab === "signin" && "Sign in"}
          {tab === "signup" && (
            invite
              ? "Accept your invite"
              : isBootstrapSignup
                ? "Set up your admin account"
                : "Create your account"
          )}
          {tab === "forgot" && "Reset your password"}
          {tab === "reset" && "Choose a new password"}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {tab === "signin" && "Welcome back to 0docs."}
          {tab === "signup" && isBootstrapSignup &&
            "Welcome to your new 0docs instance. The first account is the admin — that's you."}
          {tab === "signup" && !invite && !isBootstrapSignup &&
            "Self-hosted 0docs instance."}
          {tab === "signup" && invite &&
            `You've been invited as ${invite.makeAdmin ? "an admin" : "a member"}. Set a password to finish creating your account.`}
          {tab === "forgot" &&
            "Enter your email and we'll send a reset link."}
          {tab === "reset" && "Enter a new password for your account."}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {(tab === "signin" || tab === "signup" || tab === "forgot") && (
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={tab === "signup" && !!invite}
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab === "signup" && invite ? "opacity-70 cursor-not-allowed" : ""
              }`}
            />
          )}
          {tab === "signup" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          {(tab === "signin" || tab === "signup" || tab === "reset") && (
            <input
              type="password"
              required
              minLength={8}
              autoComplete={
                tab === "signin" ? "current-password" : "new-password"
              }
              placeholder={
                tab === "signin" ? "Password" : "New password (min 8 chars)"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}

          {err && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {err}
            </div>
          )}
          {info && (
            <div className="text-sm text-foreground bg-primary/10 border border-primary/30 rounded-md px-3 py-2">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy
              ? "Working…"
              : tab === "signin"
                ? "Sign in"
                : tab === "signup"
                  ? invite
                    ? "Accept invite"
                    : isBootstrapSignup
                      ? "Create admin account"
                      : "Create account"
                  : tab === "forgot"
                    ? "Send reset link"
                    : "Update password"}
          </button>
        </form>

        <div className="mt-4 text-sm text-muted-foreground space-y-1">
          {tab === "signin" && (
            <>
              {config.signupEnabled !== false && (
                <button
                  type="button"
                  onClick={() => {
                    setErr(null);
                    setInfo(null);
                    setTab("signup");
                  }}
                  className="hover:text-foreground"
                >
                  Need an account? <span className="underline">Sign up</span>
                </button>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setErr(null);
                    setInfo(null);
                    setTab("forgot");
                  }}
                  className="hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}
          {(tab === "signup" || tab === "forgot" || tab === "reset") && !invite && (
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setInfo(null);
                setTab("signin");
              }}
              className="hover:text-foreground"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
