import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { AuthUser } from "@workspace/api-client-react";

export interface AuthConfig {
  loginUrl: string;
  logoutUrl: string;
  signupEnabled?: boolean;
}

interface AuthContextType {
  user: { id: string; email?: string; displayName?: string } | null;
  userId: string | null;
  loading: boolean;
  config: AuthConfig | null;
  signOut: () => Promise<void>;
  signIn: () => void;
  refresh: () => Promise<void>;
  // Backwards-compat shim. Cookies handle auth, so this always resolves to null.
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

function toDisplayUser(u: AuthUser | null) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? undefined,
    displayName:
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.email ||
      "User",
  };
}

const DEFAULT_CONFIG: AuthConfig = {
  loginUrl: "/auth",
  logoutUrl: "/api/logout",
  signupEnabled: true,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfgRes, userRes] = await Promise.all([
          fetch("/api/auth/config", { credentials: "include" }),
          fetch("/api/auth/user", { credentials: "include" }),
        ]);
        const cfg = cfgRes.ok ? ((await cfgRes.json()) as AuthConfig) : null;
        const usr = userRes.ok
          ? ((await userRes.json()) as { user: AuthUser | null }).user
          : null;
        if (!cancelled) {
          setConfig(cfg ?? DEFAULT_CONFIG);
          setUser(usr ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setConfig(DEFAULT_CONFIG);
          setUser(null);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(() => {
    const returnTo = window.location.pathname + window.location.search;
    const loginUrl = config?.loginUrl ?? "/auth";
    const sep = loginUrl.includes("?") ? "&" : "?";
    window.location.href = `${loginUrl}${sep}returnTo=${encodeURIComponent(returnTo)}`;
  }, [config]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: toDisplayUser(user),
        userId: user?.id ?? null,
        loading,
        config,
        signOut,
        signIn,
        refresh,
        getToken: async () => null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
