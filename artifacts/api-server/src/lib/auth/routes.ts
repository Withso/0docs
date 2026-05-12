import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  passwordResetTokensTable,
  invitesTable,
} from "@workspace/db";
import {
  clearSession,
  createSession,
  getSessionId,
  setSessionCookie,
  type SessionData,
} from "./shared";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isValidEmail,
  normalizeEmail,
} from "./password";
import { rateLimit } from "./ratelimit";
import { sendPasswordResetEmail } from "./email";
import { ensureDemoProjectForUser } from "../clone-homepage";

const router: IRouter = Router();

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

function toAuthUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
  };
}

function parseSignup(body: unknown):
  | {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      inviteToken?: string;
    }
  | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.email !== "string" || typeof b.password !== "string") return null;
  return {
    email: b.email,
    password: b.password,
    firstName: typeof b.firstName === "string" ? b.firstName : undefined,
    lastName: typeof b.lastName === "string" ? b.lastName : undefined,
    inviteToken: typeof b.inviteToken === "string" ? b.inviteToken : undefined,
  };
}

function hashInviteToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseLogin(body: unknown): { email: string; password: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.email !== "string" || typeof b.password !== "string") return null;
  return { email: b.email, password: b.password };
}

function parseForgot(body: unknown): { email: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.email !== "string") return null;
  return { email: b.email };
}

function parseReset(body: unknown): { token: string; password: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.token !== "string" || typeof b.password !== "string") return null;
  return { token: b.token, password: b.password };
}

const authLimiter = rateLimit({ windowMs: 10 * 60_000, max: 20 });
const resetLimiter = rateLimit({ windowMs: 60 * 60_000, max: 5 });

// /api/login is the canonical login URL that redirects to the SPA /auth
// page where the sign-in / sign-up forms render.
router.get("/login", (req: Request, res: Response) => {
  const returnTo = getSafeReturnTo(req.query.returnTo);
  const target = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
  res.redirect(target);
});

