import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // cookie-parser populates `signedCookies` with the value if the
  // signature verifies, or `false` if it doesn't. Reading from
  // `signedCookies` (not `cookies`) means tampered or unsigned values
  // never count as a valid sid.
  const signed = req.signedCookies?.[SESSION_COOKIE];
  if (typeof signed === "string" && signed.length > 0) return signed;
  return undefined;
}

export function setSessionCookie(res: Response, sid: string): void {
  // `secure` is required when SameSite=None (we use Lax, so we keep
  // secure off in dev to allow local http). In production we set it on.
  // `signed: true` adds an HMAC suffix verified by cookie-parser via the
  // session secret; tampering invalidates the cookie.
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
    signed: true,
  });
}
