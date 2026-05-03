import { Router, Request, Response } from "express";
import { db, commitsTable, branchesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { and, eq, desc } from "drizzle-orm";
import { userOwnsProject } from "../lib/branches";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

// List commits on a branch (newest first). Excludes the heavy contentSnapshot
// to keep the list payload small — clients fetch a single commit when they
// want to render full diff/preview.
router.get("/projects/:projectId/branches/:branchId/commits", requireAuth,
  async (req: Request<{ projectId: string; branchId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId, branchId } = req.params;
      if (!isUuid(projectId) || !isUuid(branchId)) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await userOwnsProject(projectId, userId))) { res.status(404).json({ error: "Not found" }); return; }

      // Verify branch belongs to project.
      const [b] = await db.select({ id: branchesTable.id }).from(branchesTable)
        .where(and(eq(branchesTable.id, branchId), eq(branchesTable.projectId, projectId)));
      if (!b) { res.status(404).json({ error: "Not found" }); return; }

      const rows = await db.select({
        id: commitsTable.id,
        parentCommitId: commitsTable.parentCommitId,
        authorUserId: commitsTable.authorUserId,
        message: commitsTable.message,
        filesChanged: commitsTable.filesChanged,
        source: commitsTable.source,
        createdAt: commitsTable.createdAt,
      }).from(commitsTable)
        .where(eq(commitsTable.branchId, branchId))
        .orderBy(desc(commitsTable.createdAt))
        .limit(200);
      res.json(rows);
    } catch (err) {
      req.log.error({ err }, "Failed to list commits");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Get a single commit (full snapshot included).
router.get("/commits/:id", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      if (!isUuid(id)) { res.status(404).json({ error: "Not found" }); return; }
      const [c] = await db.select().from(commitsTable).where(eq(commitsTable.id, id));
      if (!c) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await userOwnsProject(c.projectId, userId))) { res.status(404).json({ error: "Not found" }); return; }
      res.json(c);
    } catch (err) {
      req.log.error({ err }, "Failed to get commit");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
