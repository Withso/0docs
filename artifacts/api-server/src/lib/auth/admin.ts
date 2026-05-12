import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, usersTable, invitesTable } from "@workspace/db";
import { sendInviteEmail } from "./email";

const router: IRouter = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 320;
}

/**
 * Verify the caller is signed in AND has users.is_admin=true. We re-read
 * the flag from the DB on each call so demotions take effect immediately
 * (no need for the user to log out and back in).
 */
async function requireAdmin(req: Request, res: Response): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string | null } | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to continue." });
    return null;
  }
  const [row] = await db
    .select({
      id: usersTable.id,
      isAdmin: usersTable.isAdmin,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);
  if (!row || !row.isAdmin) {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }
  return { id: row.id, firstName: row.firstName, lastName: row.lastName, email: row.email };
}

function fullName(u: { firstName: string | null; lastName: string | null; email: string | null }): string | null {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return u.email;
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ─────────────────────── /api/auth/me ───────────────────────

/**
 * Like /api/auth/user but also exposes the admin flag. Mounted under
 * the admin router so the route only adds one extra request when the
 * frontend's settings UI needs to know whether to show admin controls.
 */
router.get("/auth/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ user: null });
    return;
  }
  const [row] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      isAdmin: usersTable.isAdmin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);
  res.json({ user: row ?? null });
});

// ─────────────────────── Invites ────────────────────────────

router.post("/auth/invites", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const rawEmail = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Please provide a valid email address." });
    return;
  }
  const makeAdmin = body.makeAdmin === true;

  // Reject if a user with that email already exists — invites are a sign-up
  // path, not a re-invite or role-change flow.
  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existingUser) {
    res
      .status(409)
      .json({ error: "A user with that email already exists. Update their role from the Team page instead." });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const [created] = await db
    .insert(invitesTable)
    .values({
      tokenHash,
      email,
      invitedByUserId: admin.id,
      makeAdmin,
      expiresAt,
    })
    .returning();

  const inviteUrl = `${getOrigin(req)}/auth?invite=${encodeURIComponent(rawToken)}`;
  await sendInviteEmail({
    to: email,
    inviteUrl,
    invitedByName: fullName(admin),
    makeAdmin,
  });

  res.json({
    invite: {
      id: created.id,
      email: created.email,
      makeAdmin: created.makeAdmin,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    },
    inviteUrl,
  });
});

router.get("/auth/invites", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await db
    .select({
      id: invitesTable.id,
      email: invitesTable.email,
      makeAdmin: invitesTable.makeAdmin,
      expiresAt: invitesTable.expiresAt,
      acceptedAt: invitesTable.acceptedAt,
      revokedAt: invitesTable.revokedAt,
      createdAt: invitesTable.createdAt,
      invitedByUserId: invitesTable.invitedByUserId,
    })
    .from(invitesTable)
    .orderBy(desc(invitesTable.createdAt));

  res.json({ invites: rows });
});

router.delete("/auth/invites/:id", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = String(req.params.id);
  const [updated] = await db
    .update(invitesTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(invitesTable.id, id), isNull(invitesTable.acceptedAt), isNull(invitesTable.revokedAt)))
    .returning({ id: invitesTable.id });

  if (!updated) {
    res.status(404).json({ error: "Invite not found, already accepted, or already revoked." });
    return;
  }
  res.json({ ok: true });
});

/**
 * Public endpoint used by the /auth signup form when the URL carries an
 * ?invite= token. Returns the email + makeAdmin so the form can pre-fill
 * and the user can confirm they're joining the right workspace.
 */
router.get("/auth/invites/lookup", async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).json({ error: "Missing token." });
    return;
  }
  const tokenHash = hashToken(token);
  const [invite] = await db
    .select({
      id: invitesTable.id,
      email: invitesTable.email,
      makeAdmin: invitesTable.makeAdmin,
      expiresAt: invitesTable.expiresAt,
      acceptedAt: invitesTable.acceptedAt,
      revokedAt: invitesTable.revokedAt,
    })
    .from(invitesTable)
    .where(eq(invitesTable.tokenHash, tokenHash))
    .limit(1);

  if (!invite) {
    res.status(404).json({ error: "This invite link is invalid." });
    return;
  }
  if (invite.revokedAt) {
    res.status(410).json({ error: "This invite has been revoked." });
    return;
  }
  if (invite.acceptedAt) {
    res.status(410).json({ error: "This invite has already been used." });
    return;
  }
  if (invite.expiresAt < new Date()) {
    res.status(410).json({ error: "This invite has expired." });
    return;
  }

  res.json({
    invite: {
      email: invite.email,
      makeAdmin: invite.makeAdmin,
      expiresAt: invite.expiresAt,
    },
  });
});

// ─────────────────────── Admin user mgmt ─────────────────────

router.get("/auth/admin/users", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      isAdmin: usersTable.isAdmin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  res.json({ users: rows });
});

router.patch("/auth/admin/users/:id", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = String(req.params.id);
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.isAdmin !== "boolean") {
    res.status(400).json({ error: "Body must include isAdmin (boolean)." });
    return;
  }

  // Guard against demoting the last admin and locking everyone out. Fires
  // for both self-demotion and one-admin-demoting-another-admin.
  if (!body.isAdmin) {
    const adminIds = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.isAdmin, true));
    const targetIsCurrentAdmin = adminIds.some((row) => row.id === id);
    if (targetIsCurrentAdmin && adminIds.length <= 1) {
      res
        .status(400)
        .json({ error: "Can't remove the last admin. Promote someone else first." });
      return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin: body.isAdmin, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      isAdmin: usersTable.isAdmin,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json({ user: updated });
});

export default router;
