import * as oidc from "openid-client";
import type { Request, Response } from "express";
import type { AuthProvider } from "../types";
import {
  clearSession,
  updateSession,
  type SessionData,
} from "../shared";
import { getOidcConfig } from "./oidc";
import router from "./routes";

async function refreshSession(
  _req: Request,
  res: Response,
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) {
    await clearSession(res, sid);
    return null;
  }

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(config, session.refresh_token);
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    await clearSession(res, sid);
    return null;
  }
}

const provider: AuthProvider = {
  mode: "replit",
  router,
  refreshSession,
  publicConfig: () => ({
    mode: "replit",
    loginUrl: "/api/login",
    logoutUrl: "/api/logout",
  }),
};

export default provider;
export { getOidcConfig };
