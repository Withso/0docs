import type { IRouter, Request, Response } from "express";
import type { SessionData } from "./shared";

export type AuthMode = "replit" | "selfhost";

/**
 * Pluggable auth provider. The rest of the app must only depend on this
 * interface — never on Replit-OIDC- or self-host-specific code paths.
 */
export interface AuthProvider {
  mode: AuthMode;
  /**
   * Provider-owned routes (login/callback/logout/signup/etc) mounted under
   * `/api`. `/api/auth/user` and `/api/auth/config` are mounted by the
   * shared layer, not the provider.
   */
  router: IRouter;
  /**
   * Optional per-request session refresh hook. Called by authMiddleware
   * after the session is loaded. Return the (possibly mutated) session, or
   * null to invalidate.
   */
  refreshSession?: (
    req: Request,
    res: Response,
    sid: string,
    session: SessionData,
  ) => Promise<SessionData | null>;
  /**
   * Public configuration the frontend uses to render the right login UI.
   * Anything user-specific must NOT be returned here — this endpoint is
   * unauthenticated.
   */
  publicConfig: () => Record<string, unknown>;
}

export function getAuthMode(): AuthMode {
  const raw = (process.env.AUTH_MODE ?? "replit").toLowerCase();
  if (raw === "selfhost") return "selfhost";
  return "replit";
}
