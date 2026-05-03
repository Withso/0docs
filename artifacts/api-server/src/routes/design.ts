import { Router, Request, Response, NextFunction } from "express";
import { db, projectDesignSettingsTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";
import { resolveBranchId, getDefaultBranchId } from "../lib/branches";
import { fireAutoCommit } from "../lib/auto-commit";

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
      const userId = req.user?.id;
      const isOwner = userId != null && project.userId === userId;
      if (!isPublished) {
        if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
        if (!isOwner) { res.status(403).json({ error: "Forbidden" }); return; }
      }

      // Public reads on a published project must always return the default
      // branch's theme — only owners may select another branch.
      const branchId = isOwner
        ? await resolveBranchId(req, projectId)
        : await getDefaultBranchId(projectId);
      const [settings] = await db.select().from(projectDesignSettingsTable)
        .where(and(
          eq(projectDesignSettingsTable.projectId, projectId),
          eq(projectDesignSettingsTable.branchId, branchId),
        ));
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
      const branchId = await resolveBranchId(req, projectId);
      const [existing] = await db.select().from(projectDesignSettingsTable)
        .where(and(
          eq(projectDesignSettingsTable.projectId, projectId),
          eq(projectDesignSettingsTable.branchId, branchId),
        ));
      let result;
      if (existing) {
        [result] = await db.update(projectDesignSettingsTable)
          .set({ settings, updatedAt: new Date() })
          .where(eq(projectDesignSettingsTable.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(projectDesignSettingsTable)
          .values({ projectId, branchId, settings })
          .returning();
      }
      fireAutoCommit(req, { projectId, branchId, message: "Update theme" });
      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Failed to upsert design settings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