router.post("/auth/signup", authLimiter, async (req: Request, res: Response) => {
  const parsed = parseSignup(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid signup payload." });
    return;
  }

  // If the caller provided an invite token, resolve it first so we can
  // honor the invite (bypass DISABLE_SIGNUP, force the invite email, set
  // is_admin from the invite). Token is validated before any password
  // work to avoid timing-attack signal on token validity.
  let invite: typeof invitesTable.$inferSelect | null = null;
  if (parsed.inviteToken) {
    const tokenHash = hashInviteToken(parsed.inviteToken);
    const [row] = await db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.tokenHash, tokenHash),
          isNull(invitesTable.acceptedAt),
          isNull(invitesTable.revokedAt),
          gt(invitesTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) {
      res.status(400).json({ error: "Invite is invalid, used, revoked, or expired." });
      return;
    }
    invite = row;
  }

  // Hard server-side enforcement of DISABLE_SIGNUP. Bypassed by:
  //   - the very first user (bootstrap path: matches install.sh seeding)
  //   - signups carrying a valid invite token
  // Otherwise the endpoint refuses even if the UI tries to show the form.
  if (!invite && process.env.DISABLE_SIGNUP === "true") {
    const anyUser = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .limit(1);
    if (anyUser.length > 0) {
      res.status(403).json({ error: "Signup is disabled on this instance." });
      return;
    }
  }

  // When an invite is present, the email is non-negotiable: the form
  // shows it pre-filled and locked, but a hostile client could still
  // POST something different. Force it here.
  const email = invite
    ? normalizeEmail(invite.email)
    : normalizeEmail(parsed.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  const pwErr = validatePasswordStrength(parsed.password);
  if (pwErr) {
    res.status(400).json({ error: pwErr });
    return;
  }

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with that email already exists." });
      return;
    }

    const passwordHash = await hashPassword(parsed.password);

    // Admin flag precedence:
    //   1. Invite's makeAdmin (if accepting an invite)
    //   2. First user (bootstrap)
    //   3. ADMIN_EMAIL env match
    const anyUser = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .limit(1);
    const isFirstUser = anyUser.length === 0;
    const adminEmail = process.env.ADMIN_EMAIL
      ? normalizeEmail(process.env.ADMIN_EMAIL)
      : null;
    const isAdmin =
      (invite?.makeAdmin ?? false) ||
      isFirstUser ||
      (!!adminEmail && adminEmail === email);

    const [user] = await db
      .insert(usersTable)
      .values({
        email,
        firstName: parsed.firstName ?? null,
        lastName: parsed.lastName ?? null,
        passwordHash,
        isAdmin,
      })
      .returning();

    // Consume the invite atomically — if a concurrent signup already
    // claimed it, the WHERE clause makes our UPDATE a no-op and we treat
    // that as an error so we never end up with two accounts on one invite.
    if (invite) {
      const consumed = await db
        .update(invitesTable)
        .set({ acceptedAt: new Date(), acceptedByUserId: user.id })
        .where(
          and(
            eq(invitesTable.id, invite.id),
            isNull(invitesTable.acceptedAt),
            isNull(invitesTable.revokedAt),
          ),
        )
        .returning({ id: invitesTable.id });
      if (consumed.length === 0) {
        // Race condition — roll back the user we just created.
        await db.delete(usersTable).where(eq(usersTable.id, user.id));
        res.status(409).json({ error: "Invite was just used by someone else." });
        return;
      }
    }

    const sessionData: SessionData = { user: toAuthUser(user) };
    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    await ensureDemoProjectForUser(user.id);
    res.json({ user: toAuthUser(user) });
  } catch (err) {
    req.log.error({ err }, "[auth signup] failed");
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

router.post("/auth/login", authLimiter, async (req: Request, res: Response) => {
  const parsed = parseLogin(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid login payload." });
    return;
  }
  const email = normalizeEmail(parsed.email);

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (!user || !user.passwordHash) {
      // Same response either way to prevent account enumeration.
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const ok = await verifyPassword(parsed.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const sid = await createSession({ user: toAuthUser(user) });
    setSessionCookie(res, sid);
    await ensureDemoProjectForUser(user.id);
    res.json({ user: toAuthUser(user) });
  } catch (err) {
    req.log.error({ err }, "[auth login] failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

// GET /logout supports clients that navigate to the URL directly
// (window.location.href = "/api/logout") rather than POSTing.
router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect("/");
});

router.post(
  "/auth/forgot-password",
  resetLimiter,
  async (req: Request, res: Response) => {
    const parsed = parseForgot(req.body);
    if (!parsed) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }
    const email = normalizeEmail(parsed.email);
    // Always respond 200 to prevent enumeration.
    try {
      const [user] = await db
        .select({ id: usersTable.id, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (user && user.email) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");
        await db.insert(passwordResetTokensTable).values({
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        });
        const resetUrl = `${getOrigin(req)}/auth?reset=${encodeURIComponent(rawToken)}`;
        await sendPasswordResetEmail({ to: user.email, resetUrl });
      }
    } catch (err) {
      req.log.error({ err }, "[auth forgot-password] failed");
    }
    res.json({ ok: true });
  },
);

router.post(
  "/auth/reset-password",
  resetLimiter,
  async (req: Request, res: Response) => {
    const parsed = parseReset(req.body);
    if (!parsed) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }
    const pwErr = validatePasswordStrength(parsed.password);
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }
    try {
      const tokenHash = crypto
        .createHash("sha256")
        .update(parsed.token)
        .digest("hex");
      const [row] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(
          and(
            eq(passwordResetTokensTable.tokenHash, tokenHash),
            isNull(passwordResetTokensTable.usedAt),
            gt(passwordResetTokensTable.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!row) {
        res
          .status(400)
          .json({ error: "Reset link is invalid or has expired." });
        return;
      }

      const passwordHash = await hashPassword(parsed.password);
      await db
        .update(usersTable)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(usersTable.id, row.userId));
      await db
        .update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokensTable.tokenHash, tokenHash));

      res.json({ ok: true });
    } catch (err) {
      req.log.error({ err }, "[auth reset-password] failed");
      res.status(500).json({ error: "Could not reset password." });
    }
  },
);

export default router;
