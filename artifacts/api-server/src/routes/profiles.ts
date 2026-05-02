import { Router, Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, projectsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

type AuthedReq = Request & { userId: string };

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as AuthedReq).userId = userId;
  next();
}

// Get profile
router.get("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedReq).userId;
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
    res.json(profile || null);
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to get profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Patch profile
router.patch("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedReq).userId;
    const { displayName, bio, avatarUrl } = req.body as {
      displayName?: string; bio?: string; avatarUrl?: string;
    };
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
    const updates: { displayName?: string; bio?: string; avatarUrl?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    let profile;
    if (existing) {
      [profile] = await db.update(profilesTable).set(updates).where(eq(profilesTable.id, userId)).returning();
    } else {
      [profile] = await db.insert(profilesTable).values({ id: userId, displayName, bio, avatarUrl }).returning();
    }
    res.json(profile);
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to patch profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete account (profile + all projects)
router.delete("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedReq).userId;
    await db.delete(projectsTable).where(eq(projectsTable.userId, userId));
    await db.delete(profilesTable).where(eq(profilesTable.id, userId));
    res.status(204).send();
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to delete profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upsert profile
router.put("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedReq).userId;
    const { displayName, bio, avatarUrl } = req.body as {
      displayName?: string; bio?: string; avatarUrl?: string;
    };
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
    let profile;
    if (existing) {
      [profile] = await db.update(profilesTable)
        .set({ displayName, bio, avatarUrl, updatedAt: new Date() })
        .where(eq(profilesTable.id, userId)).returning();
    } else {
      [profile] = await db.insert(profilesTable).values({ id: userId, displayName, bio, avatarUrl }).returning();
    }
    res.json(profile);
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to upsert profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get profiles by ids (for publisher names)
router.post("/profiles/batch", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids || ids.length === 0) { res.json([]); return; }
    const profiles = await db.select().from(profilesTable).where(inArray(profilesTable.id, ids));
    res.json(profiles);
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to batch get profiles");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
