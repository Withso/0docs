import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, projectDesignSettingsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
};

// Get design settings
router.get("/projects/:projectId/design", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const [settings] = await db.select().from(projectDesignSettingsTable).where(eq(projectDesignSettingsTable.projectId, req.params.projectId));
    res.json(settings || null);
  } catch (err) {
    req.log.error({ err }, "Failed to get design settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upsert design settings
router.put("/projects/:projectId/design", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const { settings } = req.body;
    const [existing] = await db.select().from(projectDesignSettingsTable).where(eq(projectDesignSettingsTable.projectId, req.params.projectId));
    let result;
    if (existing) {
      [result] = await db.update(projectDesignSettingsTable).set({ settings, updatedAt: new Date() }).where(eq(projectDesignSettingsTable.projectId, req.params.projectId)).returning();
    } else {
      [result] = await db.insert(projectDesignSettingsTable).values({ projectId: req.params.projectId, settings }).returning();
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to upsert design settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
