import { Router, Request, Response, NextFunction } from "express";
import { db, projectDesignSettingsTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);



// Get design settings — public for published projects, owner-only otherwise
router.get("/projects/:projectId/design",
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const { projectId } = req.params;
      if (!isUuid(projectId)) { res.json(null); return; }
      const [project] = await db.select({
        userId: projectsTable.userId,
        publishedVersionId: projectsTable.publishedVersionId,
      }).from(projectsTable).where(eq(projectsTable.id, projectId));
      if (!project) { res.status(404).json({ error: "Not found" }); return; }

      const isPublished = project.publishedVersionId != null;
      if (!isPublished) {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
        if (project.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
      }

      const [settings] = await db.select().from(projectDesignSettingsTable)
        .where(eq(projectDesignSettingsTable.projectId, projectId));
      res.json(settings || null);
    } catch (err) {
      req.log.error({ err }, "Failed to get design settings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Upsert design settings
router.put("/projects/:projectId/design", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      const [project] = await db.select().from(projectsTable)
        .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
      if (!project) { res.status(404).json({ error: "Not found" }); return; }
      const { settings } = req.body as { settings: object };
      const [existing] = await db.select().from(projectDesignSettingsTable)
        .where(eq(projectDesignSettingsTable.projectId, projectId));
      let result;
      if (existing) {
        [result] = await db.update(projectDesignSettingsTable)
          .set({ settings, updatedAt: new Date() })
          .where(eq(projectDesignSettingsTable.projectId, projectId))
          .returning();
      } else {
        [result] = await db.insert(projectDesignSettingsTable)
          .values({ projectId, settings })
          .returning();
      }
      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Failed to upsert design settings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
