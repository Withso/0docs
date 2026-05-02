import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
};

// Get profile
router.get("/profiles/me", requireAuth, async (req: any, res) => {
  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId));
    res.json(profile || null);
  } catch (err) {
    req.log.error({ err }, "Failed to get profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Patch profile
router.patch("/profiles/me", requireAuth, async (req: any, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId));
    let profile;
    const updates: any = { updatedAt: new Date() };
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (existing) {
      [profile] = await db.update(profilesTable).set(updates).where(eq(profilesTable.id, req.userId)).returning();
    } else {
      [profile] = await db.insert(profilesTable).values({ id: req.userId, displayName, bio, avatarUrl }).returning();
    }
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Failed to patch profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete account (profile + all projects)
router.delete("/profiles/me", requireAuth, async (req: any, res) => {
  try {
    const { projectsTable: pt } = await import("@workspace/db");
    await db.delete(pt).where(eq(pt.userId, req.userId));
    await db.delete(profilesTable).where(eq(profilesTable.id, req.userId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upsert profile
router.put("/profiles/me", requireAuth, async (req: any, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId));
    let profile;
    if (existing) {
      [profile] = await db.update(profilesTable).set({ displayName, bio, avatarUrl, updatedAt: new Date() }).where(eq(profilesTable.id, req.userId)).returning();
    } else {
      [profile] = await db.insert(profilesTable).values({ id: req.userId, displayName, bio, avatarUrl }).returning();
    }
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Failed to upsert profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get profile by ids (for publisher names)
router.post("/profiles/batch", requireAuth, async (req: any, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids || ids.length === 0) return res.json([]);
    const profiles = await db.select().from(profilesTable);
    res.json(profiles.filter(p => ids.includes(p.id)));
  } catch (err) {
    req.log.error({ err }, "Failed to batch get profiles");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
