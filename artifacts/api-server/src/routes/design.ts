import { Router, Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, projectDesignSettingsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

type AuthedReq = Request & { userId: string };

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as unknown as AuthedReq).userId = userId;
  next();
}

// Get design settings
router.get("/projects/:projectId/design", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedReq).userId;
      const { projectId } = req.params;
      const [project] = await db.select().from(projectsTable)
        .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
      if (!project) { res.status(404).json({ error: "Not found" }); return; }
      const [settings] = await db.select().from(projectDesignSettingsTable)
        .where(eq(projectDesignSettingsTable.projectId, projectId));
      res.json(settings || null);
    } catch (err) {
      req.log?.error({ err }, "Failed to get design settings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Upsert design settings
router.put("/projects/:projectId/design", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedReq).userId;
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
      req.log?.error({ err }, "Failed to upsert design settings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
