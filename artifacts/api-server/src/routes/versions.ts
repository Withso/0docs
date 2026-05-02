import { Router, Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, publishedVersionsTable, docVersionsTable, projectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

type AuthedRequest = Request & { userId: string };

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as unknown as AuthedRequest).userId = userId;
  next();
}

async function requireProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const rows = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

async function requireDocVersionOwnership(docVersionId: string, userId: string): Promise<boolean> {
  const [version] = await db.select({ projectId: docVersionsTable.projectId }).from(docVersionsTable)
    .where(eq(docVersionsTable.id, docVersionId));
  if (!version) return false;
  return requireProjectOwnership(version.projectId, userId);
}

// GET /versions?projectId=...&limit=N (public — read-only activity data for viewer)
router.get("/versions", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    const limit = req.query["limit"] as string | undefined;
    if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
    if (!isUuid(projectId)) { res.json([]); return; }
    const limitN = Math.min(parseInt(limit || "10", 10), 100);
    const versions = await db.select().from(publishedVersionsTable)
      .where(eq(publishedVersionsTable.projectId, projectId))
      .orderBy(desc(publishedVersionsTable.publishedAt))
      .limit(limitN);
    res.json(versions);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// GET /versions/:id (public — used by Index.tsx for homepage)
router.get("/versions/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) { res.status(404).json({ error: "Not found" }); return; }
    const [version] = await db.select().from(publishedVersionsTable).where(eq(publishedVersionsTable.id, id));
    if (!version) { res.status(404).json({ error: "Not found" }); return; }
    res.json(version);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// GET /projects/:projectId/published-versions (auth + ownership)
router.get("/projects/:projectId/published-versions", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId } = req.params;
      if (!(await requireProjectOwnership(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const versions = await db.select().from(publishedVersionsTable)
        .where(eq(publishedVersionsTable.projectId, projectId))
        .orderBy(desc(publishedVersionsTable.publishedAt));
      res.json(versions);
    } catch (err) {
      req.log.error({ err }, "Failed to list published versions");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /projects/:projectId/published-versions (auth + ownership)
router.post("/projects/:projectId/published-versions", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId } = req.params;
      const [project] = await db.select().from(projectsTable)
        .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
      if (!project) { res.status(404).json({ error: "Not found" }); return; }

      await db.update(publishedVersionsTable).set({ isActive: false })
        .where(eq(publishedVersionsTable.projectId, projectId));

      const { versionNumber, pagesSnapshot, sectionsSnapshot, blocksSnapshot, designSnapshot,
        navGroupsSnapshot, editorChanges, designChanges, notes } = req.body;
      const [version] = await db.insert(publishedVersionsTable).values({
        projectId,
        versionNumber,
        isActive: true,
        publishedBy: userId,
        pagesSnapshot: pagesSnapshot ?? [],
        sectionsSnapshot: sectionsSnapshot ?? [],
        blocksSnapshot: blocksSnapshot ?? [],
        designSnapshot: designSnapshot ?? {},
        navGroupsSnapshot: navGroupsSnapshot ?? [],
        editorChanges: editorChanges ?? [],
        designChanges: designChanges ?? [],
        notes: notes ?? null,
      }).returning();

      await db.update(projectsTable)
        .set({ publishedVersionId: version.id, updatedAt: new Date() })
        .where(eq(projectsTable.id, projectId));

      res.status(201).json(version);
    } catch (err) {
      req.log.error({ err }, "Failed to publish version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /projects/:projectId/published-versions/:versionId/revert (auth + ownership)
router.post("/projects/:projectId/published-versions/:versionId/revert", requireAuth,
  async (req: Request<{ projectId: string; versionId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId, versionId } = req.params;
      if (!(await requireProjectOwnership(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      // Verify the target version belongs to this project before reverting
      const [targetVersion] = await db
        .select({ id: publishedVersionsTable.id })
        .from(publishedVersionsTable)
        .where(and(eq(publishedVersionsTable.id, versionId), eq(publishedVersionsTable.projectId, projectId)));
      if (!targetVersion) { res.status(404).json({ error: "Not found" }); return; }

      await db.update(publishedVersionsTable).set({ isActive: false })
        .where(eq(publishedVersionsTable.projectId, projectId));
      await db.update(publishedVersionsTable).set({ isActive: true })
        .where(and(eq(publishedVersionsTable.id, versionId), eq(publishedVersionsTable.projectId, projectId)));
      await db.update(projectsTable)
        .set({ publishedVersionId: versionId, updatedAt: new Date() })
        .where(eq(projectsTable.id, projectId));
      res.json({ ok: true });
    } catch (err) {
      req.log.error({ err }, "Failed to revert version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// GET /projects/:projectId/doc-versions (auth + ownership)
router.get("/projects/:projectId/doc-versions", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId } = req.params;
      if (!(await requireProjectOwnership(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const versions = await db.select().from(docVersionsTable)
        .where(eq(docVersionsTable.projectId, projectId))
        .orderBy(desc(docVersionsTable.createdAt));
      res.json(versions);
    } catch (err) {
      req.log.error({ err }, "Failed to list doc versions");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /projects/:projectId/doc-versions (auth + ownership)
router.post("/projects/:projectId/doc-versions", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId } = req.params;
      if (!(await requireProjectOwnership(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const { versionLabel, isDefault } = req.body as { versionLabel: string; isDefault?: boolean };
      const [version] = await db.insert(docVersionsTable).values({
        projectId, versionLabel, isDefault: isDefault ?? false,
      }).returning();
      res.status(201).json(version);
    } catch (err) {
      req.log.error({ err }, "Failed to create doc version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /doc-versions/:id/set-default (auth + ownership)
router.post("/doc-versions/:id/set-default", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { id } = req.params;
      if (!(await requireDocVersionOwnership(id, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const [version] = await db.select().from(docVersionsTable).where(eq(docVersionsTable.id, id));
      if (!version) { res.status(404).json({ error: "Not found" }); return; }
      await db.update(docVersionsTable).set({ isDefault: false })
        .where(eq(docVersionsTable.projectId, version.projectId));
      await db.update(docVersionsTable).set({ isDefault: true }).where(eq(docVersionsTable.id, id));
      res.json({ ok: true });
    } catch (err) {
      req.log.error({ err }, "Failed to set default doc version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// DELETE /doc-versions/:id (auth + ownership)
router.delete("/doc-versions/:id", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { id } = req.params;
      if (!(await requireDocVersionOwnership(id, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      await db.delete(docVersionsTable).where(eq(docVersionsTable.id, id));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete doc version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
