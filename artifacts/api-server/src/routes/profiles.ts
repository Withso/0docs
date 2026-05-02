import { Router, Request, Response, NextFunction } from "express";
import { db, profilesTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, inArray } from "drizzle-orm";

const router = Router();



// Get profile
router.get("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
    res.json(profile || null);
  } catch (err) {
    req.log.error({ err }, "Failed to get profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Patch profile
router.patch("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
    req.log.error({ err }, "Failed to patch profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete account (profile + all projects)
router.delete("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.delete(projectsTable).where(eq(projectsTable.userId, userId));
    await db.delete(profilesTable).where(eq(profilesTable.id, userId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upsert profile
router.put("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
    req.log.error({ err }, "Failed to upsert profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get profiles by ids (for publisher names). Validates each id is a UUID and
// caps batch size to prevent unbounded enumeration.
const PROFILES_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH_IDS = 200;
router.post("/profiles/batch", requireAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body as { ids?: unknown };
    if (!Array.isArray(body.ids)) { res.status(400).json({ error: "ids must be an array" }); return; }
    if (body.ids.length === 0) { res.json([]); return; }
    if (body.ids.length > MAX_BATCH_IDS) {
      res.status(400).json({ error: `too many ids (max ${MAX_BATCH_IDS})` }); return;
    }
    const validIds = body.ids.filter((x): x is string => typeof x === "string" && PROFILES_UUID_RE.test(x));
    if (validIds.length === 0) { res.json([]); return; }
    const profiles = await db.select().from(profilesTable).where(inArray(profilesTable.id, validIds));
    res.json(profiles);
  } catch (err) {
    req.log.error({ err }, "Failed to batch get profiles");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
